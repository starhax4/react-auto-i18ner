import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import type { File } from '@babel/types';
import { I18nAdapter } from '../adapters/I18nAdapter';
import { Config } from '../config/schema';
import { KeyRegistry } from '../keys/KeyRegistry';
import { TextValidator } from '../validation/TextValidator';
import { Extraction } from './types';

/** A React component that received a translation call and needs the accessor. */
export interface ComponentTarget {
  /** The component's function or class node (mutated by hook injection). */
  node: t.Function | t.Class;
  name: string;
  kind: 'function' | 'class';
}

export interface TransformContext {
  filePath: string;
  adapter: I18nAdapter;
  validator: TextValidator;
  keys: KeyRegistry;
  config: Config;
}

export interface TransformOutcome {
  extractions: Extraction[];
  /** Deduped components that need a hook injected. */
  componentTargets: ComponentTarget[];
  warnings: string[];
  changed: boolean;
}

/**
 * Walk the AST and rewrite user-facing JSX text and attributes into translation
 * calls. Operates on real AST nodes (never source strings), so it only ever
 * touches genuine JSX — comparison operators, string literals and comments are
 * structurally invisible here. Re-running is a no-op: nodes already wrapped in a
 * `t(...)` call contain no `JSXText`, so nothing matches a second time.
 */
export function transformJsx(
  ast: File,
  ctx: TransformContext
): TransformOutcome {
  const extractions: Extraction[] = [];
  const targetsByNode = new Map<t.Node, ComponentTarget>();
  const warnings = new Set<string>();
  let changed = false;

  const recordTarget = (path: NodePath): ComponentTarget | null => {
    const component = findEnclosingComponent(path);
    if (!component) {
      warnings.add(
        `Skipped JSX not inside a component in ${ctx.filePath}; cannot place the translation hook.`
      );
      return null;
    }
    if (component.kind === 'class') {
      warnings.add(
        `Skipped class component "${component.name}" in ${ctx.filePath}; class components are not yet supported.`
      );
      return null;
    }
    if (!targetsByNode.has(component.node)) {
      targetsByNode.set(component.node, component);
    }
    return component;
  };

  const registerExtraction = (
    text: string,
    kind: Extraction['kind'],
    componentName: string
  ): string => {
    const key = ctx.keys.keyFor({
      text,
      componentName,
      filePath: ctx.filePath,
    });
    extractions.push({ key, text, kind, componentName, filePath: ctx.filePath });
    return key;
  };

  traverse(ast, {
    JSXElement(path) {
      changed = processElementChildren(path, ctx, recordTarget, registerExtraction) || changed;
    },
    JSXFragment(path) {
      changed = processElementChildren(path, ctx, recordTarget, registerExtraction) || changed;
    },
    JSXAttribute(path) {
      changed = processAttribute(path, ctx, recordTarget, registerExtraction) || changed;
    },
  });

  return {
    extractions,
    componentTargets: [...targetsByNode.values()],
    warnings: [...warnings],
    changed,
  };
}

/**
 * Process the direct children of a JSX element/fragment.
 *
 * Preferred path: if the children are text possibly interspersed with simple
 * `{expr}` interpolations, merge them into a single `t('Hi {{name}}', { name })`
 * call. Otherwise fall back to wrapping each standalone text run on its own,
 * leaving nested elements and complex expressions untouched.
 */
function processElementChildren(
  path: NodePath<t.JSXElement | t.JSXFragment>,
  ctx: TransformContext,
  recordTarget: (p: NodePath) => ComponentTarget | null,
  registerExtraction: (text: string, kind: Extraction['kind'], component: string) => string
): boolean {
  const children = path.node.children;
  if (!children.some((c) => t.isJSXText(c) && /\S/.test(c.value))) {
    return false; // no translatable text among the children
  }

  const merged = tryMergeChildren(children, ctx.validator);
  if (merged) {
    const target = recordTarget(path);
    if (!target) return false;
    const key = registerExtraction(merged.message, 'jsx-text', target.name);
    const call = ctx.adapter.buildCallExpression({ key, vars: merged.vars });
    path.node.children = [t.jsxExpressionContainer(call)];
    // Children are fully replaced by a single t(...) call — no JSX left to
    // visit. Skip descent so traverse never revisits the synthesized subtree.
    path.skip();
    return true;
  }

  // Fallback: wrap each standalone text run individually.
  let changed = false;
  const next: t.JSXElement['children'] = [];
  for (const child of children) {
    if (!t.isJSXText(child) || !/\S/.test(child.value)) {
      next.push(child);
      continue;
    }
    const { leading, core, trailing } = splitWhitespace(child.value);
    const text = normalizeWhitespace(core);
    if (!ctx.validator.isTranslatable(text)) {
      next.push(child);
      continue;
    }
    const target = recordTarget(path);
    if (!target) {
      next.push(child);
      continue;
    }
    const key = registerExtraction(text, 'jsx-text', target.name);
    const call = ctx.adapter.buildCallExpression({ key, vars: {} });
    if (leading) next.push(t.jsxText(leading));
    next.push(t.jsxExpressionContainer(call));
    if (trailing) next.push(t.jsxText(trailing));
    changed = true;
  }
  if (changed) path.node.children = next;
  return changed;
}

