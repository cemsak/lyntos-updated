"use client";
import React from "react";
import { useFilters } from "@/state/store";

const PERIODS = ["2024-Q4", "2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4"];

export default function Filters({ onApply }: { onApply: () => void }) {
  const { filters, set } = useFilters();
  const COMPANIES = ["OZKANLAR", "HKOZKAN", "DEMO AŞ", "ACME LTD"];

  return (
    <div className="rounded-2xl border bg-white shadow-sm p-4">
      <div className="flex items-center gap-2 text-slate-600 text-xs">
        Filtreler
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          <div className="mb-1 text-slate-600">Firma</div>
          <select
            value={filters.entity}
            onChange={(e) => set({ entity: e.target.value })}
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
          >
            {COMPANIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <div className="mb-1 text-slate-600">Dönem</div>
          <select
            value={filters.period}
            onChange={(e) => set({ period: e.target.value })}
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
          >
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end">
          <button
            onClick={onApply}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Uygula
          </button>
        </div>
      </div>
    </div>
  );
}
