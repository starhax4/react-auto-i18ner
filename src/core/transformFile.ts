import { parse, print } from './parse';
import { transformJsx, TransformContext } from './transformJsx';
import { injectHooks } from './injectHook';
import { ensureImport } from './imports';
import { Extraction } from './types';

export interface FileTransformResult {
  /** Resulting source (unchanged when `changed` is false). */
  code: string;
  changed: boolean;
  extractions: Extraction[];
  warnings: string[];
  hookInjected: boolean;
  importAdded: boolean;
}

/**
 * Transform a single file's source end-to-end: parse → rewrite JSX → inject the
 * translation hook and import → print. When nothing translatable is found the
 * original source is returned untouched (and `changed` is false).
 */
export function transformSource(
  code: string,
  ctx: TransformContext
): FileTransformResult {
  const ast = parse(code);
  const outcome = transformJsx(ast, ctx);

  let hookInjected = false;
  let importAdded = false;

  if (outcome.changed) {
    hookInjected = injectHooks(outcome.componentTargets, ctx.adapter) > 0;
    importAdded = ensureImport(ast, ctx.adapter);
  }

  return {
    code: outcome.changed ? print(ast) : code,
    changed: outcome.changed,
    extractions: outcome.extractions,
    warnings: outcome.warnings,
    hookInjected,
    importAdded,
  };
}
