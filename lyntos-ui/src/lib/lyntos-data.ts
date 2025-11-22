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

// /api/risk varsa oradan veri çeker; yoksa otomatik MOCK döner
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
  } catch {
    // sessizce mock'a düş
  }
  const mockTrend = Array.from({ length: 8 }).map((_, i) => ({
    period: `2025-0${i + 1}`,
    score: Math.round(55 + 15 * Math.sin(i / 1.8)),
  }));
  const mock: RiskRecord = {
    firma: params.firma,
    donem: params.donem,
    risk_skoru: 72,
    seviyeler: { SMİYB: 0.68, KURGAN: 0.74, RADAR: 0.65 },
    uyarilar: ["Nakit hareketlerinde anomali", "Cari hesap eşleşmesi zayıf"],
    trend: mockTrend,
    anomalies: [
      { label: "Nakit", value: 18 },
      { label: "Cari", value: 12 },
      { label: "POS", value: 9 },
      { label: "Fatura", value: 7 },
    ],
    timestamp: new Date().toISOString(),
  };
  return mock;
}
