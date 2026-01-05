'use client';

import type { DashboardData, ExplainData } from './types';
import { getHumanError, getSeverityStyles } from './utils/errorMessages';

// ════════════════════════════════════════════════════════════════════════════
// KPI GRID - 6-8 Key Performance Indicator Cards
// Enterprise-grade error handling with humanized messages
// ════════════════════════════════════════════════════════════════════════════

interface KpiGridProps {
  data: DashboardData | null;
  errors: Record<string, string>;
  onExplain: (data: ExplainData) => void;
  onRetry?: () => void;
}

// CRITICAL: Never show "0" for missing data - use "—" instead
function formatValue(value: number | null | undefined, suffix?: string): string {
  if (value === null || value === undefined || !isFinite(value)) return '—';
  const formatted = new Intl.NumberFormat('tr-TR').format(Math.round(value));
  return suffix ? `${formatted}${suffix}` : formatted;
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || !isFinite(value)) return '—';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !isFinite(value)) return '—';
  return `%${Math.round(value * 100) / 100}`;
}

// Status color based on score
function getScoreColor(score: number | null | undefined, thresholds?: { good: number; warn: number }): string {
  if (score === null || score === undefined) return 'text-gray-400';
  const t = thresholds || { good: 80, warn: 60 };
  if (score >= t.good) return 'text-green-600';
  if (score >= t.warn) return 'text-yellow-600';
  return 'text-red-600';
}

interface KpiCardProps {
  title: string;
  value: string;
  subtitle: string;
  color?: string;
  error?: string;
  onExplain?: () => void;
  onRetry?: () => void;
}

