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
// SAHTE VERİ YASAK - riskLevel yoksa yeşil (success) DEĞİL gri (neutral) göster
function getCardVariant(status: string, riskLevel?: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (status !== 'ok') return 'neutral';
  if (riskLevel) {
    const level = riskLevel.toLowerCase();
    if (level === 'dusuk' || level === 'low' || level === 'tamam' || level === 'ok') return 'success';
    if (level === 'orta' || level === 'medium' || level === 'bekliyor' || level === 'uyarı' || level === 'uyari') return 'warning';
    if (level === 'yuksek' || level === 'high' || level === 'eksik' || level === 'kritik') return 'danger';
    if (level === 'aktif' || level === 'active') return 'info';
  }
  // SIFIR TÖLERANS: risk_level yoksa yeşil kart YANLIŞ!
  // API'den açıkça durum gelmeden başarılı gibi gösterme
  return 'neutral';
}

// Get gradient and border classes based on variant (Kartela Uyumlu)
function getVariantStyles(variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral') {
  const styles = {
    success: {
      bg: 'bg-gradient-to-br from-[#ECFDF5] to-[#AAE8B8]',
      border: 'border-[#6BDB83]',
      title: 'text-[#00804D]',
      badge: 'bg-[#00A651] text-white',
      link: 'text-[#00804D]',
    },
    warning: {
      bg: 'bg-gradient-to-br from-[#FFFBEB] to-[#FFE045]',
      border: 'border-[#FFCE19]',
      title: 'text-[#E67324]',
      badge: 'bg-[#FFB114] text-[#2E2E2E]',
      link: 'text-[#E67324]',
    },
    danger: {
      bg: 'bg-gradient-to-br from-[#FEF2F2] to-[#FFC7C9]',
      border: 'border-[#FF9196]',
      title: 'text-[#BF192B]',
      badge: 'bg-[#F0282D] text-white',
      link: 'text-[#BF192B]',
    },
    info: {
      bg: 'bg-gradient-to-br from-[#E6F9FF] to-[#ABEBFF]',
      border: 'border-[#5ED6FF]',
      title: 'text-[#0049AA]',
      badge: 'bg-[#0078D0] text-white',
      link: 'text-[#0049AA]',
    },
    neutral: {
      bg: 'bg-gradient-to-br from-[#F5F6F8] to-[#E5E5E5]',
      border: 'border-[#B4B4B4]',
      title: 'text-[#5A5A5A]',
      badge: 'bg-[#969696] text-white',
      link: 'text-[#5A5A5A]',
    },
  };
  return styles[variant];
}

// Get badge text based on status and risk level
// SAHTE VERİ YASAK - riskLevel yoksa "OK" DEĞİL "---" göster
function getBadgeText(status: string, riskLevel?: string): string {
  if (status === 'loading') return 'Yükleniyor';
  if (status === 'error') return 'Hata';
  if (status === 'empty') return '---';
  if (status === 'missing') return '---';
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
    if (level === 'uyarı' || level === 'uyari') return 'Uyarı';
    return riskLevel;
  }
  // SIFIR TÖLERANS: risk_level yoksa varsayılan "OK" YANLIŞ!
  // API'den açıkça "ok/tamam" gelmeden "OK" gösterme
  return '---';
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
          <div className="text-[clamp(1.25rem,4vw,1.875rem)] font-black text-[#2E2E2E] font-mono tabular-nums leading-tight truncate">
            {status === 'ok' && formattedValue ? (
              <>
                {formattedValue.display}
                {formattedValue.unit && (
                  <span className="text-[clamp(0.75rem,2vw,1rem)] ml-1 font-semibold text-[#5A5A5A]">
                    {formattedValue.unit}
                  </span>
                )}
              </>
            ) : (
              <span className="text-[#969696]">—</span>
            )}
          </div>

          {/* Full value tooltip */}
          {showFullValue && formattedValue && formattedValue.display !== formattedValue.full && (
            <div className="absolute left-0 -bottom-8 z-50 bg-[#2E2E2E] text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
              {formattedValue.full} {formattedValue.unit}
            </div>
          )}
        </div>

        {/* Label */}
        <div className="text-[10px] sm:text-xs text-[#5A5A5A] mt-1 line-clamp-1">
          {status === 'ok' && data?.label ? data.label : reason_tr || 'Veri bekleniyor'}
        </div>

        {/* Footer: Neden?/Detay Link */}
        <div className="mt-auto pt-2">
          {onClick ? (
            // onClick varsa "Detay" göster - özel modal açılacak (RiskSkoruDetay gibi)
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className={`text-[10px] sm:text-xs font-semibold ${styles.link} hover:underline`}
            >
              Detay →
            </button>
          ) : (analysis.expert || analysis.ai || legal_basis_refs.length > 0) ? (
            // onClick yoksa ve analiz varsa "Neden?" göster - ExplainModal açılacak
            <button
              onClick={handleExplainClick}
              className={`text-[10px] sm:text-xs font-semibold ${styles.link} hover:underline`}
            >
              Neden? →
            </button>
          ) : (
            <span className="text-[10px] text-[#969696]">—</span>
          )}
        </div>
      </div>

      {/* Explain Modal - sadece onClick olmayan kartlar için */}
      {!onClick && (
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
      )}
    </>
  );
}
