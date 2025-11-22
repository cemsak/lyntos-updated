"use client";
import React from "react";
type Ned = {
  neden?: string;
  baslik?: string;
  etki?: string;
  kanit?: string;
  oneri?: string;
};
export default function SmiybPanelDetailed({ smiyb = {} as any }) {
  const skor = smiyb?.skor;
  const durum = smiyb?.durum;
  const nedenler: Ned[] = Array.isArray(smiyb?.nedenler) ? smiyb.nedenler : [];
  const eksik: string[] = Array.isArray(smiyb?.eksik_veriler)
    ? smiyb.eksik_veriler
    : [];
  return (
    <div className="rounded-2xl border bg-white shadow-sm dark:bg-slate-900 dark:border-slate-700">
      <div className="border-b px-5 py-3 bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-950 dark:to-amber-950">
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Sahte Fatura Analizi
        </div>
        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          Skor: <b>{typeof skor === "number" ? skor : "—"}</b> · Durum:{" "}
          <b>{durum ?? "—"}</b>
        </div>
      </div>
      <div className="p-5">
        <div className="text-sm font-semibold mb-2">Neden–Etki–Kanıt–Öneri</div>
        {nedenler.length ? (
          <div className="overflow-x-auto rounded-xl border dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/70 dark:bg-slate-800">
                <tr className="text-left">
                  <th className="p-3 font-semibold">Neden</th>
                  <th className="p-3 font-semibold">Etki</th>
                  <th className="p-3 font-semibold">Kanıt</th>
                  <th className="p-3 font-semibold">Öneri</th>
                </tr>
              </thead>
              <tbody>
                {nedenler.map((r, i) => (
                  <tr
                    key={i}
                    className="border-t border-slate-100 dark:border-slate-800 align-top"
                  >
                    <td className="p-3">{r.baslik || r.neden || "—"}</td>
                    <td className="p-3">
                      <span
                        className={
                          "inline-block rounded-md border px-2 py-0.5 text-[12px] " +
                          (r.etki === "Artırıcı"
                            ? "border-red-300 text-red-600 dark:border-red-800 dark:text-red-300"
                            : r.etki === "Azaltıcı"
                              ? "border-emerald-300 text-emerald-600 dark:border-emerald-800 dark:text-emerald-300"
                              : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300")
                        }
                      >
                        {r.etki ?? "—"}
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
        <div className="mt-4 text-sm">
          <div className="font-semibold mb-1">Eksik Veriler</div>
          {eksik.length ? (
            <ul className="list-disc pl-5 space-y-1">
              {eksik.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          ) : (
            "—"
          )}
        </div>
      </div>
    </div>
  );
}
