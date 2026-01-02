"use client";
import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";

export default function BankHeat({
  data,
}: {
  data: Array<{ day: string; delta: number }>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/50 p-4 shadow-sm">
      <div className="text-sm text-slate-600 dark:text-slate-300 mb-1">
        Banka Mutabakat Isısı
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
        Valör–kayıt sapması/kayıp giriş yoğunluğu (özet)
      </p>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data ?? []}>
            <XAxis dataKey="day" hide />
            <Tooltip />
            <Bar dataKey="delta" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
