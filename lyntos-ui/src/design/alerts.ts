export type AlertTone = "danger" | "warning" | "success" | "info";

export const ALERT = {
  danger: {
    hex: "#DC2626",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    chip: "bg-red-600",
  },
  warning: {
    hex: "#F59E0B",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    chip: "bg-amber-500",
  },
  success: {
    hex: "#16A34A",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    chip: "bg-emerald-600",
  },
  info: {
    hex: "#2563EB",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    chip: "bg-blue-600",
  },
} as const;

export function scoreToTone(score: number): AlertTone {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "danger";
}
