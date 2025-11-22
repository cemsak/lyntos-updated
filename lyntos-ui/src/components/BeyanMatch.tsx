"use client";
import React from "react";

export default function BeyanMatch({
  issues,
}: {
  issues: Array<{ code: string; note?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/50 p-4 shadow-sm">
      <div className="text-sm text-slate-600 dark:text-slate-300 mb-1">
        Beyan Eşleşmesi
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
        KDV1/2, MUHSGK zamanlılık/tutarlılık
      </p>
      {issues?.length ? (
        <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-300">
          {issues.slice(0, 4).map((it, i) => (
            <li key={i}>
              {it.code}
              {it.note ? ` — ${it.note}` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-slate-500">Uyumsuzluk görünmüyor.</div>
      )}
    </div>
  );
}
