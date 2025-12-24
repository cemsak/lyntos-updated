import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const entity =
    u.searchParams.get("firma") || u.searchParams.get("entity") || "OZKANLAR";
  const period =
    u.searchParams.get("donem") || u.searchParams.get("period") || "2025-Q3";

  const payload: any;

  const base = (process.env.BACKEND_URL ?? "http://127.0.0.1:8010").replace(/\/+$/, "");
  const qs = `?firma=${encodeURIComponent(entity)}&donem=${encodeURIComponent(period)}`;
  let res = await fetch(`${base}/api/analyze${qs}`, { cache: "no-store" });
  if (!res.ok)
    res = await fetch(`${base}/analyze${qs}`, { cache: "no-store" });
  if (!res.ok)
    return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
  payload = await res.json();

  const out: any = {
    summary: payload?.summary || `${entity} | Dönem: ${period}`,
    parts: payload?.parts ?? {
      kurgan: Number(payload?.kurgan?.risk_skoru) || 0,
      smiyb: Number(payload?.sahte_fatura_riski?.skor) || 0,
      beyan: Number(payload?.vergi_uyum_endeksi) || 0,
      nakit: Number(payload?.nakit_puani) || 0,
      diger: Number(payload?.diger_puani) || 0,
    },
    trend: Array.isArray(payload?.trend)
      ? payload.trend
      : Array.isArray(payload?.risk_log)
        ? payload.risk_log.map((r: any) => ({ date: r.donem, score: r.skor }))
        : [],
    radarContribs: Array.isArray(payload?.radarContribs)
      ? payload.radarContribs
      : Array.isArray(payload?.radar?.nedenler)
        ? payload.radar.nedenler.map((n: any, i: number) => ({
            label: n?.label || `Neden ${i + 1}`,
            value: Number(n?.value) || 0,
          }))
        : [],
    bankHeat: Array.isArray(payload?.bankHeat) ? payload.bankHeat : [],
  };

  const bank = {
    totalBalance: Number(payload?.banka?.toplam_bakiye) || 0,
    dailyFlow: Number(payload?.banka?.gunluk_nakit_akisi) || 0,
    accountCount: Number(payload?.banka?.hesap_sayisi) || 0,
    accounts: Array.isArray(payload?.banka?.detaylar)
      ? payload.banka.detaylar
      : [],
  };

  const book = {
    balanced:
      typeof payload?.luca?.mizan?.dengeli === "boolean"
        ? payload.luca.mizan.dengeli
        : null,
    debitTotal: Number(payload?.luca?.mizan?.borc_toplam) || 0,
    creditTotal: Number(payload?.luca?.mizan?.alacak_toplam) || 0,
    accountCount: Number(payload?.luca?.mizan?.toplam_hesap) || 0,
  };

  const returns = Array.isArray(payload?.beyanname_ozeti)
    ? payload.beyanname_ozeti.map((x: any) => ({
        name: x.ad,
        status: x.durum,
        risk: x.risk,
      }))
    : [];

  const bankLine = (
    Array.isArray(payload?.bankHeat) ? payload.bankHeat : out.bankHeat || []
  ).map((b: any) => ({ day: b.day, delta: b.delta }));

  const smiybPanel = {
    score:
      Number(payload?.sahte_fatura_riski?.skor) ||
      Number(out?.parts?.smiyb) ||
      0,
    status: payload?.sahte_fatura_riski?.durum || "",
    reasons: Array.isArray(payload?.sahte_fatura_riski?.nedenler)
      ? payload.sahte_fatura_riski.nedenler
      : [],
    counterparties: Array.isArray(payload?.karsi_firma)
      ? payload.karsi_firma
      : [],
  };

  const vdk_uzmani_yorumu = payload?.vdk_uzmani_yorumu ?? null;
  const ai_analizi = payload?.ai_analizi ?? null;

  return NextResponse.json(
    {
      ...out,
      bank,
      book,
      returns,
      bankLine,
      smiybPanel,
      vdk_uzmani_yorumu,
      ai_analizi,
      filters: { entity, period },
    },
    { status: 200 },
  );
}