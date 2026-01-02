"use client";
import React from "react";
type Beyan = {
  tur?: string;
  donem?: string;
  durum?: string;
  not?: string;
  analiz?: string;
};
export default function BeyanBreakdown({ beyan = [] as Beyan[] }) {
  const rows = Array.isArray(beyan) ? beyan : [];
  return (
    <div className="rounded-2xl border bg-white shadow-sm dark:bg-slate-900 dark:border-slate-700">
      <div className="border-b px-5 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950">
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Beyanname Alt Kırılım
        </div>
        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          Tür, dönem, durum, analiz ve notlar
        </div>
      </div>
      <div className="p-5">
        {rows.length ? (
          <div className="overflow-x-auto rounded-xl border dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/70 dark:bg-slate-800">
                <tr className="text-left">
                  <th className="p-3 font-semibold">Tür</th>
                  <th className="p-3 font-semibold">Dönem</th>
                  <th className="p-3 font-semibold">Durum</th>
                  <th className="p-3 font-semibold">Analiz</th>
                  <th className="p-3 font-semibold">Not</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b, i) => (
                  <tr
                    key={i}
                    className="border-t border-slate-100 dark:border-slate-800 align-top"
                  >
                    <td className="p-3">{b.tur ?? "—"}</td>
                    <td className="p-3">{b.donem ?? "—"}</td>
                    <td className="p-3">{b.durum ?? "—"}</td>
                    <td className="p-3">{b.analiz ?? "—"}</td>
                    <td className="p-3">{b.not ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-slate-500">—</div>
        )}
      </div>
    </div>
  );
}
