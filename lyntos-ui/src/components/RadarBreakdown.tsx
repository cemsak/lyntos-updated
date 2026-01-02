"use client";
import React from "react";
export default function RadarBreakdown({ radar = {} as any }) {
  const skor = radar?.radar_risk_skoru;
  const durum = radar?.radar_risk_durumu;
  const nedenler = Array.isArray(radar?.nedenler) ? radar.nedenler : [];
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm min-w-0 dark:bg-slate-900 dark:border-slate-700">
      <div className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        RADAR Özeti
      </div>
      <div className="text-sm">
        Skor: <b>{typeof skor === "number" ? skor : "—"}</b>, Durum:{" "}
        <b>{durum ?? "—"}</b>
      </div>
      <div className="mt-3 text-sm">
        {nedenler.length ? (
          <ul className="list-disc pl-5 space-y-1">
            {nedenler.map((n: any, i: number) => (
              <li key={i}>
                {n?.ad || n?.neden || "—"} — {n?.puan ?? n?.etki ?? "—"}
              </li>
            ))}
          </ul>
        ) : (
          "—"
        )}
      </div>
    </div>
  );
}
