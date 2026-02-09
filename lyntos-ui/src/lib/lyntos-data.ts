export const revalidate = 0;

export type RiskBreakdown = {
  SMİYB: number;
  KURGAN: number;
  RADAR: number;
};

export type RiskRecord = {
  firma: string;
  donem: string; // örn: "2025-Q3" veya "2025-09"
  risk_skoru: number; // 0-100
  seviyeler: RiskBreakdown;
  uyarilar: string[];
  trend?: Array<{ period: string; score: number }>;
  anomalies?: Array<{ label: string; value: number }>;
  timestamp: string;
};

// /api/risk'ten veri çeker - Mock data YASAK (SMMM güvenliği için)
export async function fetchRiskData(params: {
  firma: string;
  donem: string;
}): Promise<RiskRecord> {
  const qs = new URLSearchParams({ firma: params.firma, donem: params.donem });
  try {
    const res = await fetch(`/api/risk?${qs.toString()}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      return {
        firma: json.firma ?? params.firma,
        donem: json.donem ?? params.donem,
        risk_skoru: Number(json.risk_skoru ?? json.riskScore ?? 0),
        seviyeler: json.seviyeler ?? {
          SMİYB: Number(json.smiyb ?? 0),
          KURGAN: Number(json.kurgan ?? 0),
          RADAR: Number(json.radar ?? 0),
        },
        uyarilar: Array.isArray(json.uyarilar) ? json.uyarilar : [],
        trend: json.trend ?? [],
        anomalies: json.anomalies ?? [],
        timestamp: json.timestamp ?? new Date().toISOString(),
      };
    }
  } catch (error) {
    // API hatası - Mock data YASAK (SMMM'yi yanıltır, Maliye cezası riski)
    console.error('[LYNTOS] Risk verisi yüklenemedi:', error);
    throw new Error('Risk verisi yüklenemedi - API bağlantı hatası');
  }
  // API başarısız yanıt döndü - Mock data YASAK
  throw new Error('Risk verisi yüklenemedi - API yanıt hatası');
}
