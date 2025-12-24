"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

type AxisItem = {
  id: string;
  account_prefix?: string;
  title_tr: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  finding_tr?: string | null;
  actions_tr?: string[] | null;
  required_docs?: { code: string; title_tr?: string | null }[] | null;
};

type AxisContract = {
  axis: string;
  title_tr: string;
  period_window?: { period?: string; start_date?: string; end_date?: string };
  items: AxisItem[];
  notes_tr?: string | null;
};

function sevColor(sev: string): string {
  switch (sev) {
    case "CRITICAL":
      return "bg-red-700 text-white";
    case "HIGH":
      return "bg-red-500 text-white";
    case "MEDIUM":
      return "bg-amber-500 text-white";
    case "LOW":
      return "bg-emerald-600 text-white";
    default:
      return "bg-slate-600 text-white";
  }
}

export default function AxisDPanelClient(props: { smmm: string; client: string; period: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<AxisContract | null>(null);

  const url = useMemo(() => {
    const qs = new URLSearchParams({
      smmm: props.smmm,
      client: props.client,
      period: props.period,
    }).toString();
    return `/api/v1/contracts/axis/D?${qs}`;
  }, [props.smmm, props.client, props.period]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(url, { cache: "no-store" });
      const txt = await res.text();
      if (!res.ok) throw new Error(`${res.status} ${txt.slice(0, 200)}`);
      setData(JSON.parse(txt));
    } catch (e: any) {
      setData(null);
      setErr(e?.message || "Axis-D load error");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void load();
  }, [load]);

  const notesText = useMemo(() => {
    const raw = (data?.notes_tr || "").trim();
    // backend bazen "\\n" gönderiyor; UI'da gerçek satır sonu olsun
    return raw.replace(/\\n/g, "\n").trim();
  }, [data?.notes_tr]);

  const periodText = data?.period_window?.period || props.period;

  return (
    <div className="rounded-2xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-base font-semibold">Eksen D — Mizan İncelemesi (Kritik Eksen)</div>
          <div className="text-xs text-slate-600">
            100 Kasa, 131/331, 3xx/4xx krediler, kur farkı/finansman, stok/BS vb. trend + tutarlılık + evrak ihtiyacı.
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Dönem: <span className="font-medium text-slate-700">{periodText}</span>
          </div>
        </div>

        <button
          className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
          onClick={load}
          disabled={loading}
        >
          {loading ? "Yükleniyor..." : "Yenile"}
        </button>
      </div>

      {!err && notesText ? (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 whitespace-pre-line">
          {notesText}
        </div>
      ) : null}

      {err ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-slate-700">
          <div className="font-semibold">Not</div>
          <div className="mt-1">
            Axis-D contract alınamadı. Genelde backend çalışmıyor, proxy route hatalı veya contract endpoint’i 500 dönüyor.
          </div>
          <div className="mt-2 text-xs text-slate-600">Hata: {err}</div>
        </div>
      ) : null}

      {!err && data && data.items?.length ? (
        <div className="mt-3 space-y-2">
          {data.items.map((it) => (
            <div key={it.id} className="rounded-xl bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold">
                  {it.account_prefix ? `${it.account_prefix} — ` : ""}
                  {it.title_tr}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${sevColor(it.severity)}`}>
                  {it.severity}
                </span>
              </div>

              {it.finding_tr ? <div className="mt-1 text-sm text-slate-700">{it.finding_tr}</div> : null}

              {it.required_docs?.length ? (
                <div className="mt-2 text-xs text-slate-700">
                  <div className="font-semibold">Gerekli Evrak</div>
                  <ul className="list-disc pl-5">
                    {it.required_docs.map((d, i) => (
                      <li key={i}>{d.title_tr || d.code}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {it.actions_tr?.length ? (
                <div className="mt-2 text-xs text-slate-700">
                  <div className="font-semibold">SMMM Aksiyon</div>
                  <ul className="list-disc pl-5">
                    {it.actions_tr.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : !err && data ? (
        <div className="mt-3 text-sm text-slate-600">Axis-D contract geldi ama henüz item yok (veya boş dönüyor).</div>
      ) : null}
    </div>
  );
}
