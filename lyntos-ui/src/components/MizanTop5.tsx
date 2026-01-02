"use client";
import React from "react";

export default function MizanTop5({
  rows,
}: {
  rows: Array<{ hesap: string; fark: number }>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/50 overflow-hidden shadow-sm">
      <div className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
        Mizan Top 5 Fark
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-700/50">
          <tr>
            <th className="text-left p-3 font-medium">Hesap</th>
            <th className="text-left p-3 font-medium">Fark</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className="border-t border-slate-100 dark:border-slate-700"
            >
              <td className="p-3">{r.hesap}</td>
              <td className="p-3 tabular-nums">
                {r.fark.toLocaleString("tr-TR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
