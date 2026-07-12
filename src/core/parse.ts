import * as recast from 'recast';
import type { File } from '@babel/types';

/**
 * Parsing/printing built on **recast + @babel/parser**.
 *
 * recast preserves the original source formatting and only reprints the AST
 * nodes we actually replace, so transformed files keep their existing style
 * (quotes, spacing, trailing commas) instead of being wholesale reformatted.
 * The babel-ts parser handles JS, TS and JSX uniformly — one code path for
 * every supported file type.
 */

// recast ships a ready-made babel parser preset that enables jsx + typescript.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const babelParser = require('recast/parsers/babel-ts');

/** Parse source into a recast-augmented babel AST. */
export function parse(code: string): File {
  return recast.parse(code, { parser: babelParser }) as unknown as File;
}

/** Print an AST back to source, reprinting only changed nodes. */
export function print(ast: File): string {
  return recast.print(ast).code;
}

/**
 * Parse a small code snippet and return its top-level statements.
 *
 * Nodes produced this way carry recast's original-source metadata, so when they
 * are inserted into another AST recast prints them verbatim (single-line)
 * instead of pretty-printing a synthetic node across several lines. Used for
 * the fixed hook/import statements that appear in every transformed file.
 */
export function parseStatements(code: string): File['program']['body'] {
  return parse(code).program.body;
}
