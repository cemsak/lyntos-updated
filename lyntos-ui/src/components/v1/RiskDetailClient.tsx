"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { ErrorBox, JsonBox, Pill, SectionCard } from "@/components/v1/ui/Atoms";
import R501View from "@/components/v1/risks/R501View";
import R401AView from "@/components/v1/risks/R401AView";

import { DataQualityBand } from "@/components/risk/DataQualityBand";
import { KurganCriteriaPanel } from "@/components/risk/KurganCriteriaPanel";

type AnyObj = Record<string, unknown>;

type Props = {
  code: string;
  smmm?: string;
  client?: string;
  period?: string;
};

function getLS(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setLS(key: string, val: string): void {
  try {
    localStorage.setItem(key, val);
  } catch {
    // ignore
  }
}

function buildQuery(params: Record<string, string | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && String(v).trim().length) q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export default function RiskDetailClient({ code, smmm, client, period }: Props) {
  const CODE = (code || "").toUpperCase();

  const [data, setData] = useState<AnyObj | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Context: önce URL (props) → sonra localStorage fallback
  const [ctxSmmm, setCtxSmmm] = useState<string | null>(smmm ?? null);
  const [ctxClient, setCtxClient] = useState<string | null>(client ?? null);
  const [ctxPeriod, setCtxPeriod] = useState<string | null>(period ?? null);

  // URL’den geldiyse LS'e yaz (direct open + refresh için kritik)
  useEffect(() => {
    if (smmm) {
      setCtxSmmm(smmm);
      setLS("lyntos_smmm", smmm);
    }
    if (client) {
      setCtxClient(client);
      setLS("lyntos_client", client);
    }
    if (period) {
      setCtxPeriod(period);
      setLS("lyntos_period", period);
    }
  }, [smmm, client, period]);

  // LS fallback (props yoksa)
  useEffect(() => {
    setCtxSmmm((prev) => prev ?? getLS("lyntos_smmm"));
    setCtxClient((prev) => prev ?? getLS("lyntos_client"));
    setCtxPeriod((prev) => prev ?? getLS("lyntos_period"));
  }, []);

  async function loadRisk(): Promise<void> {
    setLoading(true);
    setErr(null);
    try {
      const riskRes = await fetch(`/api/v1/contracts/risks/${encodeURIComponent(CODE)}`, { cache: "no-store" });
      if (!riskRes.ok) {
        const t = await riskRes.text().catch(() => "");
        throw new Error(`HTTP ${riskRes.status} ${riskRes.statusText} :: ${t.slice(0, 300)}`);
      }
      const riskJson = (await riskRes.json()) as AnyObj;
      setData(riskJson);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRisk();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [CODE]);

  const meta = useMemo(() => {
    const d: any = data ?? {};
    const risk = d?.risk ?? d?.data?.risk ?? {};
    return {
      code: risk?.code ?? CODE,
      severity: risk?.severity ?? null,
      title: risk?.title ?? risk?.title_tr ?? null,
      note: risk?.note ?? null,
    };
  }, [data, CODE]);

  const periodWindow = useMemo(() => {
    const d: any = data ?? {};
    return d?.period_window ?? d?.risk?.period_window ?? d?.meta?.period_window ?? null;
  }, [data]);

  const dataQuality = useMemo(() => {
    const d: any = data ?? {};
    return d?.data_quality ?? d?.risk?.data_quality ?? d?.meta?.data_quality ?? null;
  }, [data]);

  const kurganSignals = useMemo(() => {
    const d: any = data ?? {};
    return (
      d?.kurgan_criteria_signals ??
      d?.risk?.kurgan_criteria_signals ??
      d?.enriched_data?.kurgan_criteria_signals ??
      null
    );
  }, [data]);

  const effectivePeriod = ctxPeriod ?? (periodWindow?.period ? String((periodWindow as any).period) : null);

  // Dossier linkleri: backend tarafı client+period ile çalışıyor; smmm varsa ekleriz
  const dossierQuery = buildQuery({
    smmm: ctxSmmm,
    client: ctxClient,
    period: effectivePeriod,
  });

  const bundleHref = `/api/v1/dossier/bundle${dossierQuery}`;
  const pdfHref = `/api/v1/dossier/pdf${dossierQuery}`;

  const refreshMissing = !ctxSmmm || !ctxClient || !effectivePeriod;

  async function onRefresh() {
    const q = buildQuery({ smmm: ctxSmmm, client: ctxClient, period: effectivePeriod });
    if (!q) {
      setErr("Refresh için SMMM + Client + Period gerekli. /v1 sayfasından seçin veya URL'e ?smmm=...&client=...&period=... ekleyin.");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/v1/refresh${q}`, { method: "POST", cache: "no-store" });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`refresh http ${res.status}: ${t.slice(0, 300)}`);
      }
      await loadRisk();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/v1" className="text-sm text-slate-600 hover:underline">
            ← Portföy
          </Link>
          <Pill label={meta.code} />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="rounded border px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            disabled={loading || refreshMissing}
            type="button"
            title={refreshMissing ? "Refresh için smmm+client+period gerekli" : "Refresh"}
          >
            Yenile (Refresh)
          </button>

          <Link className="text-sm text-slate-600 hover:underline" href={pdfHref} target="_blank" rel="noreferrer">
            PDF indir
          </Link>
          <Link className="text-sm text-slate-600 hover:underline" href={bundleHref} target="_blank" rel="noreferrer">
            Bundle (ZIP)
          </Link>
        </div>
      </div>

      <SectionCard title="Özet">
        <div className="flex flex-wrap gap-2">
          <Pill label={meta.code} />
          {meta.severity ? <Pill label={`severity: ${meta.severity}`} /> : null}
          {meta.title ? <Pill label={meta.title} /> : null}
          {effectivePeriod ? <Pill label={`period: ${effectivePeriod}`} /> : null}
        </div>

        {refreshMissing ? (
          <div className="mt-3 text-sm text-amber-700">
            Refresh butonu devre dışı: SMMM + Client + Period bulunamadı. /v1 sayfasında seçin veya URL’e
            {" "}
            <span className="font-mono">?smmm=HKOZKAN&amp;client=OZKAN_KIRTASIYE&amp;period=2025-Q2</span>
            {" "}
            gibi ekleyin.
          </div>
        ) : null}

        {meta.note ? <div className="mt-3 text-sm text-slate-700">{meta.note}</div> : null}
      </SectionCard>

      {loading ? <div className="mt-4 text-sm text-slate-600">Yükleniyor…</div> : null}

      {err ? (
        <div className="mt-4">
          <ErrorBox title="Veri alınamadı" message={err} />
        </div>
      ) : null}

      {!loading && !err && data ? (
        <div className="mt-4 space-y-4">
          {periodWindow || dataQuality ? (
            <div className="mb-4">
              <DataQualityBand periodWindow={periodWindow} dataQuality={dataQuality} />
            </div>
          ) : null}

          {Array.isArray(kurganSignals) && kurganSignals.length ? (
            <div className="mb-4">
              <KurganCriteriaPanel signals={kurganSignals as any} />
            </div>
          ) : null}

          {CODE === "R-501" ? <R501View contract={data as any} /> : null}
          {CODE === "R-401A" ? <R401AView contract={data as any} /> : null}

          {CODE !== "R-501" && CODE !== "R-401A" ? (
            <SectionCard title="Risk Contract (raw)">
              <JsonBox value={data as any} />
            </SectionCard>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
