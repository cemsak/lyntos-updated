"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AxisDPanelClient from "./AxisDPanelClient";

type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;

type MissingRef = {
  code: string;
  title_tr?: string | null;
  severity?: Severity | null;
  how_to_fix_tr?: string | null;
};

type AnalysisBlock = {
  id?: string | null;
  type: string;
  title_tr?: string | null;
  severity?: Severity | null;
  summary_tr?: string | null;
  bullets_tr?: string[] | null;
  evidence_refs?: any[] | null;
  missing_refs?: MissingRef[] | null;
};


type CriteriaSignal = {
  code: string;
  status: string;
  score?: number | null;   // 0-100
  weight?: number | null;  // 0-1
  rationale_tr?: string | null;
  evidence_refs?: any[];
  missing_refs?: MissingRef[];
};

type RiskSummary = {
  code: string;
  severity: Severity;
  score?: number | null;
  title_tr?: string | null;
  summary_tr?: string | null;
  kurgan_criteria_signals?: CriteriaSignal[];
};
type ValidationSummaryItem = {
  key?: string | null;
  status?: string | null;
  detail?: string | null;
};

type ValidationSummary = {
  analysis?: AnalysisBlock[] | null;
  overall?: string | null;
  missing_paths?: string[];
  warn_paths?: string[];
  items?: ValidationSummaryItem[];
  error?: string | null;
};

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

type PortfolioAnalysis = {
  expert?: ExpertAnalysisV1 | null;
  ai?: AiAnalysisV1 | null;
};



type PortfolioContract = {
  kind: string;
  period_window?: { period: string; start_date: string; end_date: string };

  data_quality?: {
    bank_rows_total?: number;
    bank_rows_in_period?: number;
    bank_rows_out_of_period?: number;
    sources_present?: string[];
    warnings?: string[];
  };

  kpis_reasons?: {
    inflation?: {
      reason_tr?: string | null;
      actions_tr?: string[] | null;
      required_docs?: any[] | null;
      missing_docs?: any[] | null;
    };
  };

  warnings?: string[] | null;
  risks?: RiskSummary[];

  kpis?: {
    kurgan_risk_score?: number | null;
    vergi_uyum_puani?: number | null;
    radar_risk_score?: number | null;
    dq_in_period_pct?: number | null;
    inflation_status?: string | null;
    inflation_net_698_effect?: number | null;
    inflation_close_to?: number | null;
    inflation_compliance_score?: number | null;
    inflation_compliance_band?: string | null;
  };

  kpis_meta?: {
    version?: string | null;
    components?: any;
  };


  analysis?: PortfolioAnalysis | null;

  validation_summary?: ValidationSummary | null;
};

type Ctx = { smmm: string; client: string; period: string };

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function sevRank(sev: Severity): number {
  switch (sev) {
    case "CRITICAL": return 4;
    case "HIGH": return 3;
    case "MEDIUM": return 2;
    case "LOW": return 1;
    default: return 0;
  }
}

function sevMultiplier(sev: Severity): number {
  switch (sev) {
    case "CRITICAL": return 2.0;
    case "HIGH": return 1.5;
    case "MEDIUM": return 1.2;
    case "LOW": return 1.0;
    default: return 1.0;
  }
}

function sevColor(sev: Severity): string {
  switch (sev) {
    case "CRITICAL": return "bg-red-700 text-white";
    case "HIGH": return "bg-red-500 text-white";
    case "MEDIUM": return "bg-amber-500 text-white";
    case "LOW": return "bg-emerald-600 text-white";
    default: return "bg-slate-600 text-white";
  }
}

function num(n: any): string {
  if (typeof n !== "number" || !isFinite(n)) return "-";
  return n.toLocaleString("tr-TR");
}

const S10_ANALYSIS_TYPES = [
  "ALL",
  "RISK_OVERVIEW",
  "DATA_QUALITY",
  "INFLATION",
  "ACTIONS",
  "OTHER",
] as const;

const S10_ANALYSIS_PANELS: Record<string, { title_tr: string }> = {
  ALL: { title_tr: "Analiz (Tümü)" },
  RISK_OVERVIEW: { title_tr: "Risk Genel Bakış" },
  DATA_QUALITY: { title_tr: "Veri Kalitesi Analizi" },
  INFLATION: { title_tr: "Enflasyon Muhasebesi Analizi" },
  ACTIONS: { title_tr: "Önerilen Aksiyonlar" },
  OTHER: { title_tr: "Diğer" },
};


