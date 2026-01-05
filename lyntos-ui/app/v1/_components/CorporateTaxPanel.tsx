"use client";

import React, { useEffect, useState, useMemo } from "react";

type TicariKar = {
  donem_kari: number;
  donem_zarari: number;
  net_donem_kari: number;
};

type MaliKar = {
  ticari_kar: number;
  kanunen_kabul_edilmeyen_giderler: number;
  istisna_kazanclar: number;
  gecmis_donem_zararlari: number;
  mali_kar: number;
};

type CorporateTaxData = {
  ticari_kar: TicariKar;
  mali_kar: MaliKar;
  r_and_d_indirimi: number;
  yatirim_indirimi: number;
  bagis_indirimi: number;
  sponsorluk_indirimi: number;
  kurumlar_vergisi_matrahi: number;
  vergi_orani: number;
  hesaplanan_vergi: number;
  yurtdisi_vergi_mahsubu: number;
  gecici_vergi_mahsubu: number;
  odenecek_vergi: number;
  iade_edilecek_vergi: number;
  kaynak: string;
  trust_score: number;
};

type ForecastData = {
  senaryo: string;
  tahmini_ciro: number;
  tahmini_kar: number;
  tahmini_vergi: number;
  tahmini_net_kar: number;
  ciro_buyume_orani?: number;
  kar_buyume_orani?: number;
  confidence: string;
  aciklama: string;
};

function formatCurrency(n: number | null | undefined): string {
  if (typeof n !== "number" || !isFinite(n)) return "-";
  return n.toLocaleString("tr-TR", { maximumFractionDigits: 0 }) + " TL";
}

function formatPercent(n: number | null | undefined): string {
  if (typeof n !== "number" || !isFinite(n)) return "-";
  return "%" + (n * 100).toFixed(0);
}

type Props = {
  smmmId: string;
  clientId: string;
  period: string;
};

