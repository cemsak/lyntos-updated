'use client';
import React, { useState } from 'react';
import type { PanelEnvelope } from '../contracts/envelope';
import { ExplainModal } from './ExplainModal';
import { formatKpiValue, type FormattedNumber } from './formatters';

export interface KpiData {
  value: number | string;
  label: string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  risk_level?: string;
}

interface KpiCardProps {
  title: string;
  envelope: PanelEnvelope<KpiData>;
  icon?: string;
  onRefresh?: () => void;
  onClick?: () => void;
  compact?: boolean;
}

// Determine card variant based on status and risk level
function getCardVariant(status: string, riskLevel?: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (status !== 'ok') return 'neutral';
  if (riskLevel) {
    const level = riskLevel.toLowerCase();
    if (level === 'dusuk' || level === 'low' || level === 'tamam' || level === 'ok') return 'success';
    if (level === 'orta' || level === 'medium' || level === 'bekliyor') return 'warning';
    if (level === 'yuksek' || level === 'high' || level === 'eksik' || level === 'kritik') return 'danger';
    if (level === 'aktif' || level === 'active') return 'info';
  }
  return 'success';
}

// Get gradient and border classes based on variant
function getVariantStyles(variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral') {
  const styles = {
    success: {
      bg: 'bg-gradient-to-br from-emerald-50 to-green-100',
      border: 'border-emerald-200',
      title: 'text-emerald-700',
      badge: 'bg-emerald-500 text-white',
      link: 'text-emerald-600',
    },
    warning: {
      bg: 'bg-gradient-to-br from-amber-50 to-orange-100',
      border: 'border-amber-200',
      title: 'text-amber-700',
      badge: 'bg-amber-500 text-white',
      link: 'text-amber-600',
    },
    danger: {
      bg: 'bg-gradient-to-br from-red-50 to-rose-100',
      border: 'border-red-200',
      title: 'text-red-700',
      badge: 'bg-red-500 text-white',
      link: 'text-red-600',
    },
    info: {
      bg: 'bg-gradient-to-br from-blue-50 to-indigo-100',
      border: 'border-blue-200',
      title: 'text-blue-700',
      badge: 'bg-blue-500 text-white',
      link: 'text-blue-600',
    },
    neutral: {
      bg: 'bg-gradient-to-br from-slate-50 to-slate-100',
      border: 'border-slate-200',
      title: 'text-slate-600',
      badge: 'bg-slate-400 text-white',
      link: 'text-slate-500',
    },
  };
  return styles[variant];
}

// Get badge text based on status and risk level
function getBadgeText(status: string, riskLevel?: string): string {
  if (status === 'loading') return 'Yükleniyor';
  if (status === 'error') return 'Hata';
  if (status === 'empty') return '---';
  if (riskLevel) {
    const level = riskLevel.toLowerCase();
    if (level === 'dusuk' || level === 'low') return 'Düşük';
    if (level === 'orta' || level === 'medium') return 'Orta';
    if (level === 'yuksek' || level === 'high') return 'Yüksek';
    if (level === 'tamam' || level === 'ok') return 'Tamam';
    if (level === 'eksik') return 'Eksik';
    if (level === 'bekliyor') return 'Bekliyor';
    if (level === 'aktif' || level === 'active') return 'Aktif';
    if (level === 'pasif' || level === 'inactive') return 'Pasif';
    if (level === 'kritik') return 'Kritik';
    return riskLevel;
  }
  return 'OK';
}

export function KpiCard({ title, envelope, icon, onClick }: KpiCardProps) {
  const [showExplain, setShowExplain] = useState(false);
  const [showFullValue, setShowFullValue] = useState(false);
  const { status, reason_tr, data, analysis, trust, legal_basis_refs, evidence_refs } = envelope;

  const variant = getCardVariant(status, data?.risk_level);
  const styles = getVariantStyles(variant);
  const badgeText = getBadgeText(status, data?.risk_level);

  // Format the value
  const formattedValue: FormattedNumber | null = data
    ? formatKpiValue(data.value, data.unit)
    : null;

  const handleExplainClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowExplain(true);
  };

  const handleValueHover = () => {
    if (formattedValue && formattedValue.display !== formattedValue.full) {
      setShowFullValue(true);
    }
  };

  return (
    <>
      <div
        className={`
          ${styles.bg} rounded-xl p-3 sm:p-4 border-2 ${styles.border}
          transition-all duration-200 hover:-translate-y-1 hover:shadow-lg
          min-h-[100px] flex flex-col justify-between
          ${onClick ? 'cursor-pointer' : ''}
        `}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-1 mb-2">
          <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wide ${styles.title} line-clamp-2 leading-tight`}>
            {title}
          </span>
          <span className={`text-[9px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap ${styles.badge}`}>
            {badgeText}
          </span>
        </div>

        {/* Value - with clamp typography and tooltip */}
        <div
          className="relative group"
          onMouseEnter={handleValueHover}
          onMouseLeave={() => setShowFullValue(false)}
        >
          <div className="text-[clamp(1.25rem,4vw,1.875rem)] font-black text-slate-800 font-mono tabular-nums leading-tight truncate">
            {status === 'ok' && formattedValue ? (
              <>
                {formattedValue.display}
                {formattedValue.unit && (
                  <span className="text-[clamp(0.75rem,2vw,1rem)] ml-1 font-semibold text-slate-600">
                    {formattedValue.unit}
                  </span>
                )}
              </>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </div>

          {/* Full value tooltip */}
          {showFullValue && formattedValue && formattedValue.display !== formattedValue.full && (
            <div className="absolute left-0 -bottom-8 z-50 bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
              {formattedValue.full} {formattedValue.unit}
            </div>
          )}
        </div>

        {/* Label */}
        <div className="text-[10px] sm:text-xs text-slate-500 mt-1 line-clamp-1">
          {status === 'ok' && data?.label ? data.label : reason_tr || 'Veri bekleniyor'}
        </div>

        {/* Footer: Neden? Link */}
        <div className="mt-auto pt-2">
          {(analysis.expert || analysis.ai || legal_basis_refs.length > 0) ? (
            <button
              onClick={handleExplainClick}
              className={`text-[10px] sm:text-xs font-semibold ${styles.link} hover:underline`}
            >
              Neden? →
            </button>
          ) : (
            <span className="text-[10px] text-slate-400">—</span>
          )}
        </div>
      </div>

      {/* Explain Modal */}
      <ExplainModal
        isOpen={showExplain}
        onClose={() => setShowExplain(false)}
        title={title}
        analysis={analysis}
        trust={trust}
        legalBasisRefs={legal_basis_refs}
        evidenceRefs={evidence_refs}
        meta={envelope.meta}
      />
    </>
  );
}
