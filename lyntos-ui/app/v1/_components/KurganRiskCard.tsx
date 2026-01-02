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

  const getRiskStyles = (score: number) => {
    if (score >= 80) return {
      color: 'text-emerald-600',
      bg: 'bg-emerald-500',
      bgLight: 'bg-emerald-50',
      border: 'border-emerald-200',
      gradient: 'from-emerald-500 to-green-500'
    };
    if (score >= 60) return {
      color: 'text-amber-600',
      bg: 'bg-amber-500',
      bgLight: 'bg-amber-50',
      border: 'border-amber-200',
      gradient: 'from-amber-500 to-yellow-500'
    };
    if (score >= 40) return {
      color: 'text-orange-600',
      bg: 'bg-orange-500',
      bgLight: 'bg-orange-50',
      border: 'border-orange-200',
      gradient: 'from-orange-500 to-red-400'
    };
    return {
      color: 'text-red-600',
      bg: 'bg-red-500',
      bgLight: 'bg-red-50',
      border: 'border-red-200',
      gradient: 'from-red-500 to-rose-500'
    };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="animate-pulse">
          <div className="h-3 bg-slate-200 rounded w-20 mb-3"></div>
          <div className="h-8 bg-slate-200 rounded w-16"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="text-xs text-red-600">Yuklenemedi</div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const score = data.kurgan_risk.score;
  const styles = getRiskStyles(score);

  if (compact) {
    // Compact mode - KPI card style
    return (
      <div
        className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">KURGAN Risk</span>
          <span className="text-[10px] text-slate-400">VDK 2025</span>
        </div>

        <div className="flex items-end gap-2">
          <span className={`text-3xl font-bold ${styles.color}`}>{score}</span>
          <span className="text-sm text-slate-400 mb-1">/100</span>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold text-white ${styles.bg}`}>
            {data.kurgan_risk.risk_level}
          </span>
          {data.kurgan_risk.warnings.length > 0 && (
            <span className="text-[10px] text-slate-500">
              {data.kurgan_risk.warnings.length} uyari
            </span>
          )}
        </div>

        {/* Mini Progress Bar */}
        <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${styles.gradient} transition-all duration-500`}
            style={{ width: `${score}%` }}
          />
        </div>

        {/* Expanded mini details */}
        {showDetails && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
            {data.kurgan_risk.warnings.slice(0, 2).map((w, i) => (
              <div key={i} className="text-[10px] text-slate-600 flex items-start gap-1">
                <span className="text-amber-500 mt-0.5">!</span>
                <span>{w}</span>
              </div>
            ))}
            <div className="text-[10px] text-slate-500 pt-1">{data.time_estimate}</div>
          </div>
        )}
      </div>
    );
  }

  // Full mode - detailed card
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header with gradient */}
      <div className={`bg-gradient-to-r ${styles.gradient} px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">KURGAN Risk Analizi</h3>
            <p className="text-white/70 text-xs mt-0.5">
              VDK {data.vdk_reference}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-white">{score}</div>
            <div className="text-white/70 text-xs">/100 puan</div>
          </div>
        </div>
      </div>

      {/* Score Bar */}
      <div className="px-6 py-3 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center justify-between mb-2">
          <span className={`px-2.5 py-1 rounded-md text-xs font-bold text-white ${styles.bg}`}>
            {data.kurgan_risk.risk_level}
          </span>
          <span className="text-xs text-slate-500">Mali Milat: {data.effective_date}</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${styles.gradient} transition-all duration-500`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* What to do */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Oneri</div>
            <p className="text-sm text-slate-700 mt-0.5">{data.what_to_do}</p>
            <p className="text-xs text-slate-500 mt-1">Tahmini sure: {data.time_estimate}</p>
          </div>
        </div>

        {/* Warnings */}
        {data.kurgan_risk.warnings.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Uyarilar ({data.kurgan_risk.warnings.length})
            </div>
            <div className="space-y-2">
              {data.kurgan_risk.warnings.map((w, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs text-slate-700 bg-amber-50 border border-amber-100 rounded-lg p-2.5"
                >
                  <span className="text-amber-500 font-bold">!</span>
                  <span>{w}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Items */}
        {data.kurgan_risk.action_items.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Yapilacaklar ({data.kurgan_risk.action_items.length})
            </div>
            <div className="space-y-2">
              {data.kurgan_risk.action_items.map((a, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs bg-emerald-50 border border-emerald-100 rounded-lg p-2.5"
                >
                  <span className="w-5 h-5 bg-emerald-200 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-emerald-700">{i + 1}</span>
                  </span>
                  <span className="text-emerald-800 pt-0.5">{a}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Criteria Scores */}
        {data.kurgan_risk.criteria_scores && Object.keys(data.kurgan_risk.criteria_scores).length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
              Kriter Detaylari
              <svg className="w-3 h-3 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {Object.entries(data.kurgan_risk.criteria_scores).map(([key, value]) => {
                const criteriaStyles = getRiskStyles(value as number);
                return (
                  <div key={key} className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                    <div className="text-[10px] text-slate-500 capitalize mb-1">
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${criteriaStyles.color}`}>{value}</span>
                      <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${criteriaStyles.gradient}`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
