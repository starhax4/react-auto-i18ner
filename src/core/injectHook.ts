import * as t from '@babel/types';
import { I18nAdapter } from '../adapters/I18nAdapter';
import { ComponentTarget } from './transformJsx';

/**
 * Ensure each transformed component can access the translation function.
 *
 * For block-bodied functions the hook statement is prepended. For
 * expression-bodied arrows (`const C = () => <div/>`) the body is first
 * converted to a block with an explicit `return`, then the hook is prepended —
 * this is the fix for the previous engine, which wrapped such components' text
 * without ever binding `t`, producing `t is not defined` at runtime.
 */
export function injectHooks(
  targets: ComponentTarget[],
  adapter: I18nAdapter
): number {
  let injected = 0;
  for (const target of targets) {
    if (target.kind !== 'function') continue;
    if (injectFunctionHook(target.node as t.Function, adapter)) {
      injected++;
    }
  }
  return injected;
}

function injectFunctionHook(fn: t.Function, adapter: I18nAdapter): boolean {
  const body = fn.body;

  if (t.isBlockStatement(body)) {
    if (hasHook(body.body, adapter.hookName)) return false;
    body.body.unshift(adapter.buildHookStatement());
    return true;
  }

  // Expression-bodied arrow: `() => <jsx/>` → `() => { const {t}=…; return <jsx/>; }`
  if (t.isExpression(body)) {
    fn.body = t.blockStatement([
      adapter.buildHookStatement(),
      t.returnStatement(body),
    ]);
    return true;
  }

  return false;
}

/** True if a statement already binds the accessor via the library hook. */
function hasHook(statements: t.Statement[], hookName: string): boolean {
  return statements.some((stmt) => {
    if (!t.isVariableDeclaration(stmt)) return false;
    return stmt.declarations.some(
      (decl) => t.isCallExpression(decl.init) && isHookCallee(decl.init.callee, hookName)
    );
  });
}

/** Matches both `useTranslation()` and a namespaced `i18n.useTranslation()`. */
function isHookCallee(callee: t.Expression | t.V8IntrinsicIdentifier, hookName: string): boolean {
  if (t.isIdentifier(callee)) return callee.name === hookName;
  if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
    return callee.property.name === hookName;
  }
  return false;
}
