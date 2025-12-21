"use client";
import { COLORS } from "@/design/palette";
export default function TrendDelta({
  prev = 0,
  last = 0,
}: {
  prev?: number;
  last?: number;
}) {
  const raw = prev ? Math.round(((last - prev) / Math.abs(prev)) * 100) : 0;
  const up = raw >= 0;
  const color = up ? COLORS.success : COLORS.danger;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: color + "20", color }}
    >
      {up ? "▲" : "▼"} {Math.abs(raw)}%
    </span>
  );
}
