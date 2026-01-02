'use client';

import { useState, useEffect } from 'react';

interface KurganRiskData {
  kurgan_risk: {
    score: number;
    risk_level: string;
    warnings: string[];
    action_items: string[];
    criteria_scores: Record<string, number>;
  };
  what_to_do: string;
  time_estimate: string;
  vdk_reference: string;
  effective_date: string;
}

interface KurganRiskCardProps {
  smmmId: string;
  clientId: string;
  period: string;
  compact?: boolean;
}

export default function KurganRiskCard({
  smmmId,
  clientId,
  period,
  compact = false
}: KurganRiskCardProps) {
  const [data, setData] = useState<KurganRiskData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!smmmId || !clientId || !period) return;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          smmm_id: smmmId,
          client_id: clientId,
          period: period
        });

        const res = await fetch(`/api/v1/kurgan-risk?${params}`, {
          cache: 'no-store'
        });

        if (!res.ok) {
          throw new Error(`API failed: ${res.status}`);
        }

        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Bilinmeyen hata');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [smmmId, clientId, period]);

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRiskBg = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-amber-50 border-amber-200';
    if (score >= 40) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  const getRiskIcon = (score: number) => {
    if (score >= 80) return 'OK';
    if (score >= 60) return '?';
    if (score >= 40) return '!';
    return '!!';
  };

  if (loading) {
    return (
      <div className="rounded-2xl border p-4 bg-white">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-slate-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border p-4 bg-red-50 border-red-200">
        <div className="text-sm text-red-800">KURGAN yuklenemedi: {error}</div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const score = data.kurgan_risk.score;

  if (compact) {
    // Compact mode for dashboard KPI cards
    return (
      <div
        className={`rounded-2xl border p-3 cursor-pointer ${getRiskBg(score)}`}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">KURGAN Risk</div>
          <div className="text-xs text-slate-500">VDK 2025</div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className={`text-2xl font-semibold ${getRiskColor(score)}`}>{score}</div>
          <div className={`text-sm font-medium ${getRiskColor(score)}`}>
            {data.kurgan_risk.risk_level}
          </div>
        </div>
        {data.kurgan_risk.warnings.length > 0 && (
          <div className="text-xs text-slate-600 mt-1">
            {data.kurgan_risk.warnings.length} uyari
          </div>
        )}
        <div className="text-xs text-slate-500 mt-1">{data.time_estimate}</div>

        {/* Expanded details */}
        {showDetails && (
          <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
            {data.kurgan_risk.warnings.slice(0, 3).map((w, i) => (
              <div key={i} className="text-xs text-slate-700">
                - {w}
              </div>
            ))}
            <div className="text-xs text-slate-600 mt-2">{data.what_to_do}</div>
          </div>
        )}
      </div>
    );
  }

  // Full mode
  return (
    <div className={`rounded-2xl border p-6 ${getRiskBg(score)}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-lg font-semibold">KURGAN Risk Skoru</div>
          <div className="text-xs text-slate-500">
            VDK Genelgesi {data.vdk_reference} | Mali Milat: {data.effective_date}
          </div>
        </div>
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
            score >= 80
              ? 'bg-green-200 text-green-700'
              : score >= 60
              ? 'bg-amber-200 text-amber-700'
              : score >= 40
              ? 'bg-orange-200 text-orange-700'
              : 'bg-red-200 text-red-700'
          }`}
        >
          {getRiskIcon(score)}
        </div>
      </div>

      {/* Score Display */}
      <div className="flex items-center gap-6 mb-6">
        <div>
          <div className={`text-5xl font-bold ${getRiskColor(score)}`}>
            {score}
            <span className="text-xl text-slate-400">/100</span>
          </div>
        </div>
        <div className="flex-1">
          <div className={`text-xl font-bold ${getRiskColor(score)}`}>
            {data.kurgan_risk.risk_level}
          </div>
          <div className="text-sm text-slate-600 mt-1">{data.what_to_do}</div>
          <div className="text-sm font-medium text-slate-700 mt-2">
            Kontrol suresi: {data.time_estimate}
          </div>
        </div>
      </div>

      {/* Warnings */}
      {data.kurgan_risk.warnings.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-semibold text-slate-700 mb-2">
            Uyarilar ({data.kurgan_risk.warnings.length})
          </div>
          <div className="space-y-2">
            {data.kurgan_risk.warnings.map((w, i) => (
              <div
                key={i}
                className="bg-white bg-opacity-50 rounded-lg p-2 text-sm text-slate-700"
              >
                - {w}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Items */}
      {data.kurgan_risk.action_items.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-semibold text-slate-700 mb-2">
            Yapilacaklar ({data.kurgan_risk.action_items.length})
          </div>
          <div className="space-y-2">
            {data.kurgan_risk.action_items.map((a, i) => (
              <div
                key={i}
                className="bg-green-100 bg-opacity-50 rounded-lg p-2 text-sm text-green-800"
              >
                {i + 1}. {a}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Criteria Scores */}
      {data.kurgan_risk.criteria_scores && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-600">
            Kriter Skorlari (Detay)
          </summary>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(data.kurgan_risk.criteria_scores).map(([key, value]) => (
              <div key={key} className="bg-white bg-opacity-50 rounded-lg p-2">
                <div className="text-xs text-slate-500 capitalize">
                  {key.replace(/_/g, ' ')}
                </div>
                <div
                  className={`text-lg font-bold ${
                    value >= 80
                      ? 'text-green-600'
                      : value >= 50
                      ? 'text-amber-600'
                      : 'text-red-600'
                  }`}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
