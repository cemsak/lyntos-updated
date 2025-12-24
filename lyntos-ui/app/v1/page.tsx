"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchJson } from "./_lib/fetchJson";

type Portfolio = {
  kind: string;
  period_window?: { period?: string; start_date?: string; end_date?: string };
  data_quality?: any;
  warnings?: string[];
  risks?: Array<{
    code: string;
    severity?: string;
    score?: number | null;
    title_tr?: string | null;
    summary_tr?: string | null;
  }>;
};

type Ctx = { smmm: string; client: string; period: string };
const CTX_KEY = "lyntos.v1.ctx";

function safeParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function loadCtx(): Ctx {
  if (typeof window === "undefined") return { smmm: "", client: "", period: "" };
  // tek ana key
  const v = safeParse<Partial<Ctx>>(localStorage.getItem(CTX_KEY));
  const smmm = (v?.smmm ?? "").trim();
  const client = (v?.client ?? "").trim();
  const period = (v?.period ?? "").trim();
  return { smmm, client, period };
}

export default function V1Page() {
  const [ctx, setCtx] = useState<Ctx>(() => loadCtx());
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (ctx.smmm) p.set("smmm", ctx.smmm);
    if (ctx.client) p.set("client", ctx.client);
    if (ctx.period) p.set("period", ctx.period);
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [ctx.smmm, ctx.client, ctx.period]);

  const ctxReady = Boolean(ctx.smmm && ctx.client && ctx.period);

  useEffect(() => {
    try {
      localStorage.setItem(CTX_KEY, JSON.stringify(ctx));
    } catch {}
  }, [ctx]);

  async function loadPortfolio() {
    setErr(null);
    try {
      // primary: backend contract proxy, fallback: static docs
      const data = await fetchJson<Portfolio>(
        `/api/v1/contracts/portfolio${qs}`,
        "/contracts/portfolio.json"
      );
      setPortfolio(data);
      // period boşsa contract'tan dolduralım (tek sefer)
      const contractPeriod = (data as any)?.period_window?.period;
      if (!ctx.period && contractPeriod) {
        setCtx((c) => ({ ...c, period: String(contractPeriod) }));
      }
    } catch (e: any) {
      setErr(e?.message ? String(e.message) : String(e));
    }
  }

  useEffect(() => {
    loadPortfolio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  async function doRefresh() {
    if (!ctxReady) return;
    setRefreshing(true);
    setErr(null);
    try {
      const r = await fetch(`/api/v1/refresh${qs}`, { method: "POST", cache: "no-store" });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(`refresh http ${r.status}: ${t || r.statusText}`);
      }
      await loadPortfolio();
    } catch (e: any) {
      setErr(e?.message ? String(e.message) : String(e));
    } finally {
      setRefreshing(false);
    }
  }

  const pdfHref = ctx.client && ctx.period
    ? `/api/v1/dossier/pdf?client=${encodeURIComponent(ctx.client)}&period=${encodeURIComponent(ctx.period)}`
    : "#";

  const bundleHref = ctx.client && ctx.period
    ? `/api/v1/dossier/bundle?client=${encodeURIComponent(ctx.client)}&period=${encodeURIComponent(ctx.period)}`
    : "#";

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">LYNTOS v1</h1>

        <div className="flex items-center gap-4">
          <button
            className={`px-4 py-2 rounded-full border ${ctxReady ? "" : "opacity-50 cursor-not-allowed"}`}
            onClick={doRefresh}
            disabled={!ctxReady || refreshing}
            title={!ctxReady ? "Refresh için SMMM + Client + Period seçili olmalı" : ""}
          >
            {refreshing ? "Yenileniyor..." : "Yenile (Refresh)"}
          </button>

          <a
            className={`px-2 py-1 ${ctx.client && ctx.period ? "" : "opacity-50 pointer-events-none"}`}
            href={pdfHref}
          >
            PDF indir
          </a>

          <a
            className={`px-2 py-1 ${ctx.client && ctx.period ? "" : "opacity-50 pointer-events-none"}`}
            href={bundleHref}
          >
            Bundle (ZIP)
          </a>
        </div>
      </div>

      <div className="border rounded-2xl p-4 space-y-3">
        <div className="font-semibold">Çalışma Kontexti (zorunlu)</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="space-y-1">
            <div className="text-sm opacity-70">SMMM</div>
            <input
              className="w-full border rounded-xl px-3 py-2"
              value={ctx.smmm}
              onChange={(e) => setCtx((c) => ({ ...c, smmm: e.target.value }))}
              placeholder="Örn: HKOZKAN"
            />
          </label>

          <label className="space-y-1">
            <div className="text-sm opacity-70">Client</div>
            <input
              className="w-full border rounded-xl px-3 py-2"
              value={ctx.client}
              onChange={(e) => setCtx((c) => ({ ...c, client: e.target.value }))}
              placeholder="Örn: OZKAN_KIRTASIYE"
            />
          </label>

          <label className="space-y-1">
            <div className="text-sm opacity-70">Period</div>
            <input
              className="w-full border rounded-xl px-3 py-2"
              value={ctx.period}
              onChange={(e) => setCtx((c) => ({ ...c, period: e.target.value }))}
              placeholder="Örn: 2025-Q2"
            />
          </label>
        </div>

        {!ctxReady ? (
          <div className="text-sm text-orange-600">
            Refresh ve “Risk Detay” sayfasında doğru PDF/ZIP linkleri için SMMM + Client + Period doldurulmalı.
          </div>
        ) : (
          <div className="text-sm text-green-700">
            OK: Kontext hazır. Risk linkleri bu context ile açılacak.
          </div>
        )}
      </div>

      {err ? (
        <div className="border rounded-2xl p-4 text-red-600">
          Veri alınamadı: {err}
        </div>
      ) : null}

      {portfolio ? (
        <div className="border rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="px-3 py-1 rounded-full border">
              period: {portfolio?.period_window?.period ?? ctx.period ?? "-"}
            </span>
            {portfolio?.warnings?.length ? (
              <span className="px-3 py-1 rounded-full border">
                warnings: {portfolio.warnings.length}
              </span>
            ) : null}
          </div>

          <div className="space-y-2">
            {(portfolio.risks ?? []).map((r) => {
              const href = `/v1/risks/${encodeURIComponent(r.code)}${qs}`;
              return (
                <div key={r.code} className="border rounded-2xl p-3 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-semibold">{r.code} — {r.title_tr ?? "-"}</div>
                    <div className="text-sm opacity-70">severity: {r.severity ?? "-"} / score: {String(r.score ?? "-")}</div>
                  </div>
                  <Link className="underline" href={href}>
                    Detay
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="opacity-70">Yükleniyor...</div>
      )}
    </div>
  );
}
