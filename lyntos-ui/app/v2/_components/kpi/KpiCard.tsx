'use client';
import React, { useState } from 'react';
import type { PanelEnvelope } from '../contracts/envelope';
import { ExplainModal } from './ExplainModal';

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
  const { status, reason_tr, data, analysis, trust, legal_basis_refs, evidence_refs } = envelope;

  const variant = getCardVariant(status, data?.risk_level);
  const styles = getVariantStyles(variant);
  const badgeText = getBadgeText(status, data?.risk_level);

  const handleExplainClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowExplain(true);
  };

  return (
    <>
      <div
        className={`${styles.bg} rounded-xl p-4 border-2 ${styles.border} transition-all duration-200 hover:-translate-y-1 hover:shadow-lg h-[120px] overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-black uppercase tracking-wide ${styles.title}`}>
            {title}
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${styles.badge}`}>
            {badgeText}
          </span>
        </div>

        {/* Value */}
        <div className="text-3xl font-black text-slate-800 font-mono">
          {status === 'ok' && data ? (
            <>
              {data.value}
              {data.unit && <span className="text-lg ml-1">{data.unit}</span>}
            </>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </div>

        {/* Label */}
        <div className="text-xs text-slate-500 mt-1">
          {status === 'ok' && data?.label ? data.label : reason_tr || 'Veri bekleniyor'}
        </div>

        {/* Neden? Link */}
        <div className="mt-2">
          {(analysis.expert || analysis.ai || legal_basis_refs.length > 0) ? (
            <button
              onClick={handleExplainClick}
              className={`text-xs font-semibold ${styles.link} hover:underline`}
            >
              Neden? →
            </button>
          ) : (
            <span className="text-xs text-slate-400">—</span>
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
