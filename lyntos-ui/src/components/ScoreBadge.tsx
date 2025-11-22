"use client";
import React from "react";

export default function ScoreBadge({
  score,
  label,
}: {
  score: number;
  label?: string;
}) {
  const tone =
    score >= 70
      ? {
          chip: "bg-emerald-100 text-emerald-800 border-emerald-300",
          dot: "bg-emerald-500",
        }
      : score >= 50
        ? {
            chip: "bg-amber-100 text-amber-800 border-amber-300",
            dot: "bg-amber-500",
          }
        : {
            chip: "bg-rose-100 text-rose-800 border-rose-300",
            dot: "bg-rose-500",
          };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border ${tone.chip}`}
    >
      <i className={`inline-block w-1.5 h-1.5 rounded-full ${tone.dot}`} />
      {label && <span className="opacity-80">{label}</span>}
      <strong className="tabular-nums">
        {Number.isFinite(score) ? Math.round(score) : "-"}
      </strong>
    </span>
  );
}