function KpiCard({ title, value, subtitle, color = 'text-gray-900', error, onExplain, onRetry }: KpiCardProps) {
  if (error) {
    const humanError = getHumanError(error);
    const styles = getSeverityStyles(humanError.severity);

    return (
      <div className={`${styles.bg} border ${styles.border} rounded-lg p-4`}>
        <p className={`text-xs ${styles.text} mb-1 opacity-70`}>{title}</p>
        <p className="text-xl font-mono font-bold text-gray-400">—</p>
        <p className={`text-xs ${styles.text} mt-1`}>{humanError.message}</p>
        {humanError.canRetry && onRetry && (
          <button
            onClick={onRetry}
            className={`text-xs ${styles.text} font-medium hover:underline mt-2 flex items-center gap-1`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Yeniden Dene</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition">
      <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">{title}</p>
      <p className={`text-2xl font-mono font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      {onExplain && (
        <button
          onClick={onExplain}
          className="text-xs text-blue-600 hover:underline mt-2 flex items-center gap-1"
        >
          <span>Neden?</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function KpiGrid({ data, errors, onExplain }: KpiGridProps) {
  // Extract values from data
  const kurganScore = data?.kurgan?.data?.kurgan_risk?.score;
  const q2Tax = data?.quarterlyTax?.data?.Q2?.payable;
  const completenessScore = data?.dataQuality?.data?.completeness_score;
  const yearEndProfit = data?.quarterlyTax?.data?.year_end_projection?.estimated_annual_profit;
  const corporateTax = data?.corporateTax?.data?.hesaplanan_vergi;
  const inflationRate = data?.inflation?.data?.tufe_endeksi?.artis_orani;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* 1. KURGAN Risk Score */}
      <KpiCard
        title="KURGAN Risk"
        value={formatValue(kurganScore)}
        subtitle="VDK 13 kriter"
        color={getScoreColor(kurganScore)}
        error={errors.kurgan}
        onExplain={() => {
          const expert = data?.kurgan?.data?.kurgan_risk?.analysis?.expert;
          onExplain({
            title: 'KURGAN Risk Skoru',
            score: kurganScore,
            reason: expert?.reason_tr || 'VDK 13 kriter bazli risk degerlendirmesi.',
            method: expert?.method,
            legal_basis: expert?.legal_basis_refs?.[0] || 'SRC-0034',
            legal_basis_refs: expert?.legal_basis_refs || ['SRC-0034'],
            evidence_refs: expert?.evidence_refs || [],
            trust_score: expert?.trust_score || 1.0
          });
        }}
      />

      {/* 2. Q2 Gecici Vergi */}
      <KpiCard
        title="Q2 Gecici Vergi"
        value={formatCurrency(q2Tax)}
        subtitle="Odenecek"
        color="text-gray-900"
        error={errors.quarterlyTax}
        onExplain={() => {
          const expert = data?.quarterlyTax?.data?.analysis?.expert;
          onExplain({
            title: 'Q2 Gecici Vergi',
            score: q2Tax,
            reason: expert?.reason_tr || 'Ceyreklik kar uzerinden hesaplanan gecici vergi.',
            method: expert?.method,
            legal_basis: expert?.legal_basis_refs?.[0] || 'SRC-0023',
            legal_basis_refs: expert?.legal_basis_refs || ['SRC-0023'],
            evidence_refs: expert?.evidence_refs || [],
            trust_score: expert?.trust_score || 1.0
          });
        }}
      />

      {/* 3. Veri Kalitesi */}
      <KpiCard
        title="Veri Kalitesi"
        value={formatPercent(completenessScore)}
        subtitle="Tamlik skoru"
        color={getScoreColor(completenessScore)}
        error={errors.dataQuality}
        onExplain={() => {
          onExplain({
            title: 'Veri Kalitesi',
            score: completenessScore,
            reason: 'Donem icindeki belge tamliginin yuzdesi. Eksik belgeler skoru dusurur.',
            legal_basis: 'SRC-0046',
            legal_basis_refs: ['SRC-0046'],
            evidence_refs: ['data_quality_report.json'],
            trust_score: 1.0
          });
        }}
      />

      {/* 4. Yil Sonu Tahmini */}
      <KpiCard
        title="Yil Sonu Tahmini"
        value={formatCurrency(yearEndProfit)}
        subtitle="Kar Tahmini"
        color="text-gray-900"
        error={errors.quarterlyTax}
        onExplain={() => {
          const projection = data?.quarterlyTax?.data?.year_end_projection;
          onExplain({
            title: 'Yil Sonu Kar Tahmini',
            score: yearEndProfit,
            reason: `Mevcut ceyrek verileri baz alinarak yillik kar tahmini. Guven: ${projection?.confidence || '-'}`,
            legal_basis: 'SRC-0023',
            legal_basis_refs: ['SRC-0023'],
            evidence_refs: ['quarterly_projections.json'],
            trust_score: 1.0
          });
        }}
      />

      {/* 5. Kurumlar Vergisi */}
      <KpiCard
        title="Kurumlar Vergisi"
        value={formatCurrency(corporateTax)}
        subtitle="5520 KVK"
        color="text-gray-900"
        error={errors.corporateTax}
        onExplain={() => {
          onExplain({
            title: 'Kurumlar Vergisi',
            score: corporateTax,
            reason: 'Mali kar uzerinden %25 oraninda hesaplanan kurumlar vergisi.',
            legal_basis: 'SRC-0023',
            legal_basis_refs: ['SRC-0023'],
            evidence_refs: ['corporate_tax_calc.json'],
            trust_score: 1.0
          });
        }}
      />

      {/* 6. Enflasyon Etkisi */}
      <KpiCard
        title="Enflasyon Etkisi"
        value={formatPercent(inflationRate)}
        subtitle="TMS 29 TUFE"
        color={inflationRate && inflationRate > 20 ? 'text-red-600' : 'text-gray-900'}
        error={errors.inflation}
        onExplain={() => {
          const tufe = data?.inflation?.data?.tufe_endeksi;
          onExplain({
            title: 'Enflasyon Duzeltme Etkisi',
            score: inflationRate,
            reason: `TUFE katsayisi: ${tufe?.katsayi?.toFixed(4) || '-'}. Donem: ${tufe?.donem || '-'}`,
            method: 'TMS 29 uygulamasi',
            legal_basis: 'SRC-0006',
            legal_basis_refs: ['SRC-0006', 'SRC-0008'],
            evidence_refs: ['tufe_endeks.json'],
            trust_score: 1.0
          });
        }}
      />
    </div>
  );
}

export default KpiGrid;
