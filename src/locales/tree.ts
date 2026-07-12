/** A nested locale message tree: leaves are strings, branches are subtrees. */
export type MessageTree = { [key: string]: string | MessageTree };

export function isTree(value: unknown): value is MessageTree {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Set `value` at the nested path, creating intermediate objects as needed. */
export function setNested(
  tree: MessageTree,
  segments: string[],
  value: string,
  overwrite: boolean
): void {
  let node = tree;
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    if (!isTree(node[segment])) {
      // Never clobber an existing string with a subtree; namespace under it.
      node[segment] = {};
    }
    node = node[segment] as MessageTree;
  }
  const leaf = segments[segments.length - 1];
  if (overwrite || !(leaf in node)) {
    node[leaf] = value;
  }
}

export function getNested(
  tree: MessageTree,
  segments: string[]
): string | MessageTree | undefined {
  let node: string | MessageTree | undefined = tree;
  for (const segment of segments) {
    if (!isTree(node)) return undefined;
    node = node[segment];
  }
  return node;
}

/** Flatten a tree to `[dottedKey, value]` pairs. */
export function flatten(
  tree: unknown,
  separator: string,
  prefix = ''
): [string, string][] {
  if (!isTree(tree)) return [];
  const out: [string, string][] = [];
  for (const [key, value] of Object.entries(tree)) {
    const full = prefix ? `${prefix}${separator}${key}` : key;
    if (typeof value === 'string') out.push([full, value]);
    else out.push(...flatten(value, separator, full));
  }
  return out;
}

/** Recursively sort object keys alphabetically. */
export function sortTree(tree: MessageTree): MessageTree {
  const sorted: MessageTree = {};
  for (const key of Object.keys(tree).sort()) {
    const value = tree[key];
    sorted[key] = isTree(value) ? sortTree(value) : value;
  }
  return sorted;
}
