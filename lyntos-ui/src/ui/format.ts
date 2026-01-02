export const fmt = {
  num(n?: number) {
    const v = Number.isFinite(n as number) ? Number(n) : 0;
    return new Intl.NumberFormat("tr-TR").format(v);
  },
  try(n?: number) {
    const v = Number.isFinite(n as number) ? Number(n) : 0;
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 2,
    }).format(v);
  },
  pct0(n?: number) {
    const v = Number.isFinite(n as number) ? Number(n) : 0;
    return new Intl.NumberFormat("tr-TR", {
      style: "percent",
      maximumFractionDigits: 0,
    }).format(v / 100);
  },
  pct1(n?: number) {
    const v = Number.isFinite(n as number) ? Number(n) : 0;
    return new Intl.NumberFormat("tr-TR", {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(v / 100);
  },
};
