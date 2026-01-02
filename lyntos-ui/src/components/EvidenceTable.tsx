"use client";
import React from "react";

type Row = { label: string; value: string | number; note?: string };

export default function EvidenceTable({ rows }: { rows: Row[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/60 dark:bg-slate-800/50 backdrop-blur overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-200">
          <tr>
            <th className="text-left p-3 font-medium">Kalem</th>
            <th className="text-left p-3 font-medium">Değer</th>
            <th className="text-left p-3 font-medium">Not</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-700/40"
            >
              <td className="p-3">{r.label}</td>
              <td className="p-3 tabular-nums">{r.value}</td>
              <td className="p-3 text-slate-500 dark:text-slate-300">
                {r.note ?? "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
