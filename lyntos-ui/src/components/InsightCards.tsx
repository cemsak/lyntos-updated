"use client";
import React from "react";
import { ALERT } from "@/design/alerts";

type KPI = {
  title: string;
  value: string | number;
  hint?: string;
  delta?: { value: number; positive?: boolean };
};

export default function InsightCards({ items }: { items: KPI[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {items.map((kpi, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-slate-200 bg-white/60 dark:bg-slate-800/50 backdrop-blur shadow-sm p-4 hover:shadow transition"
        >
          <div className="text-slate-500 dark:text-slate-300 text-sm">
            {kpi.title}
          </div>
          <div className="mt-2 flex items-end justify-between">
            <div className="text-2xl font-semibold tabular-nums">
              {kpi.value}
            </div>
            {kpi.delta && (
              <div
                className={`text-xs px-2 py-1 rounded-full ${
                  kpi.delta.positive
                    ? `${ALERT.success.bg} ${ALERT.success.text}`
                    : `${ALERT.danger.bg} ${ALERT.danger.text}`
                }`}
              >
                {(kpi.delta.positive ? "▲" : "▼") + " " + kpi.delta.value + "%"}
              </div>
            )}
            {!kpi.delta && <div className="text-xs text-slate-400">—</div>}
          </div>
          {kpi.hint && (
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {kpi.hint}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
