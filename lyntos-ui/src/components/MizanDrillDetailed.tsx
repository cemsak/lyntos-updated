"use client";
import React from "react";
type Row = {
  hesap?: string;
  ad?: string;
  borc?: number;
  alacak?: number;
  fark?: number;
  aciklama?: string;
  oneri?: string;
};
export default function MizanDrillDetailed({ mizan = {} as any }) {
  const top5: Row[] = Array.isArray(mizan?.top5) ? mizan.top5 : [];
  return (
    <div className="rounded-2xl border bg-white shadow-sm dark:bg-slate-900 dark:border-slate-700">
      <div className="border-b px-5 py-3 bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-950 dark:to-indigo-950">
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Mizan Drill-Down
        </div>
        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          Fark yaratan ilk 5 hesap ve kısa yorum
        </div>
      </div>
      <div className="p-5">
        {top5.length ? (
          <div className="overflow-x-auto rounded-xl border dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/70 dark:bg-slate-800">
                <tr className="text-left">
                  <th className="p-3 font-semibold">Hesap</th>
                  <th className="p-3 font-semibold">Ad</th>
                  <th className="p-3 font-semibold">Fark</th>
                  <th className="p-3 font-semibold">Analiz</th>
                  <th className="p-3 font-semibold">Öneri</th>
                </tr>
              </thead>
              <tbody>
                {top5.map((r, i) => (
                  <tr
                    key={i}
                    className="border-t border-slate-100 dark:border-slate-800 align-top"
                  >
                    <td className="p-3">{r.hesap ?? "—"}</td>
                    <td className="p-3">{r.ad ?? "—"}</td>
                    <td className="p-3">
                      {typeof r.fark === "number" ? r.fark : "—"}
                    </td>
                    <td className="p-3">{r.aciklama ?? "—"}</td>
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
