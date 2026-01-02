export type Found<T = any> = { value: T; path: string } | null;

export function findAny(root: any, keys: string[]): any {
  const f = findAnyWithPath(root, keys);
  return f ? f.value : undefined;
}

export function findAnyWithPath(root: any, keys: string[]): Found {
  const want = new Set(keys.map((k) => k.toLowerCase()));
  const seen = new Set<any>();
  const stack: Array<[any, string]> = [[root, "$"]];

  while (stack.length) {
    const [node, path] = stack.pop()!;
    if (!node || typeof node !== "object") continue;
    if (seen.has(node)) continue;
    seen.add(node);

    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i--) {
        stack.push([node[i], `${path}[${i}]`]);
      }
      continue;
    }

    for (const [k, v] of Object.entries(node)) {
      const p = `${path}.${k}`;
      if (want.has(String(k).toLowerCase())) return { value: v as any, path: p };
      if (v && typeof v === "object") stack.push([v, p]);
    }
  }
  return null;
}
