"use client";

import React, { useEffect, useState } from "react";

type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;

function sevColor(sev: Severity): string {
  switch (sev) {
    case "CRITICAL": return "bg-red-600 text-white";
    case "HIGH": return "bg-red-500 text-white";
    case "MEDIUM": return "bg-amber-500 text-white";
    case "LOW": return "bg-emerald-600 text-white";
    default: return "bg-slate-600 text-white";
  }
}

export default function RiskDetailClient(props: { code: string; smmm: string; client: string; period: string }) {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function run() {
      setErr(null);
      setData(null);
      try {
        const res = await fetch(`/api/v1/contracts/risks/${encodeURIComponent(props.code)}`, { cache: "no-store" });
        const txt = await res.text();
        if (!res.ok) throw new Error(`${res.status} ${txt}`);
        const json = JSON.parse(txt);
        if (alive) setData(json);
      } catch (e: any) {
        if (alive) setErr(e?.message || "fetch error");
      }
    }
    run();
    return () => { alive = false; };
  }, [props.code]);

  if (err) {
    return (
      <div className="rounded-xl border p-4">
        <div className="text-lg font-semibold">Risk {props.code}</div>
        <div className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border p-4">
        <div className="text-lg font-semibold">Risk {props.code}</div>
        <div className="mt-2 text-sm text-slate-600">Yükleniyor...</div>
      </div>
    );
  }

  const r = data.risk || {};
  const dq = data.data_quality || {};
  const pw = data.period_window || {};
  const evidencePack = r?.evidence_details?.evidence_pack;

  const checklist =
    evidencePack?.checklist ||
    r?.checklist ||
    [];

  const smmmActions =
    r?.smmm_actions ||
    [];

  const missing102Details =
    r?.value_found?.missing_102_details ||
    evidencePack?.missing_102_details ||
    [];

  const recommendedFiles =
    evidencePack?.recommended_files ||
    [];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-slate-500">{props.code}</div>
            <div className="text-xl font-semibold">{r.title || r.title_tr || "-"}</div>
            <div className="text-sm text-slate-600">
              Period: <span className="font-medium">{pw.period || props.period}</span> ({pw.start_date} → {pw.end_date})
            </div>
          </div>
          <div className={`rounded-full px-3 py-1 text-xs font-semibold ${sevColor(r.severity)}`}>
            {r.severity || "-"}
          </div>
        </div>

        {r.description ? <div className="text-sm text-slate-700">{r.description}</div> : null}

        {dq?.warnings?.length ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="text-sm font-semibold">Data Quality Uyarıları</div>
            <ul className="list-disc pl-5 text-sm text-slate-700">
              {dq.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        ) : null}
      </div>

      {missing102Details?.length ? (
        <div className="rounded-xl border p-4">
          <div className="text-base font-semibold">Eksik 102 Alt Hesap Detayı</div>
          <div className="mt-2 overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Hesap</th>
                  <th className="py-2 pr-4">Ad</th>
                  <th className="py-2 pr-4">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {missing102Details.map((x: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="py-2 pr-4 font-medium">{x.account_code}</td>
                    <td className="py-2 pr-4">{x.account_name}</td>
                    <td className="py-2 pr-4">{typeof x.amount === "number" ? x.amount.toLocaleString("tr-TR") : x.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {recommendedFiles?.length ? (
        <div className="rounded-xl border p-4">
          <div className="text-base font-semibold">Önerilen Dosyalar</div>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
            {recommendedFiles.map((f: string, i: number) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      ) : null}

      {checklist?.length ? (
        <div className="rounded-xl border p-4">
          <div className="text-base font-semibold">Checklist (adım adım)</div>
          <ol className="mt-2 list-decimal pl-5 text-sm text-slate-700">
            {checklist.map((c: string, i: number) => <li key={i}>{c}</li>)}
          </ol>
        </div>
      ) : null}

      {smmmActions?.length ? (
        <div className="rounded-xl border p-4">
          <div className="text-base font-semibold">SMMM Aksiyonları</div>
          <ol className="mt-2 list-decimal pl-5 text-sm text-slate-700">
            {smmmActions.map((a: string, i: number) => <li key={i}>{a}</li>)}
          </ol>
        </div>
      ) : null}

      <details className="rounded-xl border p-4">
        <summary className="cursor-pointer text-sm font-semibold">Ham contract (risk)</summary>
        <pre className="mt-3 overflow-auto rounded-lg bg-slate-50 p-3 text-xs">{JSON.stringify(data, null, 2)}</pre>
      </details>
    </div>
  );

}
