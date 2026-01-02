export function fmtNumber(x: any): string {
  if (x === null || x === undefined) return "-";
  const n = Number(x);
  if (!Number.isFinite(n)) return String(x);
  return n.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}

export function fmtPercent(x: any): string {
  if (x === null || x === undefined) return "-";
  const n = Number(x);
  if (!Number.isFinite(n)) return String(x);
  return (n).toLocaleString("tr-TR", { maximumFractionDigits: 2 }) + "%";
}