export default function CorporateTaxPanel({ smmmId, clientId, period }: Props) {
  const [taxData, setTaxData] = useState<CorporateTaxData | null>(null);
  const [forecasts, setForecasts] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"beyan" | "ongoru">("beyan");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams({
      smmm_id: smmmId,
      client_id: clientId,
      period: period,
    }).toString();

    const fetchData = async () => {
      try {
        // Fetch corporate tax
        const taxRes = await fetch(`/api/v1/contracts/corporate-tax?${qs}`, { cache: "no-store" });
        if (!taxRes.ok) {
          const txt = await taxRes.text();
          throw new Error(`Kurumlar Vergisi yuklenemedi: ${taxRes.status} ${txt.slice(0, 100)}`);
        }
        const taxJson = await taxRes.json();
        if (alive) setTaxData(taxJson);

        // Fetch forecasts for all scenarios
        const scenarios = ["optimistic", "base", "pessimistic"];
        const forecastResults: ForecastData[] = [];

        for (const scenario of scenarios) {
          const fqs = new URLSearchParams({
            smmm_id: smmmId,
            client_id: clientId,
            period: period,
            scenario: scenario,
          }).toString();

          const fRes = await fetch(`/api/v1/contracts/corporate-tax-forecast?${fqs}`, { cache: "no-store" });
          if (fRes.ok) {
            const fJson = await fRes.json();
            forecastResults.push(fJson);
          }
        }

        if (alive) setForecasts(forecastResults);
      } catch (e: any) {
        if (alive) setError(e?.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchData();
    return () => { alive = false; };
  }, [smmmId, clientId, period]);

  const toplamindirim = useMemo(() => {
    if (!taxData) return 0;
    return (
      taxData.r_and_d_indirimi +
      taxData.yatirim_indirimi +
      taxData.bagis_indirimi +
      taxData.sponsorluk_indirimi
    );
  }, [taxData]);

  if (loading) {
    return (
      <div className="rounded-2xl border p-4">
        <div className="text-sm font-semibold">Kurumlar Vergisi Analizi</div>
        <div className="mt-2 text-sm text-slate-600">Yukleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
        <div className="text-sm font-semibold text-rose-800">Kurumlar Vergisi Analizi</div>
        <div className="mt-2 text-sm text-rose-700">{error}</div>
      </div>
    );
  }

  if (!taxData) {
    return (
      <div className="rounded-2xl border p-4">
        <div className="text-sm font-semibold">Kurumlar Vergisi Analizi</div>
        <div className="mt-2 text-sm text-slate-600">Veri bulunamadi (fail-soft).</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-base font-semibold">Kurumlar Vergisi Analizi</div>
          <div className="text-xs text-slate-600">
            Kaynak: {taxData.kaynak} | Trust Score: {(taxData.trust_score * 100).toFixed(0)}%
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm ${activeTab === "beyan" ? "bg-slate-900 text-white" : "border hover:bg-slate-50"}`}
            onClick={() => setActiveTab("beyan")}
          >
            Beyan Ozeti
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm ${activeTab === "ongoru" ? "bg-slate-900 text-white" : "border hover:bg-slate-50"}`}
            onClick={() => setActiveTab("ongoru")}
          >
            Ongoru
          </button>
        </div>
      </div>

      {activeTab === "beyan" ? (
        <div className="mt-4 space-y-4">
          {/* Ticari Kar */}
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-sm font-semibold text-slate-800">1. Ticari Kar (Gelir Tablosu)</div>
            <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-slate-500">Donem Kari</div>
                <div className="font-medium">{formatCurrency(taxData.ticari_kar.donem_kari)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Donem Zarari</div>
                <div className="font-medium">{formatCurrency(taxData.ticari_kar.donem_zarari)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Net Donem Kari</div>
                <div className="font-semibold">{formatCurrency(taxData.ticari_kar.net_donem_kari)}</div>
              </div>
            </div>
          </div>

          {/* Mali Kar */}
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-sm font-semibold text-slate-800">2. Mali Kar Hesabi</div>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Ticari Kar</span>
                <span>{formatCurrency(taxData.mali_kar.ticari_kar)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">(+) KKEG</span>
                <span>{formatCurrency(taxData.mali_kar.kanunen_kabul_edilmeyen_giderler)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">(-) Istisna Kazanclar</span>
                <span>{formatCurrency(taxData.mali_kar.istisna_kazanclar)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">(-) Gecmis Donem Zararlari</span>
                <span>{formatCurrency(taxData.mali_kar.gecmis_donem_zararlari)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-semibold">
                <span>Mali Kar</span>
                <span>{formatCurrency(taxData.mali_kar.mali_kar)}</span>
              </div>
            </div>
          </div>

          {/* Indirimler */}
          {toplamindirim > 0 ? (
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-800">3. Indirimler</div>
              <div className="mt-2 space-y-1 text-sm">
                {taxData.r_and_d_indirimi > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Ar-Ge Indirimi (GVK Gecici 61)</span>
                    <span>{formatCurrency(taxData.r_and_d_indirimi)}</span>
                  </div>
                )}
                {taxData.yatirim_indirimi > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Yatirim Indirimi</span>
                    <span>{formatCurrency(taxData.yatirim_indirimi)}</span>
                  </div>
                )}
                {taxData.bagis_indirimi > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Bagis Indirimi</span>
                    <span>{formatCurrency(taxData.bagis_indirimi)}</span>
                  </div>
                )}
                {taxData.sponsorluk_indirimi > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Sponsorluk Indirimi</span>
                    <span>{formatCurrency(taxData.sponsorluk_indirimi)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1 font-semibold">
                  <span>Toplam Indirim</span>
                  <span>{formatCurrency(toplamindirim)}</span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Matrah ve Vergi */}
          <div className="rounded-xl bg-emerald-50 p-3">
            <div className="text-sm font-semibold text-emerald-900">4. Vergi Hesabi</div>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-emerald-800">Kurumlar Vergisi Matrahi</span>
                <span className="font-semibold">{formatCurrency(taxData.kurumlar_vergisi_matrahi)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-800">Vergi Orani</span>
                <span>{formatPercent(taxData.vergi_orani)}</span>
              </div>
              <div className="flex justify-between border-t border-emerald-200 pt-1">
                <span className="text-emerald-800">Hesaplanan Vergi</span>
                <span className="font-semibold">{formatCurrency(taxData.hesaplanan_vergi)}</span>
              </div>
            </div>
          </div>

          {/* Mahsuplar */}
          {(taxData.gecici_vergi_mahsubu > 0 || taxData.yurtdisi_vergi_mahsubu > 0) ? (
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-800">5. Mahsuplar</div>
              <div className="mt-2 space-y-1 text-sm">
                {taxData.gecici_vergi_mahsubu > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Gecici Vergi Mahsubu</span>
                    <span>{formatCurrency(taxData.gecici_vergi_mahsubu)}</span>
                  </div>
                )}
                {taxData.yurtdisi_vergi_mahsubu > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Yurtdisi Vergi Mahsubu</span>
                    <span>{formatCurrency(taxData.yurtdisi_vergi_mahsubu)}</span>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Odenecek / Iade */}
          <div className="rounded-xl bg-blue-50 p-3">
            <div className="text-sm font-semibold text-blue-900">6. Sonuc</div>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-blue-700">Odenecek Vergi</div>
                <div className="text-xl font-bold text-blue-900">{formatCurrency(taxData.odenecek_vergi)}</div>
              </div>
              <div>
                <div className="text-xs text-blue-700">Iade Edilecek</div>
                <div className="text-xl font-bold text-blue-900">{formatCurrency(taxData.iade_edilecek_vergi)}</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {forecasts.length === 0 ? (
            <div className="text-sm text-slate-600">Ongoru verisi bulunamadi.</div>
          ) : (
            <>
              <div className="text-xs text-slate-600">
                Gelecek donem projeksiyonu - 3 senaryo analizi
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {forecasts.map((f) => {
                  const isBase = f.senaryo === "base";
                  const bgClass =
                    f.senaryo === "optimistic" ? "bg-emerald-50 border-emerald-200" :
                    f.senaryo === "pessimistic" ? "bg-rose-50 border-rose-200" :
                    "bg-blue-50 border-blue-200";
                  const titleClass =
                    f.senaryo === "optimistic" ? "text-emerald-900" :
                    f.senaryo === "pessimistic" ? "text-rose-900" :
                    "text-blue-900";
                  const label =
                    f.senaryo === "optimistic" ? "Iyimser" :
                    f.senaryo === "pessimistic" ? "Kotumser" :
                    "Baz";

                  return (
                    <div key={f.senaryo} className={`rounded-xl border p-3 ${bgClass}`}>
                      <div className="flex items-center justify-between">
                        <div className={`text-sm font-semibold ${titleClass}`}>{label} Senaryo</div>
                        {isBase && (
                          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] text-white">
                            VARSAYILAN
                          </span>
                        )}
                      </div>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Tahmini Ciro</span>
                          <span className="font-medium">{formatCurrency(f.tahmini_ciro)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Tahmini Kar</span>
                          <span className="font-medium">{formatCurrency(f.tahmini_kar)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Tahmini Vergi</span>
                          <span className="font-semibold">{formatCurrency(f.tahmini_vergi)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span className="text-slate-600">Net Kar</span>
                          <span className="font-bold">{formatCurrency(f.tahmini_net_kar)}</span>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-slate-600">
                        <div className="flex items-center gap-1">
                          <span>Guvenilirlik:</span>
                          <span className={`font-medium ${
                            f.confidence === "high" ? "text-emerald-700" :
                            f.confidence === "medium" ? "text-amber-700" :
                            "text-rose-700"
                          }`}>
                            {f.confidence === "high" ? "Yuksek" :
                             f.confidence === "medium" ? "Orta" :
                             "Dusuk"}
                          </span>
                        </div>
                        {f.ciro_buyume_orani !== undefined && (
                          <div>Ciro Buyume: %{f.ciro_buyume_orani}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <span className="font-semibold">Not:</span> Bu tahminler gecmis donem verilerine dayanmaktadir.
                Ekonomik kosullar, mevzuat degisiklikleri ve sektor dinamikleri sonuclari etkileyebilir.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