function computeRiskScore(r: RiskSummary): number {
  const sigs = r.kurgan_criteria_signals || [];
  const usable = sigs.filter(s => typeof s.score === "number" && isFinite(s.score as number));
  if (!usable.length) return 0;

  const hasWeights = usable.some(s => typeof s.weight === "number" && isFinite(s.weight as number));
  if (hasWeights) {
    let sumW = 0;
    let sum = 0;
    for (const s of usable) {
      const w = (typeof s.weight === "number" && isFinite(s.weight)) ? clamp(s.weight, 0, 1) : 0;
      const sc = clamp(s.score as number, 0, 100);
      if (w > 0) {
        sumW += w;
        sum += sc * w;
      }
    }
    if (sumW > 0) return clamp(Math.round(sum / sumW), 0, 100);
  }

  // Weight yoksa skor ortalaması
  const avg = usable.reduce((a, s) => a + clamp(s.score as number, 0, 100), 0) / usable.length;
  return clamp(Math.round(avg), 0, 100);
}

function topSignal(r: RiskSummary): { code: string; score?: number; weight?: number; status?: string } | null {
  const sigs = r.kurgan_criteria_signals || [];
  const usable = sigs.filter(s => typeof s.score === "number" && isFinite(s.score as number));
  if (!usable.length) return null;

  const scored = usable
    .map(s => {
      const sc = clamp(s.score as number, 0, 100);
      const w = (typeof s.weight === "number" && isFinite(s.weight)) ? clamp(s.weight, 0, 1) : 0;
      const impact = (w > 0) ? sc * w : sc;
      return { s, impact };
    })
    .sort((a, b) => b.impact - a.impact);

  const s = scored[0].s;
  return { code: s.code, score: s.score ?? undefined, weight: s.weight ?? undefined, status: s.status };
}

