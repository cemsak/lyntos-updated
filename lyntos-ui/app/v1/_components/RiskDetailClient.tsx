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


// BEGIN S10_RISK_ANALYSIS_TYPES
type LegalBasisRef = {
  doc_id: string;
  date?: string | null;
  title?: string | null;
  url?: string | null;
};

type EvidenceRef = {
  doc_id?: string | null;
  source?: string | null;
  path?: string | null;
  period?: string | null;
  account?: string | null;
  note?: string | null;
};

type ExpertCheck = {
  id: string;
  title_tr: string;
  status?: string | null;
  severity?: string | null;
  detail_tr?: string | null;
  evidence_refs?: EvidenceRef[] | null;
};

type ExpertAnalysisV1 = {
  version: string;
  generated_at: string;
  summary_tr: string;
  legal_basis: LegalBasisRef[];
  evidence_refs: EvidenceRef[];
  checks: ExpertCheck[];
};

type AiItem = {
  id: string;
  title_tr: string;
  rationale_tr?: string | null;
  action_tr?: string | null;
  evidence_refs?: EvidenceRef[] | null;
};

type AiAnalysisV1 = {
  confidence: number;
  disclaimer_tr: string;
  evidence_refs: EvidenceRef[];
  items: AiItem[];
};

type RiskAnalysis = {
  expert?: ExpertAnalysisV1 | null;
  ai?: AiAnalysisV1 | null;
};
// END S10_RISK_ANALYSIS_TYPES

export default function RiskDetailClient(props: { code: string; smmm: string; client: string; period: string }) {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function run() {
      setErr(null);
      setData(null);
      try {
        const qs = new URLSearchParams({
          smmm: props.smmm,
          client: props.client,
          period: props.period,
        }).toString();
        const url = `/api/v1/contracts/risks/${encodeURIComponent(props.code)}?${qs}`;
        const res = await fetch(url, { cache: "no-store" });
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
  }, [props.code, props.smmm, props.client, props.period]);
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

            {/* BEGIN S10_RISK_ANALYSIS_UI */}
      {(() => {
        // Accept risk analysis from either top-level `data.analysis` or nested `risk.analysis`.
        const top = (data as any)?.analysis;
        const nested = (r as any)?.analysis;

        const pickObj = (x: any) => {
          if (!x || typeof x !== "object") return null;
          if (Array.isArray(x)) return null;
          const hasEA = Object.prototype.hasOwnProperty.call(x, "expert") || Object.prototype.hasOwnProperty.call(x, "ai");
          return hasEA ? x : null;
        };

        const a = pickObj(top) || pickObj(nested);
        if (!a) return null;

        const expert = (a.expert || null) as ExpertAnalysisV1 | null;
        const ai = (a.ai || null) as AiAnalysisV1 | null;

        const confRaw = ai && typeof ai.confidence === "number" ? ai.confidence : null;
        const confPct =
          confRaw === null ? null : confRaw <= 1 ? Math.round(confRaw * 100) : Math.round(confRaw);

        return (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-base font-semibold">Uzman Analizi (VDK/YMM)</div>
                {expert ? (
                  <div className="text-xs text-slate-500">{expert.version} • {expert.generated_at}</div>
                ) : (
                  <div className="text-xs text-slate-500">Yok</div>
                )}
              </div>

              {expert ? (
                <div className="mt-2 space-y-3">
                  <div className="text-sm whitespace-pre-line text-slate-800">{expert.summary_tr}</div>

                  <div>
                    <div className="text-xs font-semibold text-slate-700">Mevzuat Dayanağı</div>
                    {(expert.legal_basis || []).length ? (
                      <ul className="mt-1 list-disc pl-5 text-xs text-slate-700">
                        {(expert.legal_basis || []).map((lb, i) => (
                          <li key={(lb && lb.doc_id) ? lb.doc_id : String(i)}>
                            <span className="font-medium">{lb.doc_id}</span>
                            {lb.date ? <span> • {lb.date}</span> : null}
                            {lb.title ? <span> • {lb.title}</span> : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-1 text-xs text-slate-500">Dayanak listesi boş.</div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-700">Kontroller</div>
                    {(expert.checks || []).length ? (
                      <div className="mt-2 space-y-2">
                        {(expert.checks || []).map((chk) => (
                          <div key={chk.id} className="rounded-lg bg-slate-50 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-sm font-semibold">{chk.title_tr}</div>
                              <div className="text-xs text-slate-600">
                                {(chk.status || "unknown").toString()}
                                {chk.severity ? <span> • {chk.severity}</span> : null}
                              </div>
                            </div>
                            {chk.detail_tr ? (
                              <div className="mt-1 whitespace-pre-line text-xs text-slate-700">{chk.detail_tr}</div>
                            ) : null}
                            <div className="mt-1 text-xs text-slate-500">
                              Kanıt: {Array.isArray(chk.evidence_refs) ? chk.evidence_refs.length : 0}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-slate-500">Kontrol listesi boş (fail-soft).</div>
                    )}
                  </div>

                  <div className="text-xs text-slate-500">
                    Toplam kanıt referansı: {(expert.evidence_refs || []).length} adet
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-sm text-slate-600">
                  Bu risk için uzman analizi henüz üretilmedi (fail-soft).
                </div>
              )}
            </div>

            <div className="rounded-xl border p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-base font-semibold">AI Analizi (yardımcı)</div>
                {ai ? (
                  <div className="text-xs text-slate-500">
                    Confidence: {confPct === null ? "-" : String(confPct) + "%"}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">Yok</div>
                )}
              </div>

              {ai ? (
                <div className="mt-2 space-y-3">
                  <div className="text-xs whitespace-pre-line text-slate-700">{ai.disclaimer_tr}</div>

                  {(ai.items || []).length ? (
                    <div className="space-y-2">
                      {(ai.items || []).map((it) => (
                        <div key={it.id} className="rounded-lg bg-slate-50 p-3">
                          <div className="text-sm font-semibold">{it.title_tr}</div>
                          {it.rationale_tr ? <div className="mt-1 text-xs text-slate-700">{it.rationale_tr}</div> : null}
                          {it.action_tr ? <div className="mt-1 text-xs text-slate-700">Aksiyon: {it.action_tr}</div> : null}
                          <div className="mt-1 text-xs text-slate-500">
                            Kanıt: {Array.isArray(it.evidence_refs) ? it.evidence_refs.length : 0}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-600">AI öneri listesi boş (fail-soft).</div>
                  )}

                  <div className="text-xs text-slate-500">
                    Toplam kanıt referansı: {(ai.evidence_refs || []).length} adet
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-sm text-slate-600">
                  Bu risk için AI analizi henüz üretilmedi (fail-soft).
                </div>
              )}
            </div>

            <div className="md:col-span-2 text-xs text-slate-500">
              Kaynak: risk contract içindeki <span className="font-mono">analysis</span> (top-level veya <span className="font-mono">risk.analysis</span>).
            </div>
          </div>
        );
      })()}
      {/* END S10_RISK_ANALYSIS_UI */}

      <details className="rounded-xl border p-4">
        <summary className="cursor-pointer text-sm font-semibold">Ham contract (risk)</summary>
        <pre className="mt-3 overflow-auto rounded-lg bg-slate-50 p-3 text-xs">{JSON.stringify(data, null, 2)}</pre>
      </details>
    </div>
  );

}
