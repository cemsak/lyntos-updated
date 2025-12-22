"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ErrorBox, JsonBox, Pill, SectionCard } from "@/components/v1/ui/Atoms";
import R501View from "@/components/v1/risks/R501View";
import R401AView from "@/components/v1/risks/R401AView";
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


export default function RiskDetailClient({ code }: { code: string }) {
  const CODE = (code || "").toUpperCase();

  const [data, setData] = useState<RiskDetailContract | null>(null);

  // --- KURGAN layer (read-only, non-breaking) ---
  const periodWindow = data?.period_window ?? data?.enriched_data?.period_window ?? null;
  const dataQuality = data?.data_quality ?? data?.enriched_data?.data_quality ?? null;
  const kurganSignals = data?.kurgan_criteria_signals ?? data?.enriched_data?.kurgan_criteria_signals ?? null;

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    fetch(`/api/v1/contracts/risks/${encodeURIComponent(CODE)}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
        return r.json();
      })
      .then((j) => {
        if (!alive) return;
        setData(j);
      })
      .catch((e: any) => {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [CODE]);

  const meta = useMemo(() => {
    const risk = data?.risk ?? {};
    return {
      code: risk?.code ?? CODE,
      severity: risk?.severity ?? null,
      title: risk?.title ?? null,
      note: risk?.note ?? null,
    };
  }, [data, CODE]);

  const downloads = data?.downloads ?? {};

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/v1" className="text-sm text-slate-600 hover:underline">
            ← Portföy
          </Link>
          <Pill label={meta.code} />
        </div>

        <a
          href="/api/v1/dossier/bundle"
          className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
        >
          Bundle indir (ZIP)
        </a>
      </div>

      <h1 className="mb-4 text-3xl font-bold">Risk Detayı</h1>

      <SectionCard title="Özet">
        <div className="flex flex-wrap gap-2">
          <Pill label={meta.code} />
          {meta.severity ? <Pill label={`severity: ${meta.severity}`} /> : null}
          {meta.title ? <Pill label={meta.title} /> : null}
        </div>
        {meta.note ? <div className="mt-3 text-sm text-slate-700">{meta.note}</div> : null}
      </SectionCard>

      {loading ? (
        <div className="mt-4 text-sm text-slate-600">Yükleniyor…</div>
      ) : null}

      {err ? (
        <div className="mt-4">
          <ErrorBox title="Veri alınamadı" message={err} />
        </div>
      ) : null}

      {!loading && !err && data ? (
        <div className="mt-4 space-y-4">
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

{CODE === "R-501" ? <R501View contract={data} /> : null}
          {CODE === "R-401A" ? <R401AView contract={data} /> : null}

          {CODE !== "R-501" && CODE !== "R-401A" ? (
            <SectionCard title="Ham JSON (her zaman mevcut)">
              <JsonBox value={data} />
            </SectionCard>
          ) : null}
        </div>
      ) : null}

      {(downloads?.pdf_latest || downloads?.bundle_latest) ? (
        <div className="mt-6 text-xs text-slate-500">
          downloads: {JSON.stringify(downloads)}
        </div>
      ) : null}
    </div>
  );
}
