"use client";
import React, { useEffect, useState } from "react";

export default function FilterBar({
  firma,
  donem,
  onChange,
}: {
  firma: string;
  donem: string;
  onChange: (v: { firma: string; donem: string }) => void;
}) {
  const [local, setLocal] = useState({ firma, donem });

  // URL => form (ilk yüklemede)
  useEffect(() => {
    const u = new URL(window.location.href);
    const f = u.searchParams.get("firma");
    const d = u.searchParams.get("donem");
    setLocal({
      firma: f ?? local.firma,
      donem: d ?? local.donem,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Uygula
  const apply = () => {
    onChange(local);
    const u = new URL(window.location.href);
    u.searchParams.set("firma", local.firma);
    u.searchParams.set("donem", local.donem);
    window.history.replaceState({}, "", u.toString());
    localStorage.setItem("lyntos_filters", JSON.stringify(local));
  };

  // Koyu/açık mod
  const toggleTheme = () => {
    const el = document.documentElement;
    el.classList.toggle("dark");
    localStorage.setItem(
      "theme",
      el.classList.contains("dark") ? "dark" : "light",
    );
  };

  // İlk açılışta tema
  useEffect(() => {
    const t = localStorage.getItem("theme");
    if (t === "dark") document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold">LYNTOS SMMM Paneli</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          API-first • Power BI görünüm
        </p>
      </div>
      <div className="flex gap-2">
        <input
          className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-xl px-3 py-2 text-sm"
          placeholder="Firma"
          value={local.firma}
          onChange={(e) => setLocal((s) => ({ ...s, firma: e.target.value }))}
        />
        <select
          className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-xl px-3 py-2 text-sm"
          value={local.donem}
          onChange={(e) => setLocal((s) => ({ ...s, donem: e.target.value }))}
        >
          {["2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4"].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button
          onClick={apply}
          className="px-3 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-sm"
        >
          Uygula
        </button>
        <button
          onClick={toggleTheme}
          className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-sm"
          title="Tema değiştir"
        >
          Tema
        </button>
      </div>
    </div>
  );
}
