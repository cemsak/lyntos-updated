"use client";
import React from "react";
export default function RadarDetails({ radar = {} as any }) {
  const skor = radar?.radar_risk_skoru;
  const durum = radar?.radar_risk_durumu;
  const nedenler: any[] = Array.isArray(radar?.nedenler) ? radar.nedenler : [];
  return (
    <div className="rounded-2xl border bg-white shadow-sm dark:bg-slate-900 dark:border-slate-700">
      <div className="border-b px-5 py-3 bg-gradient-to-r from-fuchsia-50 to-pink-50 dark:from-fuchsia-950 dark:to-pink-950">
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          RADAR Ayrıntı
        </div>
        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          Skor: <b>{typeof skor === "number" ? skor : "—"}</b> · Durum:{" "}
          <b>{durum ?? "—"}</b>
        </div>
      </div>
      <div className="p-5">
        <div className="text-sm font-semibold mb-2">Katkı/Neden Listesi</div>
        {nedenler.length ? (
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {nedenler.map((n, i) => (
              <li key={i}>
                {n?.ad || n?.neden || "—"} — {n?.puan ?? n?.etki ?? "—"}
              </li>
            ))}
          </ul>
        ) : (
          "—"
        )}
        <div className="mt-4 text-xs text-slate-600 dark:text-slate-300">
          Açıklama: RADAR skoru, bileşen bazlı risk katkılarının ağırlıklı
          toplamıdır.
        </div>
      </div>
    </div>
  );
}