export default function V1DashboardClient(props: { contract: PortfolioContract; ctx: Ctx }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [busy, setBusy] = useState<null | "refresh">(null);

  const pushPeriod = (nextPeriod: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("smmm", props.ctx.smmm);
    params.set("client", props.ctx.client);
    params.set("period", nextPeriod);
    router.push(`/v1?${params.toString()}`);
    router.refresh();
  };

  const [severityFilter, setSeverityFilter] = useState<"ALL" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW">("ALL");
  const [q, setQ] = useState<string>("");

  // --- S10: Dashboard Analysis (self-contained, fail-soft) ---
  const [analysisOpen, setAnalysisOpen] = useState<boolean>(false);
  const [analysisTypeFilter, setAnalysisTypeFilter] = useState<string>("ALL");

    const analysisBlocks = useMemo(() => {
    // Accept either top-level contract.analysis or nested validation_summary.analysis
    const cc = (props as any)?.contract as any;
    const top = cc?.analysis;
    const nested = cc?.validation_summary?.analysis;
    const raw = (Array.isArray(top) ? top : (Array.isArray(nested) ? nested : [])) as any[];
    return raw.filter((x) => x && typeof x === "object");
  }, [props.contract]);

  const analysisTypes = useMemo(() => {
    const set = new Set<string>();
    for (const b of analysisBlocks as any[]) {
      const t = (b?.type ?? "OTHER").toString();
      set.add(t);
    }
    const dynamic = Array.from(set).sort((a, b) => a.localeCompare(b));
    // Keep ALL always first; keep the static list as a hint for consistency.
    const base = (S10_ANALYSIS_TYPES as readonly string[]).filter((x) => x !== "ALL");
    const merged = ["ALL", ...Array.from(new Set([...base, ...dynamic]))];
    return merged;
  }, [analysisBlocks]);

  const analysisFiltered = useMemo(() => {
    const t = (analysisTypeFilter ?? "ALL").toString();
    if (t === "ALL") return analysisBlocks as any[];
    return (analysisBlocks as any[]).filter((b) => (b?.type ?? "OTHER").toString() === t);
  }, [analysisBlocks, analysisTypeFilter]);

  const c = props.contract;
  const period = c.period_window?.period || props.ctx.period;

  const dq = c.data_quality || {};
  const dqScore = useMemo(() => {
    const total = dq.bank_rows_total || 0;
    const inp = dq.bank_rows_in_period || 0;
    if (!total) return 0;
    return clamp(Math.round((inp / total) * 100), 0, 100);
  }, [dq.bank_rows_total, dq.bank_rows_in_period]);

  const risksWithScore = useMemo(() => {
    return (c.risks || []).map(r => ({
      r,
      riskScore: computeRiskScore(r),
      top: topSignal(r),
    }));
  }, [c.risks]);

  const risksSorted = useMemo(() => {
    return [...risksWithScore].sort((a, b) => {
      const ds = b.riskScore - a.riskScore;
      if (ds !== 0) return ds;
      const dr = sevRank(b.r.severity) - sevRank(a.r.severity);
      if (dr !== 0) return dr;
      return (a.r.code || "").localeCompare(b.r.code || "");
    });
  }, [risksWithScore]);

  const risksFiltered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return risksSorted.filter(({ r }) => {
      const okSev = severityFilter === "ALL" ? true : (r.severity === severityFilter);
      if (!okSev) return false;
      if (!qq) return true;
      const hay = `${r.code || ""} ${r.title_tr || ""}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [risksSorted, severityFilter, q]);

  const missingTodo = useMemo(() => {
    const map = new Map<string, { title: string; how: string; sev: Severity; from: string[] }>();
    for (const { r } of risksSorted) {
      const signals = r.kurgan_criteria_signals || [];
      for (const s of signals) {
        for (const m of (s.missing_refs || [])) {
          const key = `${m.code}|${m.title_tr || ""}`;
          const title = m.title_tr || m.code;
          const how = m.how_to_fix_tr || "";
          const sev = (m.severity || "MEDIUM") as Severity;
          const prev = map.get(key);
          const from = prev?.from || [];
          from.push(r.code);
          map.set(key, { title, how, sev, from });
        }
      }
    }
    return [...map.values()].sort((a, b) => sevRank(b.sev) - sevRank(a.sev));
  }, [risksSorted]);

  const kurganRiskScore = useMemo(() => {
    if (!risksSorted.length) return 0;
    let sumW = 0;
    let sum = 0;
    for (const x of risksSorted) {
      const w = sevMultiplier(x.r.severity);
      sumW += w;
      sum += x.riskScore * w;
    }
    if (sumW <= 0) return 0;
    return clamp(Math.round(sum / sumW), 0, 100);
  }, [risksSorted]);

  const vergiUyum = useMemo(() => {
    const riskPenalty = Math.round(kurganRiskScore * 0.75);
    const dqPenalty = Math.round((100 - dqScore) * 0.25);
    return clamp(100 - riskPenalty - dqPenalty, 0, 100);
  }, [kurganRiskScore, dqScore]);

  const radarRisk = useMemo(() => {
    const total = dq.bank_rows_total || 0;
    const outp = dq.bank_rows_out_of_period || 0;
    const outRatio = total ? clamp(outp / total, 0, 1) : 0;

    const heavy = risksSorted.filter(x => sevRank(x.r.severity) >= 3).length; // HIGH+
    const heavyRatio = risksSorted.length ? heavy / risksSorted.length : 0;

    const todoNorm = clamp(missingTodo.length / 10, 0, 1);

    return clamp(Math.round((outRatio * 0.60 + heavyRatio * 0.30 + todoNorm * 0.10) * 100), 0, 100);
  }, [dq.bank_rows_total, dq.bank_rows_out_of_period, risksSorted, missingTodo.length]);
  
  // --- Sprint-3: KPI render (backend is source of truth; UI falls back for migration) ---
  const kurganBase = (typeof c.kpis?.kurgan_risk_score === "number" && isFinite(c.kpis.kurgan_risk_score))
    ? c.kpis.kurgan_risk_score
    : kurganRiskScore;
  const dqBase = (typeof c.kpis?.dq_in_period_pct === "number" && isFinite(c.kpis.dq_in_period_pct))
    ? c.kpis.dq_in_period_pct
    : dqScore;
  const vergiUyumBase = (typeof c.kpis?.vergi_uyum_puani === "number" && isFinite(c.kpis.vergi_uyum_puani))
    ? c.kpis.vergi_uyum_puani
    : clamp(100 - Math.round(kurganBase * 0.75) - Math.round((100 - dqBase) * 0.25), 0, 100);
  const radarBase = (typeof c.kpis?.radar_risk_score === "number" && isFinite(c.kpis.radar_risk_score))
    ? c.kpis.radar_risk_score
    : radarRisk;

  async function doRefresh() {
    setBusy("refresh");
    try {
      const qs = new URLSearchParams({
        smmm: props.ctx.smmm,
        client: props.ctx.client,
        period: props.ctx.period,
      }).toString();

      const res = await fetch(`/api/v1/refresh?${qs}`, { method: "POST" });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`refresh failed: ${res.status} ${t}`);
      }
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Refresh error");
    } finally {
      setBusy(null);
    }
  }

  const pdfUrl = `/api/v1/dossier/pdf?client=${encodeURIComponent(props.ctx.client)}&period=${encodeURIComponent(props.ctx.period)}`;
  const zipUrl = `/api/v1/dossier/bundle?client=${encodeURIComponent(props.ctx.client)}&period=${encodeURIComponent(props.ctx.period)}`;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">LYNTOS /v1 — SMMM Operasyon Konsolu</div>
            <div className="text-sm text-slate-600">
              Dönem: <select className="ml-2 rounded-lg border px-2 py-1 text-sm" value={props.ctx.period} onChange={(e) => pushPeriod(e.target.value)}><option value="2025-Q1">2025-Q1</option><option value="2025-Q2">2025-Q2</option><option value="2025-Q3">2025-Q3</option></select> | Client: <span className="font-medium">{props.ctx.client}</span> | SMMM: <span className="font-medium">{props.ctx.smmm}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50" href={pdfUrl} target="_blank" rel="noreferrer">
              PDF indir
            </a>
            <a className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50" href={zipUrl} target="_blank" rel="noreferrer">
              ZIP bundle indir
            </a>
            <button
              className="rounded-lg bg-black px-3 py-2 text-sm text-white disabled:opacity-60"
              onClick={doRefresh}
              disabled={busy === "refresh"}
            >
              {busy === "refresh" ? "Refresh..." : "Refresh (backend çalıştır)"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Kurgan Risk Skoru</div>
            <div className="text-2xl font-semibold">{kurganBase}</div>
            <div className="text-xs text-slate-600">signal score/weight bazlı</div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Vergi Uyum Puanı</div>
            <div className="text-2xl font-semibold">{vergiUyumBase}</div>
            <div className="text-xs text-slate-600">risk + data quality</div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Radar Risk Skoru</div>
            <div className="text-2xl font-semibold">{radarBase}</div>
            <div className="text-xs text-slate-600">bank out-of-period + HIGH yoğunluğu</div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Data Quality (Bank in-period %)</div>
            <div className="text-2xl font-semibold">{dqBase}%</div>
            <div className="text-xs text-slate-600">in: {num(dq.bank_rows_in_period)} / total: {num(dq.bank_rows_total)}</div>
          </div>

                    {/* BEGIN S6_INFLATION_KPI_CARD */}
          <div
            className="rounded-2xl bg-slate-50 p-3 cursor-pointer"
            role="link"
            tabIndex={0}
            onClick={(e) => {
              const t = e.target as HTMLElement;
              if (t && t.closest && t.closest('a')) return;
              window.location.href = `/v1?smmm=${encodeURIComponent(props.ctx.smmm)}&client=${encodeURIComponent(props.ctx.client)}&period=${encodeURIComponent(props.ctx.period)}#axis-d`;
            }}
            onKeyDown={(e) => {
              const t = e.target as HTMLElement;
              if (t && t.closest && t.closest('a')) return;
              if (e.key === 'Enter' || e.key === ' ') {
                window.location.href = `/v1?smmm=${encodeURIComponent(props.ctx.smmm)}&client=${encodeURIComponent(props.ctx.client)}&period=${encodeURIComponent(props.ctx.period)}#axis-d`;
              }
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-slate-500">Enflasyon Muhasebesi</div>
              
        {/* BEGIN S9_INFLATION_COMPLIANCE_UI */}
        {(() => {
          const score = c.kpis?.inflation_compliance_score;
          const band = (c.kpis?.inflation_compliance_band ?? null) as string | null;
          const r = c.kpis_reasons?.inflation as any;
          const reason = (r?.score_reason_tr ?? null) as string | null;
          if (score == null && !reason) return null;
          return (
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">Inflation Compliance</div>
                <div className="text-sm font-semibold">
                  {score == null ? 'N/A' : `${score}${band ? ` (${band})` : ''}`}
                </div>
              </div>
              {reason ? <div className="mt-1 text-xs text-slate-700">{reason}</div> : null}
            </div>
          );
        })()}
        {/* END S9_INFLATION_COMPLIANCE_UI */}
{(() => {
                const s = (c.kpis?.inflation_status ?? "absent").toString();
                const badge = s === "computed" ? "COMPUTED" : s === "missing_data" ? "MISSING" : s === "error" ? "ERROR" : s === "observed_postings" ? "POSTINGS" : "ABSENT";
                const cls = s === "computed" ? "bg-emerald-600 text-white" : s === "missing_data" ? "bg-amber-500 text-white" : s === "error" ? "bg-red-600 text-white" : "bg-slate-600 text-white";
                return <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${cls}`}>{badge}</span>;
              })()}
            </div>
            {/* BEGIN S6_INFLATION_WARNINGS_CHIP */}
            {(() => {
              const dqAny = (props as any).dq;
              const ws = ((dqAny?.warnings?.length ? dqAny.warnings : (c?.warnings || [])) as string[]);
              const n = Array.isArray(ws) ? ws.length : 0;
              if (!n) return null;
              const tail = ws.slice(-2).join(' | ');
              return (
                <div className="mt-2 text-[11px] text-slate-600">
                  <span className="inline-flex items-center rounded-full border px-2 py-1">Warnings: <span className="ml-1 font-semibold">{n}</span></span>
                  <div className="mt-1 truncate" title={tail}>{tail}</div>
                </div>
              );
            })()}
            {/* END S6_INFLATION_WARNINGS_CHIP */}


            {(() => {
              const s = (c.kpis?.inflation_status ?? "absent").toString();
              const rr = (c as any).kpis_reasons?.inflation;
              const actions = (rr?.actions_tr || []) as string[];
              const reqN = Array.isArray(rr?.required_docs) ? rr?.required_docs?.length : null;
              const missN = Array.isArray(rr?.missing_docs) ? rr?.missing_docs?.length : null;

              if (s === "computed") {
                return (
                  <>
                    <div className="mt-2 text-2xl font-semibold">{num(c.kpis?.inflation_net_698_effect)}</div>
                    <div className="text-xs text-slate-600">Net 698 etkisi | Kapanış: {c.kpis?.inflation_close_to ?? "-"}</div>
                  </>
                );
              }

              return (
                <>
                  <div className="mt-2 text-2xl font-semibold">-</div>
                  <div className="text-xs text-slate-600">Durum: {s}</div>
                  {rr?.reason_tr ? <div className="mt-1 text-xs text-slate-700"><span className="font-semibold">Gerekçe:</span> {rr.reason_tr}</div> : null}
                  {(actions && actions.length) ? (
                    <ul className="mt-1 list-disc pl-5 text-xs text-slate-700">
                      {actions.slice(0, 4).map((a: string, i: number) => <li key={`infl-a-${i}`}>{a}</li>)}
                    </ul>
                  ) : null}
                  {(reqN !== null || missN !== null) ? (
                    <div className="mt-1 text-xs text-slate-600">
                      {reqN !== null ? <span>Required: <span className="font-semibold">{reqN}</span></span> : null}
                      {(reqN !== null && missN !== null) ? <span> | </span> : null}
                      {missN !== null ? <span>Missing: <span className="font-semibold">{missN}</span></span> : null}
                    </div>
                  ) : null}
                </>
              );
            })()}

              <div className="mt-2 flex flex-wrap gap-3 text-xs underline">
  <a href="#axis-d">Axis-D (sayfada)</a>
  <a href={`/v1?smmm=${encodeURIComponent(props.ctx.smmm)}&client=${encodeURIComponent(props.ctx.client)}&period=${encodeURIComponent(props.ctx.period)}#axis-d`}>Axis-D (link)</a>
</div>
          </div>
          {/* END S6_INFLATION_KPI_CARD */}

        </div>

                {/* BEGIN S8_DATASET_HEALTH */}
        {(() => {
          const vs = c.validation_summary as (ValidationSummary | null | undefined);
          if (!vs) return null;
          const overall = (vs.overall ?? "unknown").toString();
          const warnPaths = (Array.isArray(vs.warn_paths) ? vs.warn_paths : []) as string[];
          const missingPaths = (Array.isArray(vs.missing_paths) ? vs.missing_paths : []) as string[];
          const warnN = warnPaths.length;
          const missN = missingPaths.length;
          const chip =
            overall === "OK" ? "bg-emerald-600 text-white" :
            overall === "WARN" ? "bg-amber-500 text-white" :
            overall === "MISSING" ? "bg-red-600 text-white" :
            overall === "error" ? "bg-red-700 text-white" :
            "bg-slate-500 text-white";
          const detail =
            overall === "OK" ? "Dataset doğrulama OK." :
            overall === "WARN" ? "Dataset kısmi: eksik/opsiyonel girdiler var." :
            overall === "MISSING" ? "Dataset kritik eksik: mizan/dosya yok." :
            overall === "error" ? (vs.error ? ("Validator error: " + vs.error) : "Validator error.") :
            "Dataset durumu bilinmiyor.";
          const preview = (missingPaths.length ? missingPaths : warnPaths).slice(0, 3);                    // BEGIN S8_DATASET_HEALTH_OPS
                    const [vsOpen, setVsOpen] = useState(false);
                    const hasAny = (warnN + missN) > 0;
                    const primaryList = (missingPaths.length ? missingPaths : warnPaths);
                    const primaryLabel = (missingPaths.length ? 'Missing paths' : 'Warn paths');
                    const actionLine =
                      overall === 'WARN' ? 'Eksik/opsiyonel girdiler var: enflasyon kanıt paketini tamamlayınız.' :
                      overall === 'MISSING' ? 'Kritik eksik veri: mizan/dosya yolu tamamlanmadan analiz güvenilir olmaz.' :
                      overall === 'error' ? 'Validator hata verdi: logs/warnings kontrol ediniz.' : '';
                    const copyPayload = {
                      overall,
                      missing_paths: missingPaths,
                      warn_paths: warnPaths,
                      items: Array.isArray(vs.items) ? vs.items : [],
                      error: (vs as any).error ?? null,
                    };
                    const onCopy = async () => {
                      try {
                        const txt = JSON.stringify(copyPayload, null, 2);
                        await navigator.clipboard.writeText(txt);
                      } catch {
                        // ignore
                      }
                    };
                    // END S8_DATASET_HEALTH_OPS


          return (
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">Dataset Health</div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${chip}`}>{overall}</span>
                  <button
                    type="button"
                    className="rounded border px-2 py-0.5 text-xs"
                    onClick={onCopy}
                    title="validation_summary JSON kopyala"
                  >
                    Detayı Kopyala
                  </button>
                  {hasAny ? (
                    <button
                      type="button"
                      className="rounded border px-2 py-0.5 text-xs"
                      onClick={() => setVsOpen(!vsOpen)}
                      title="warn/missing path listesini göster"
                    >
                      {vsOpen ? 'Gizle' : 'Göster'}
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="mt-1 text-xs text-slate-600">{detail}</div>
              {actionLine ? <div className="mt-1 text-xs text-slate-700">{actionLine}</div> : null}
              {(warnN || missN) ? (
                <div className="mt-2 text-xs text-slate-700">
                  <div>Warnings: {warnN} • Missing: {missN}</div>
                  {vsOpen ? (
                    <div className="mt-1">
                      <div className="text-xs font-semibold">{primaryLabel}</div>
                      {primaryList.slice(0, 25).map((p: string, i: number) => (
                        <div key={`vs-p-${i}`} className="truncate">{p}</div>
                      ))}
                      {(primaryList.length > 25) ? (
                        <div className="text-xs text-slate-600">+{primaryList.length - 25} daha…</div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-1">
                      {preview.map((p: string, i: number) => (
                        <div key={`vs-p-${i}`} className="truncate">{p}</div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })()}
        {/* END S8_DATASET_HEALTH */}

        {/* BEGIN S10_PORTFOLIO_ANALYSIS_UI */}
        {(() => {
          const a = (c as any).analysis as PortfolioAnalysis | null | undefined;
          if (!a || typeof a !== "object") return null;

          const expert = (a.expert || null) as ExpertAnalysisV1 | null;
          const ai = (a.ai || null) as AiAnalysisV1 | null;

          const confRaw = ai && typeof ai.confidence === "number" ? ai.confidence : null;
          const confPct =
            confRaw === null ? null : confRaw <= 1 ? Math.round(confRaw * 100) : Math.round(confRaw);

          return (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">Uzman Analizi (VDK/YMM)</div>
                  {expert ? (
                    <div className="text-xs text-slate-500">
                      {expert.version} • {expert.generated_at}
                    </div>
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
                            <li key={lb.doc_id || String(i)}>
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
                        <div className="mt-1 space-y-2">
                          {(expert.checks || []).map((chk) => (
                            <div key={chk.id} className="rounded-md border border-slate-100 bg-slate-50 p-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="text-xs font-medium text-slate-800">{chk.title_tr}</div>
                                <div className="text-[11px] text-slate-600">
                                  {(chk.status || chk.severity || "OK").toString()}
                                </div>
                              </div>
                              {chk.detail_tr ? (
                                <div className="mt-1 whitespace-pre-line text-xs text-slate-700">{chk.detail_tr}</div>
                              ) : null}
                              {Array.isArray(chk.evidence_refs) && chk.evidence_refs.length ? (
                                <div className="mt-1 text-[11px] text-slate-500">
                                  Kanıt: {chk.evidence_refs.length} referans
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-1 text-xs text-slate-500">Kontrol listesi boş.</div>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500">
                      Kanıt referansı: {(expert.evidence_refs || []).length} adet
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-slate-600">
                    Bu dönem için uzman analizi henüz üretilmedi (fail-soft).
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">AI Analizi (Yardımcı)</div>
                  {ai ? (
                    <div className="text-xs text-slate-500">
                      {confPct === null ? "confidence: -" : "confidence: " + String(confPct) + "%"}
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
                          <div key={it.id} className="rounded-md border border-slate-100 bg-slate-50 p-2">
                            <div className="text-xs font-medium text-slate-800">{it.title_tr}</div>
                            {it.rationale_tr ? (
                              <div className="mt-1 whitespace-pre-line text-xs text-slate-700">{it.rationale_tr}</div>
                            ) : null}
                            {it.action_tr ? (
                              <div className="mt-1 whitespace-pre-line text-xs text-slate-700">
                                <span className="font-semibold">Öneri:</span> {it.action_tr}
                              </div>
                            ) : null}
                            {Array.isArray(it.evidence_refs) && it.evidence_refs.length ? (
                              <div className="mt-1 text-[11px] text-slate-500">
                                Kanıt: {it.evidence_refs.length} referans
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-600">AI öneri listesi boş (fail-soft).</div>
                    )}

                    <div className="text-[11px] text-slate-500">
                      Kanıt referansı: {(ai.evidence_refs || []).length} adet
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-slate-600">
                    AI analizi henüz üretilmedi (fail-soft).
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        {/* END S10_PORTFOLIO_ANALYSIS_UI */}


        {/* BEGIN S10_DASHBOARD_ANALYSIS */}
        {analysisBlocks.length ? (
          <div className="rounded-2xl border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-base font-semibold">
                  {S10_ANALYSIS_PANELS.ALL?.title_tr || "Analiz"}
                </div>
                <div className="text-xs text-slate-600">
                  Contract üzerinden gelen analiz blokları (S10). Kaynak: contract.analysis veya contract.validation_summary.analysis
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-slate-600">
                  Tip
                  <select
                    className="ml-2 rounded-lg border px-2 py-2 text-sm"
                    value={analysisTypeFilter}
                    onChange={(e) => setAnalysisTypeFilter(e.target.value)}
                  >
                    {analysisTypes.map((t) => (
                      <option key={`s10-at-${t}`} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() => setAnalysisOpen(!analysisOpen)}
                >
                  {analysisOpen ? "Gizle" : "Göster"}
                </button>
              </div>
            </div>

            {!analysisOpen ? (
              <div className="mt-3 text-xs text-slate-600">
                Toplam blok: <span className="font-semibold">{analysisBlocks.length}</span>
                {analysisTypeFilter !== "ALL" ? (
                  <>
                    {" "}• Filtreli: <span className="font-semibold">{analysisFiltered.length}</span>
                  </>
                ) : null}
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {analysisFiltered.map((a: any, idx: number) => {
                  const sev = (a?.severity ?? null) as any;
                  const title = (a?.title_tr ?? null) as string | null;
                  const typ = (a?.type ?? "OTHER").toString();
                  const panelTitle =
                    title ||
                    S10_ANALYSIS_PANELS[typ]?.title_tr ||
                    (typ === "ALL" ? "Analiz" : typ);

                  const bullets = (Array.isArray(a?.bullets_tr) ? a.bullets_tr : []) as string[];
                  const miss = (Array.isArray(a?.missing_refs) ? a.missing_refs : []) as any[];
                  const evN = Array.isArray(a?.evidence_refs) ? a.evidence_refs.length : 0;

                  return (
                    <div key={(a?.id ?? `${typ}-${idx}`).toString()} className="rounded-xl bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold">{panelTitle}</div>
                        {sev ? (
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${sevColor(sev)}`}>
                            {sev}
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-600 px-3 py-1 text-xs font-semibold text-white">
                            {typ}
                          </span>
                        )}
                      </div>

                      {a?.summary_tr ? (
                        <div className="mt-1 text-sm text-slate-700">{a.summary_tr}</div>
                      ) : null}

                      {bullets.length ? (
                        <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
                          {bullets.slice(0, 10).map((b: string, i: number) => (
                            <li key={`s10-b-${idx}-${i}`}>{b}</li>
                          ))}
                        </ul>
                      ) : null}

                      {miss.length ? (
                        <div className="mt-2">
                          <div className="text-xs font-semibold text-slate-700">Eksik Kanıt / Evrak</div>
                          <ul className="mt-1 list-disc pl-5 text-xs text-slate-700">
                            {miss.slice(0, 12).map((m: any, i: number) => (
                              <li key={`s10-m-${idx}-${i}`}>
                                <span className="font-medium">{m?.title_tr || m?.code || "-"}</span>
                                {m?.how_to_fix_tr ? (
                                  <span className="text-slate-600"> — {m.how_to_fix_tr}</span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {evN ? (
                        <div className="mt-2 text-xs text-slate-600">Evidence refs: {evN}</div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
        {/* END S10_DASHBOARD_ANALYSIS */}

{(dq.warnings?.length || c.warnings?.length) ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="text-sm font-semibold">Uyarılar</div>
            <ul className="list-disc pl-5 text-sm text-slate-700">
              {Array.from(new Set([...(dq.warnings || []), ...(c.warnings || [])])).map((w, i) => <li key={`w-${i}`}>{w}</li>)}
              
            </ul>
          </div>
        ) : null}
      </div>

      <div id="axis-d">
              <AxisDPanelClient smmm={props.ctx.smmm} client={props.ctx.client} period={props.ctx.period} />
      </div>

      {missingTodo.length ? (
        <div className="rounded-2xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-base font-semibold">Eksik Evrak / Kanıt — Toplu Todo</div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
                onClick={async () => {
                  const lines = missingTodo.map((m) => {
                    const from = m.from?.length ? ` (Risk: ${m.from.join(", ")})` : "";
                    const how = m.how ? ` — ${m.how}` : "";
                    return `- ${m.title}${how}${from}`;
                  });
                  const out =
                    `LYNTOS Toplu Todo\nClient: ${props.ctx.client} | Period: ${props.ctx.period}\n\n` +
                    lines.join("\n");
                  try {
                    await navigator.clipboard.writeText(out);
                    alert("Todo panoya kopyalandı.");
                  } catch {
                    alert("Kopyalama başarısız (tarayıcı izinleri).");
                  }
                }}
              >
                Todo’yu kopyala
              </button>
              <div className="text-xs text-slate-600">Aynı evrak birden çok riske bağlıysa tek satırda toplanır.</div>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {missingTodo.map((m, i) => (
              <div key={i} className="rounded-xl bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold">{m.title}</div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${sevColor(m.sev)}`}>{m.sev}</span>
                </div>
                {m.how ? <div className="mt-1 text-sm text-slate-700">{m.how}</div> : null}
                <div className="mt-1 text-xs text-slate-600">Bağlı riskler: {m.from.join(", ")}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border p-4">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <div className="text-base font-semibold">Risk List (risk skoru sıralı)</div>
            <div className="text-xs text-slate-600">Filtre/arama sadece listeyi etkiler; KPI ve Todo tüm risklerden hesaplanır.</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-slate-600">
              Severity
              <select
                className="ml-2 rounded-lg border px-2 py-2 text-sm"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as any)}
              >
                <option value="ALL">ALL</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </label>

            <label className="text-xs text-slate-600">
              Ara
              <input
                className="ml-2 w-64 rounded-lg border px-3 py-2 text-sm"
                placeholder="R-401A / başlık..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>

            <button
              className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
              onClick={() => { setSeverityFilter("ALL"); setQ(""); }}
            >
              Sıfırla
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {risksFiltered.map(({ r, riskScore, top }) => {
            const firstSignal = r.kurgan_criteria_signals?.[0];
            const missing = firstSignal?.missing_refs || [];
            return (
              <div key={r.code} className="rounded-2xl border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-[260px]">
                    <div className="text-sm text-slate-500">{r.code}</div>
                    <div className="text-lg font-semibold">{r.title_tr || "-"}</div>
                    <div className="mt-1 text-xs text-slate-600">
                      Risk Skoru: <span className="font-semibold">{riskScore}</span>
                      {top ? (
                        <span className="ml-2">
                          | Top sinyal: <span className="font-medium">{top.code}</span>
                          {typeof top.score === "number" ? ` (${top.score}` : ""}
                          {typeof top.weight === "number" ? `×${top.weight})` : (typeof top.score === "number" ? ")" : "")}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${sevColor(r.severity)}`}>
                      {r.severity}
                    </span>
                    <a
                      className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
                      href={`/v1/risks/${encodeURIComponent(r.code)}?smmm=${encodeURIComponent(props.ctx.smmm)}&client=${encodeURIComponent(props.ctx.client)}&period=${encodeURIComponent(props.ctx.period)}`}
                    >
                      Detay (kanıt + checklist)
                    </a>
                  </div>
                </div>

                {firstSignal?.rationale_tr ? (
                  <div className="mt-2 text-sm text-slate-700">
                    <span className="font-semibold">Gerekçe: </span>{firstSignal.rationale_tr}
                  </div>
                ) : null}

                {missing.length ? (
                  <div className="mt-2 rounded-xl bg-slate-50 p-3">
                    <div className="text-sm font-semibold">Eksik Kanıt / Evrak</div>
                    <ul className="list-disc pl-5 text-sm text-slate-700">
                      {missing.map((m, i) => (
                        <li key={`${m.code}-${i}`}>
                          <span className="font-medium">{m.title_tr || m.code}</span>
                          {m.how_to_fix_tr ? <div className="text-xs text-slate-600">{m.how_to_fix_tr}</div> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <details className="rounded-2xl border p-4">
        <summary className="cursor-pointer text-sm font-semibold">Ham contract (portfolio)</summary>
        <pre className="mt-3 overflow-auto rounded-lg bg-slate-50 p-3 text-xs">
{JSON.stringify(c, null, 2)}
        </pre>
      </details>
    </div>
  );
}
