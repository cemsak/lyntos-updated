"use client";
import React from "react";

type Row = {
  konu?: string;
  ciddi_mi?: boolean | string;
  kanit?: string;
  oneri?: string;
  etki?: string;
};
export default function AnomalyReport({ rows = [] as Row[] }) {
  const list = Array.isArray(rows) ? rows : [];
  return (
    <div className="rounded-2xl border bg-white shadow-sm dark:bg-slate-900 dark:border-slate-700">
      <div className="border-b px-5 py-3 bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-950 dark:to-red-950">
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Anomali Raporu
        </div>
        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          Olağandışı hareketler, kanıt ve öneriler
        </div>
      </div>
      <div className="p-5">
        {list.length ? (
          <div className="overflow-x-auto rounded-xl border dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/70 dark:bg-slate-800">
                <tr className="text-left">
                  <th className="p-3 font-semibold">Konu</th>
                  <th className="p-3 font-semibold">Ciddiyet</th>
                  <th className="p-3 font-semibold">Kanıt</th>
                  <th className="p-3 font-semibold">Öneri</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r, i) => (
                  <tr
                    key={i}
                    className="border-t border-slate-100 dark:border-slate-800 align-top"
                  >
                    <td className="p-3">{r.konu ?? "—"}</td>
                    <td className="p-3">
                      <span
                        className={
                          "inline-block rounded-md border px-2 py-0.5 text-[12px] " +
                          (r.ciddi_mi === true || r.ciddi_mi === "Evet"
                            ? "border-red-300 text-red-600 dark:border-red-800 dark:text-red-300"
                            : r.ciddi_mi === false || r.ciddi_mi === "Hayır"
                              ? "border-emerald-300 text-emerald-600 dark:border-emerald-800 dark:text-emerald-300"
                              : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300")
                        }
                      >
                        {r.ciddi_mi === true || r.ciddi_mi === "Evet"
                          ? "Ciddi"
                          : r.ciddi_mi === false || r.ciddi_mi === "Hayır"
                            ? "Normal"
                            : "—"}
                      </span>
                    </td>
                    <td className="p-3">{r.kanit ?? "—"}</td>
                    <td className="p-3">{r.oneri ?? "—"}</td>
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
