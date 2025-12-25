"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AxisDPanelClient from "./AxisDPanelClient";

type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;

type MissingRef = {
  code: string;
  title_tr?: string | null;
  severity?: Severity | null;
  how_to_fix_tr?: string | null;
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
  warnings?: string[] | null;
  risks?: RiskSummary[];
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
  const [busy, setBusy] = useState<null | "refresh">(null);
  const [severityFilter, setSeverityFilter] = useState<"ALL" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW">("ALL");
  const [q, setQ] = useState<string>("");

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
              Period: <span className="font-medium">{period}</span> | Client: <span className="font-medium">{props.ctx.client}</span> | SMMM: <span className="font-medium">{props.ctx.smmm}</span>
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Kurgan Risk Skoru</div>
            <div className="text-2xl font-semibold">{kurganRiskScore}</div>
            <div className="text-xs text-slate-600">signal score/weight bazlı</div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Vergi Uyum Puanı</div>
            <div className="text-2xl font-semibold">{vergiUyum}</div>
            <div className="text-xs text-slate-600">risk + data quality</div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Radar Risk Skoru</div>
            <div className="text-2xl font-semibold">{radarRisk}</div>
            <div className="text-xs text-slate-600">bank out-of-period + HIGH yoğunluğu</div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Data Quality (Bank in-period %)</div>
            <div className="text-2xl font-semibold">{dqScore}%</div>
            <div className="text-xs text-slate-600">in: {num(dq.bank_rows_in_period)} / total: {num(dq.bank_rows_total)}</div>
          </div>
        </div>

        {(dq.warnings?.length || c.warnings?.length) ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="text-sm font-semibold">Uyarılar</div>
            <ul className="list-disc pl-5 text-sm text-slate-700">
              {(dq.warnings || []).map((w, i) => <li key={`dq-${i}`}>{w}</li>)}
              {(c.warnings || []).map((w, i) => <li key={`w-${i}`}>{w}</li>)}
            </ul>
          </div>
        ) : null}
      </div>

      <AxisDPanelClient smmm={props.ctx.smmm} client={props.ctx.client} period={props.ctx.period} />

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
