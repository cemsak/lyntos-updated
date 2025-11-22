"use client";
import React, { useState } from "react";

type ReasonItem = {
  title: string;
  effect?: string;
  evidence?: string;
  suggestion?: string;
  vdk?: boolean;
  basis?: string; // (varsa) yasal/teknik dayanak
};

export default function ReasonCards({ items }: { items: ReasonItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/50 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600 dark:text-slate-300">
          SMİYB — Neden · Etki · Kanıt · Öneri
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
        {(items ?? []).slice(0, 8).map((r, i) => (
          <button
            key={i}
            onClick={() => setOpen(i)}
            className="text-left rounded-xl border border-slate-200 dark:border-slate-700 p-3 hover:bg-slate-50/60 dark:hover:bg-slate-700/40"
          >
            <div className="text-sm font-medium flex items-center gap-2">
              {r.vdk && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                  VDK
                </span>
              )}
              {r.title}
            </div>
            {r.effect && (
              <div className="text-xs text-slate-500 mt-1">
                Etki: {r.effect}
              </div>
            )}
            {r.evidence && (
              <div className="text-xs text-slate-500 mt-1">
                Kanıt: {r.evidence}
              </div>
            )}
            {r.suggestion && (
              <div className="text-xs text-slate-500 mt-1">
                Öneri: {r.suggestion}
              </div>
            )}
          </button>
        ))}
      </div>

      {open !== null && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(null)}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-xl p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Detay</div>
              <button
                onClick={() => setOpen(null)}
                className="px-2 py-1 rounded border"
              >
                Kapat
              </button>
            </div>

            {items[open] ? (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Neden:</span>{" "}
                  {items[open].title}
                </div>
                {items[open].effect && (
                  <div>
                    <span className="font-medium">Etki:</span>{" "}
                    {items[open].effect}
                  </div>
                )}
                {items[open].evidence && (
                  <div>
                    <span className="font-medium">Kanıt:</span>{" "}
                    {items[open].evidence}
                  </div>
                )}
                {items[open].suggestion && (
                  <div>
                    <span className="font-medium">Öneri:</span>{" "}
                    {items[open].suggestion}
                  </div>
                )}
                {items[open].basis && (
                  <div>
                    <span className="font-medium">Dayanak:</span>{" "}
                    {items[open].basis}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
