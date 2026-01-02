"use client";
import React from "react";
export default function BankMizanPanel({ data = {} as any }) {
  const banka = data?.banka || {};
  const mizan = data?.mizan || {};
  const bTop = typeof banka?.toplam === "number" ? banka.toplam : null;
  const mTop =
    typeof mizan?.banka_toplam === "number" ? mizan.banka_toplam : null;
  const diff = bTop != null && mTop != null ? bTop - mTop : null;
  const uyum = diff != null ? Math.abs(diff) < 1e-2 : null;
  return (
    <div className="rounded-2xl border bg-white shadow-sm dark:bg-slate-900 dark:border-slate-700">
      <div className="border-b px-5 py-3 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Banka – Mizan Uyumu
        </div>
        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          Banka hareketleri ile mizan karşılaştırması
        </div>
      </div>
      <div className="p-5 text-sm">
        <div>
          Bankadaki Toplam:{" "}
          <b>{bTop != null ? `₺${bTop.toLocaleString("tr-TR")}` : "—"}</b>
        </div>
        <div>
          Mizandaki Banka Toplamı:{" "}
          <b>{mTop != null ? `₺${mTop.toLocaleString("tr-TR")}` : "—"}</b>
        </div>
        <div className="mt-1">
          Fark: <b>{diff != null ? `₺${diff.toLocaleString("tr-TR")}` : "—"}</b>
        </div>
        <div className="mt-2">
          Uyum:{" "}
          {uyum == null ? (
            "—"
          ) : (
            <span
              className={
                "inline-block rounded-md border px-2 py-0.5 text-[12px] " +
                (uyum
                  ? "border-emerald-300 text-emerald-600 dark:border-emerald-800 dark:text-emerald-300"
                  : "border-red-300 text-red-600 dark:border-red-800 dark:text-red-300")
              }
            >
              {uyum ? "Uygun" : "Uyumsuz"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
