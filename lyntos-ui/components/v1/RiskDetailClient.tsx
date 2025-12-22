"use client";

import { useEffect, useMemo, useState } from "react";
import { DataQualityBand } from "../risk/DataQualityBand";
import { KurganCriteriaPanel } from "../risk/KurganCriteriaPanel";

type PeriodWindow = { period?: string; start_date?: string; end_date?: string };

type DataQuality = {
  bank_rows_total?: number;
  bank_rows_in_period?: number;
  bank_rows_out_of_period?: number;
  sources_present?: string[];
  warnings?: string[];
};

type KurganSignal = {
  code: string;
  status: "OK" | "WARN" | "MISSING" | "UNKNOWN";
  score: number;
  weight?: number;
  rationale_tr?: string;
  evidence_refs?: Array<{ artifact_id: string; note?: string }>;
  missing_refs?: Array<{ code: string; title_tr: string; severity: "LOW" | "MEDIUM" | "HIGH"; how_to_fix_tr?: string }>;
};

type RiskMeta = { code?: string; severity?: string; title?: string; note?: string };

type RiskDetailContract = {
  risk?: RiskMeta;
  downloads?: { pdf_latest?: string; bundle_latest?: string };

  period_window?: PeriodWindow;
  data_quality?: DataQuality;
  kurgan_criteria_signals?: KurganSignal[];

  enriched_data?: {
    period_window?: PeriodWindow;
    data_quality?: DataQuality;
    kurgan_criteria_signals?: KurganSignal[];
  };
};


type Props = { code: string };

export default function RiskDetailClient({ code }: Props) {
  const normalized = useMemo(() => (code || "").toUpperCase(), [code]);
  const [data, setData] = useState<any>(null);
  const [ctx, setCtx] = useState<unknown | null>(null);


  // --- Context-aware KURGAN layer (non-breaking) ---
  const dataAny = data as any;
  const ctxAny = ctx as any;

  const ctxPeriodWindow =
    ctxAny?.period_window ??
    ctxAny?.data?.period_window ??
    ctxAny?.payload?.period_window ??
    null;

  const ctxDataQuality =
    ctxAny?.data_quality ??
    ctxAny?.data?.data_quality ??
    ctxAny?.payload?.data_quality ??
    null;

  const ctxRisks =
    (((ctxAny?.metrics || {})?.rules || {})?.risks) ??
    ctxAny?.risks ??
    ctxAny?.items ??
    ctxAny?.data?.risks ??
    ctxAny?.payload?.risks ??
    [];

  const ctxMatch = Array.isArray(ctxRisks)
    ? ctxRisks.find((r: any) => String(r?.code || r?.rule_id || "").toUpperCase() === String(code).toUpperCase())
    : null;

  const periodWindow =
    dataAny?.period_window ??
    dataAny?.enriched_data?.period_window ??
    ctxPeriodWindow ??
    null;

  const dataQuality =
    dataAny?.data_quality ??
    dataAny?.enriched_data?.data_quality ??
    ctxDataQuality ??
    null;

  const kurganSignals =
    dataAny?.kurgan_criteria_signals ??
    dataAny?.enriched_data?.kurgan_criteria_signals ??
    ctxMatch?.kurgan_criteria_signals ??
    ctxMatch?.kurganSignals ??
    null;

  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function run() {
      try {
        setErr(null);
        setData(null);

        

        // Context: period_window / data_quality / (varsa) kurgan sinyalleri
        (async () => {
          try {
            const r2 = await fetch("/api/risk", { cache: "no-store" });
            if (r2.ok) {
              const j2 = await r2.json();
              setCtx(j2);
              return;
            }
          } catch {}

          // Fallback: portfolio contract
          try {
            const r3 = await fetch("/api/v1/contracts/portfolio", { cache: "no-store" });
            if (r3.ok) {
              const j3 = await r3.json();
              setCtx(j3);
            }
          } catch {}
        })();
// Proxy route: /api/v1/contracts/...
        const res = await fetch(`/api/v1/contracts/risks/${encodeURIComponent(normalized)}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${res.statusText} :: ${t.slice(0, 300)}`);
        }

        const json = await res.json();
        if (alive) setData(json);
      } catch (e: unknown) {
        if (alive) setErr(e?.message || String(e));
      }
    }
    if (normalized) run();
    return () => {
      alive = false;
    };
  }, [normalized]);

  return (
    <div style={{ padding: 16 }}>
      {(periodWindow || dataQuality) ? (
        <div className="mb-4">
          <DataQualityBand periodWindow={periodWindow} dataQuality={dataQuality} />
        </div>
      ) : null}

      {Array.isArray(kurganSignals) && kurganSignals.length ? (
        <div className="mb-4">
          <KurganCriteriaPanel signals={kurganSignals} />
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Risk Detay: {normalized}</h1>
        <a href="/v1" style={{ fontSize: 12, textDecoration: "underline" }}>← V1</a>
      </div>

      {err && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #f5c2c7", borderRadius: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Hata</div>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{err}</pre>
        </div>
      )}

      {!err && !data && (
        <div style={{ marginTop: 12, opacity: 0.8 }}>Yükleniyor…</div>
      )}

      {data && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
            Şimdilik “Ham JSON”. Bir sonraki adımda kartlar/tablo/checklist/dossier paneline dönüştüreceğiz.
          </div>
          <pre style={{
            whiteSpace: "pre-wrap",
            padding: 12,
            borderRadius: 8,
            border: "1px solid rgba(0,0,0,0.15)",
            margin: 0
          }}>
{JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
