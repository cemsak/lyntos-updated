export const WEIGHTS = {
  SMIYB: 0.3,
  NAKIT_BANKA: 0.2,
  BEYAN_UYUM: 0.2,
  KARSITARAF: 0.15,
  MIZAN: 0.1,
  TREND: 0.05,
} as const;

export function riskColor(score: number) {
  if (score >= 70) return "text-rose-600 bg-rose-50 border-rose-200";
  if (score >= 50) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-emerald-700 bg-emerald-50 border-emerald-200";
}
export function riskDot(score: number) {
  if (score >= 70) return "bg-rose-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-emerald-500";
}
