export type AnyObj = Record<string, any>;

/**
 * Breadth-first key search (arrays + objects). Returns the first value found for `key`.
 * maxDepth is a safety valve to avoid huge traversals.
 */
export function findValueByKey(root: any, key: string, maxDepth = 7): any {
  if (!root || typeof root !== "object") return undefined;

  const q: Array<{ v: any; d: number }> = [{ v: root, d: 0 }];
  const seen = new Set<any>();

  while (q.length) {
    const { v, d } = q.shift()!;
    if (!v || typeof v !== "object") continue;
    if (seen.has(v)) continue;
    seen.add(v);

    // direct hit
    if (!Array.isArray(v) && Object.prototype.hasOwnProperty.call(v, key)) return v[key];

    if (d >= maxDepth) continue;

    if (Array.isArray(v)) {
      for (const it of v) q.push({ v: it, d: d + 1 });
    } else {
      for (const k of Object.keys(v)) q.push({ v: v[k], d: d + 1 });
    }
  }
  return undefined;
}

export function coalesce<T>(...vals: Array<T | undefined | null>): T | undefined {
  for (const v of vals) if (v !== undefined && v !== null) return v;
  return undefined;
}

export function asArray<T = any>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

/** For missing_102_details: allow object map or array */
export function normalizeMissing102(v: any): Array<{ account?: string; amount?: number; raw?: any }> {
  if (Array.isArray(v)) return v.map((x: any) => ({ raw: x, account: x?.account ?? x?.code, amount: x?.amount ?? x?.value }));
  if (v && typeof v === "object") {
    const out: Array<{ account?: string; amount?: number; raw?: any }> = [];
    for (const k of Object.keys(v)) out.push({ account: k, amount: Number(v[k]), raw: v[k] });
    return out;
  }
  return [];
}