/** Rewrite a translatable string-literal attribute into a `t(...)` expression. */
function processAttribute(
  path: NodePath<t.JSXAttribute>,
  ctx: TransformContext,
  recordTarget: (p: NodePath) => ComponentTarget | null,
  registerExtraction: (text: string, kind: Extraction['kind'], component: string) => string
): boolean {
  if (!ctx.config.extract.attributes) return false;

  const name = attributeName(path.node);
  if (!name || !ctx.config.extract.attributeNames.includes(name)) return false;

  const value = path.node.value;
  if (!t.isStringLiteral(value)) return false; // already an expression or absent

  const text = normalizeWhitespace(value.value);
  if (!ctx.validator.isTranslatable(text)) return false;

  const target = recordTarget(path);
  if (!target) return false;

  const key = registerExtraction(text, 'attribute', target.name);
  const call = ctx.adapter.buildCallExpression({ key, vars: {} });
  path.node.value = t.jsxExpressionContainer(call);
  return true;
}

interface MergedChildren {
  message: string;
  vars: Record<string, t.Expression>;
}

/**
 * Attempt to fold children into a single interpolated message. Returns null if
 * the children contain nested elements or non-trivial expressions, which are
 * handled by the per-run fallback instead.
 */
function tryMergeChildren(
  children: t.JSXElement['children'],
  validator: TextValidator
): MergedChildren | null {
  let message = '';
  let hasText = false;
  const vars: Record<string, t.Expression> = {};

  for (const child of children) {
    if (t.isJSXText(child)) {
      message += child.value;
      if (/\S/.test(child.value)) hasText = true;
    } else if (t.isJSXExpressionContainer(child)) {
      const expr = child.expression;
      if (t.isJSXEmptyExpression(expr)) continue; // `{/* comment */}`
      if (!isSimpleExpression(expr)) return null;
      const name = uniqueVarName(varNameFromExpression(expr), vars);
      vars[name] = expr;
      message += `{{${name}}}`;
    } else {
      return null; // nested element/fragment → not mergeable
    }
  }

  if (!hasText) return null;
  const normalized = normalizeWhitespace(message);
  if (!validator.isTranslatable(stripPlaceholders(normalized))) return null;
  return { message: normalized, vars };
}

// ---- component detection -------------------------------------------------

interface EnclosingComponent {
  node: t.Function | t.Class;
  name: string;
  kind: 'function' | 'class';
}

/**
 * Find the component that owns a JSX node. Walks ancestors and prefers the
 * outermost capitalized function (the component) over inner callbacks such as
 * `.map(item => <li/>)`. Falls back to the outermost function for anonymous
 * default-exported components.
 */
function findEnclosingComponent(path: NodePath): EnclosingComponent | null {
  let best: EnclosingComponent | null = null;
  let outermostFn: EnclosingComponent | null = null;

  let current: NodePath | null = path.parentPath;
  while (current) {
    const node = current.node;

    if (t.isClassDeclaration(node) || t.isClassExpression(node)) {
      if (isReactClassComponent(node)) {
        return {
          node,
          name: node.id?.name ?? 'Component',
          kind: 'class',
        };
      }
    }

    if (t.isFunction(node)) {
      const name = functionComponentName(current);
      outermostFn = { node, name: name ?? 'Component', kind: 'function' };
      if (name && /^[A-Z]/.test(name)) {
        best = outermostFn; // keep climbing; outermost capitalized wins
      }
    }

    current = current.parentPath;
  }

  return best ?? outermostFn;
}

function functionComponentName(path: NodePath): string | undefined {
  const node = path.node;
  if (t.isFunctionDeclaration(node) && node.id) return node.id.name;
  const parent = path.parentPath?.node;
  if (parent && t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
    return parent.id.name;
  }
  return undefined;
}

/**
 * Heuristic for a React class component: extends a base class (React.Component /
 * Component / PureComponent) and defines a `render` method. Requiring a
 * superclass avoids treating an unrelated class that merely has a `render()`
 * method as a component.
 */
function isReactClassComponent(node: t.Class): boolean {
  if (!node.superClass) return false;
  return node.body.body.some(
    (member) =>
      t.isClassMethod(member) &&
      t.isIdentifier(member.key) &&
      member.key.name === 'render'
  );
}

// ---- small helpers -------------------------------------------------------

function attributeName(node: t.JSXAttribute): string | null {
  if (t.isJSXIdentifier(node.name)) return node.name.name;
  if (t.isJSXNamespacedName(node.name)) {
    return `${node.name.namespace.name}:${node.name.name.name}`;
  }
  return null;
}

function isSimpleExpression(expr: t.Expression | t.JSXEmptyExpression): boolean {
  if (t.isIdentifier(expr)) return true;
  if (t.isMemberExpression(expr) && !expr.computed) return true;
  return false;
}

function varNameFromExpression(expr: t.Expression): string {
  if (t.isIdentifier(expr)) return expr.name;
  if (t.isMemberExpression(expr) && t.isIdentifier(expr.property)) {
    return expr.property.name;
  }
  return 'value';
}

function uniqueVarName(base: string, existing: Record<string, unknown>): string {
  if (!(base in existing)) return base;
  // Match KeyRegistry's collision convention: `base_2`, `base_3`, …
  let i = 2;
  while (`${base}_${i}` in existing) i++;
  return `${base}_${i}`;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function stripPlaceholders(text: string): string {
  return text.replace(/\{\{[^}]*\}\}/g, ' ').trim();
}

function splitWhitespace(value: string): {
  leading: string;
  core: string;
  trailing: string;
} {
  const leadingMatch = value.match(/^\s+/);
  const trailingMatch = value.match(/\s+$/);
  const leading = leadingMatch ? ' ' : '';
  const trailing = trailingMatch ? ' ' : '';
  const core = value.trim();
  return { leading, core, trailing };
}
