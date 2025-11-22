"use client";
import React from "react";
type Partner = {
  unvan?: string;
  nace?: string;
  vergi_no?: string;
  durum?: string;
  uyum_puani?: number;
  fatura_sayisi?: number;
};
export default function PartnersTable({ rows = [] as Partner[] }) {
  if (!rows.length) return <div className="text-sm text-slate-500">—</div>;
  return (
    <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm dark:bg-slate-900 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead className="bg-slate-50/70 dark:bg-slate-800">
          <tr className="text-left">
            <th className="p-3 font-semibold">Unvan</th>
            <th className="p-3 font-semibold">NACE</th>
            <th className="p-3 font-semibold">Vergi No</th>
            <th className="p-3 font-semibold">Durum</th>
            <th className="p-3 font-semibold">Uyum Puanı</th>
            <th className="p-3 font-semibold">Fatura</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className="border-t border-slate-100 dark:border-slate-800"
            >
              <td className="p-3">{r.unvan ?? "—"}</td>
              <td className="p-3">{r.nace ?? "—"}</td>
              <td className="p-3">{r.vergi_no ?? "—"}</td>
              <td className="p-3">{r.durum ?? "—"}</td>
              <td className="p-3">
                {typeof r.uyum_puani === "number" ? r.uyum_puani : "—"}
              </td>
              <td className="p-3">
                {typeof r.fatura_sayisi === "number" ? r.fatura_sayisi : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
