export const SERIES_PALETTE = [
  "#0B6A88", "#636B2F", "#F59E0B", "#EF4444", "#10B981",
  "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316",
];

export function seriesColor(key?: string, i = 0) {
  if (!key) return SERIES_PALETTE[i % SERIES_PALETTE.length];
  // sabit hash -> stabil renk
  let h = 0;
  for (let c = 0; c < key.length; c++) h = (h * 31 + key.charCodeAt(c)) >>> 0;
  return SERIES_PALETTE[h % SERIES_PALETTE.length];
}

export function kpiTone(status: "good" | "warn" | "bad" | "neutral" = "neutral") {
  switch (status) {
    case "good":
      return "text-emerald-600 dark:text-emerald-400";
    case "warn":
      return "text-amber-600 dark:text-amber-400";
    case "bad":
      return "text-rose-600 dark:text-rose-400";
    default:
      return "text-foreground";
  }
}
