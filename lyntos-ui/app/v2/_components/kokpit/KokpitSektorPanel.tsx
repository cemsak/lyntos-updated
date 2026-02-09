'use client';

/**
 * Kokpit Sektör Paneli
 * Sektör Ortalamaları + TCMB Güncel Göstergeler
 * VdkHeader'dan ayıklanmış, kokpite özel optimize edilmiş
 */

import React from 'react';
import Link from 'next/link';
import {
  Building2,
  Tag,
  TrendingUp,
  DollarSign,
  Percent,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import type { SektorBilgisi, TcmbVerileri } from '../../_hooks/useVdkFullAnalysis';

interface KokpitSektorPanelProps {
  sektorBilgisi: SektorBilgisi | null | undefined;
  tcmbVerileri: TcmbVerileri | null | undefined;
  isLoading?: boolean;
}

export function KokpitSektorPanel({
  sektorBilgisi,
  tcmbVerileri,
  isLoading = false,
}: KokpitSektorPanelProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-48 bg-[#F5F6F8] rounded-2xl animate-pulse" />
        <div className="h-48 bg-[#F5F6F8] rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!sektorBilgisi && !tcmbVerileri) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Sektör Bilgisi Kartı - LYNTOS Blue Gradient */}
      {sektorBilgisi && (
        <div className="bg-gradient-to-br from-[#E6F9FF] via-[#ABEBFF]/30 to-[#E6F9FF] border border-[#0078D0]/20 rounded-2xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 bg-gradient-to-br from-[#0049AA] to-[#0078D0] rounded-xl flex items-center justify-center shadow-lg shadow-[#0049AA]/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-[#0049AA] bg-[#E6F9FF] px-2 py-0.5 rounded">
                  {sektorBilgisi.nace_kodu}
                </span>
                <span className="text-[#5A5A5A] font-semibold text-sm truncate">
                  {sektorBilgisi.nace_adi}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-[#969696]">
                <Tag className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{sektorBilgisi.sektor_adi}</span>
                {sektorBilgisi.vergi_dairesi && (
                  <>
                    <span className="flex-shrink-0">•</span>
                    <span className="truncate">VD: {sektorBilgisi.vergi_dairesi}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sektör Ortalamaları Grid */}
          <div className="space-y-2">
            {/* Likidite + Karlılık */}
            <div className="grid grid-cols-5 gap-1.5">
              <MetricCell
                label="Cari Oran"
                value={sektorBilgisi.cari_oran}
                format="percent"
              />
              <MetricCell
                label="Asit Test"
                value={sektorBilgisi.asit_test_orani}
                format="percent"
              />
              <MetricCell
                label="Net Kâr"
                value={sektorBilgisi.net_kar_marji}
                format="percent1"
              />
              <MetricCell
                label="Brüt Kâr"
                value={sektorBilgisi.brut_kar_marji}
                format="percent"
              />
              <MetricCell
                label="ROA"
                value={sektorBilgisi.roa}
                format="percent1"
              />
            </div>

            {/* Finansal Yapı + Devir Hızları */}
            <div className="grid grid-cols-5 gap-1.5">
              <MetricCell
                label="Borç/Aktif"
                value={sektorBilgisi.yabanci_kaynak_aktif}
                format="percent"
              />
              <MetricCell
                label="Özkaynak"
                value={sektorBilgisi.ozkaynak_aktif}
                format="percent"
              />
              <MetricCell
                label="Alacak DH"
                value={sektorBilgisi.alacak_devir_hizi}
                format="ratio"
              />
              <MetricCell
                label="Borç DH"
                value={sektorBilgisi.borc_devir_hizi}
                format="ratio"
              />
              <MetricCell
                label="Vergi Yükü"
                value={sektorBilgisi.sektor_vergi_yuku}
                format="percent1"
                highlight
              />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-3 pt-2 border-t border-[#0078D0]/20 text-[10px] text-[#0078D0] flex items-center gap-1">
            <RefreshCw className="w-2.5 h-2.5" />
            {sektorBilgisi.kaynak || 'TCMB EVDS + GİB'}
            {sektorBilgisi.veri_yili && <span>• {sektorBilgisi.veri_yili}</span>}
          </div>
        </div>
      )}

      {/* TCMB Güncel Göstergeler Kartı - LYNTOS Green Gradient */}
      {tcmbVerileri && (
        <div className="bg-gradient-to-br from-[#ECFDF5] via-[#ECFDF5]/30 to-[#ECFDF5] border border-[#00A651]/20 rounded-2xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 bg-gradient-to-br from-[#00A651] to-[#6BDB83] rounded-xl flex items-center justify-center shadow-lg shadow-[#00A651]/20">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-[#5A5A5A] font-bold">TCMB Güncel Göstergeler</div>
              <div className="text-[10px] text-[#969696] flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5" />
                {tcmbVerileri.bulten_tarihi
                  ? `Bülten: ${tcmbVerileri.bulten_tarihi}`
                  : tcmbVerileri.guncelleme_zamani
                    ? new Date(tcmbVerileri.guncelleme_zamani).toLocaleString('tr-TR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })
                    : 'Güncel'}
                <span className="ml-1 text-[#00A651]">• {tcmbVerileri.kaynak}</span>
              </div>
            </div>
          </div>

          {/* Döviz Kurları + Oranlar Grid */}
          <div className="grid grid-cols-5 gap-2">
            <TcmbCell
              label="USD"
              value={tcmbVerileri.usd_kuru}
              icon={<DollarSign className="w-2.5 h-2.5" />}
            />
            <TcmbCell label="EUR" value={tcmbVerileri.eur_kuru} />
            <TcmbCell label="GBP" value={tcmbVerileri.gbp_kuru} />
            <TcmbCell
              label="Faiz"
              value={tcmbVerileri.politika_faizi}
              format="percentWhole"
              icon={<Percent className="w-2.5 h-2.5" />}
            />
            <TcmbCell
              label="Enflasyon"
              value={tcmbVerileri.enflasyon_yillik}
              format="percent1"
            />
          </div>

          {/* Alt satır - SMMM için önemli oranlar */}
          <div className="mt-3 pt-2 border-t border-[#00A651]/20 flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-4 text-[#969696]">
              {tcmbVerileri.gecikme_faizi_aylik != null && (
                <span>
                  Gecikme Faizi:{' '}
                  <span className="font-semibold text-[#5A5A5A]">
                    %{(tcmbVerileri.gecikme_faizi_aylik * 100).toFixed(1)}/ay
                  </span>
                </span>
              )}
              {tcmbVerileri.reeskont_faizi != null && (
                <span>
                  Reeskont:{' '}
                  <span className="font-semibold text-[#5A5A5A]">
                    %{(tcmbVerileri.reeskont_faizi * 100).toFixed(0)}
                  </span>
                </span>
              )}
            </div>
            <Link
              href="https://www.tcmb.gov.tr/kurlar/kurlar.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00A651] hover:text-[#00804D] flex items-center gap-1 transition-colors"
            >
              TCMB Günlük Kur Bülteni
              <ExternalLink className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components

function MetricCell({
  label,
  value,
  format = 'percent',
  highlight = false,
}: {
  label: string;
  value: number | null | undefined;
  format?: 'percent' | 'percent1' | 'ratio';
  highlight?: boolean;
}) {
  if (value == null) return null;

  let displayValue: string;
  if (format === 'percent') {
    displayValue = `${(value * 100).toFixed(0)}%`;
  } else if (format === 'percent1') {
    displayValue = `${(value * 100).toFixed(1)}%`;
  } else {
    displayValue = `${value.toFixed(1)}x`;
  }

  const baseClasses = 'rounded-lg p-1.5 text-center';
  const colorClasses = highlight
    ? 'bg-[#FFFBEB] border border-[#FFB114]/30'
    : 'bg-white/60';
  const textClasses = highlight ? 'text-[#E67324]' : 'text-[#0049AA]';
  const labelClasses = highlight ? 'text-[#FFB114]' : 'text-[#969696]';

  return (
    <div className={`${baseClasses} ${colorClasses}`}>
      <div className={`text-[9px] ${labelClasses}`}>{label}</div>
      <div className={`font-bold text-sm ${textClasses}`}>{displayValue}</div>
    </div>
  );
}

function TcmbCell({
  label,
  value,
  format = 'currency',
  icon,
}: {
  label: string;
  value: number | null | undefined;
  format?: 'currency' | 'percentWhole' | 'percent1';
  icon?: React.ReactNode;
}) {
  let displayValue: string;
  if (value == null) {
    displayValue = '-';
  } else if (format === 'currency') {
    displayValue = value.toFixed(2);
  } else if (format === 'percentWhole') {
    displayValue = `%${(value * 100).toFixed(0)}`;
  } else {
    displayValue = `%${(value * 100).toFixed(1)}`;
  }

  return (
    <div className="bg-white/60 rounded-lg p-2 text-center">
      <div className="text-[10px] text-[#969696] flex items-center justify-center gap-0.5">
        {icon}
        {label}
      </div>
      <div className="font-bold text-[#00A651]">{displayValue}</div>
    </div>
  );
}

export default KokpitSektorPanel;
