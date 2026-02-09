'use client';

/**
 * KontrolItem
 * Renders a single expandable kontrol row in the KurumlarVergisiPanel
 */

import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Minus,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  FileText,
} from 'lucide-react';
import type { KurumlarVergisiKontrol, KontrolDurumu, RiskSeviyesi, KontrolTipi } from '../types';

// ── Status & Config Maps ───────────────────────────────────────────────────

const DURUM_ICONS: Record<KontrolDurumu, React.ReactNode> = {
  tamamlandi: <CheckCircle2 className="w-5 h-5 text-[#00804D]" />,
  bekliyor: <Clock className="w-5 h-5 text-[#969696]" />,
  uyari: <AlertTriangle className="w-5 h-5 text-[#FFB114]" />,
  hata: <XCircle className="w-5 h-5 text-[#F0282D]" />,
  uygulanamaz: <Minus className="w-5 h-5 text-[#B4B4B4]" />,
};

const RISK_COLORS: Record<RiskSeviyesi, string> = {
  dusuk: 'bg-[#ECFDF5] text-[#00804D] border-[#AAE8B8]',
  orta: 'bg-[#FFFBEB] text-[#FA841E] border-[#FFF08C]',
  yuksek: 'bg-[#FFFBEB] text-[#FA841E] border-[#FFF08C]',
  kritik: 'bg-[#FEF2F2] text-[#BF192B] border-[#FFC7C9]',
};

const TIP_CONFIG: Record<KontrolTipi, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
  risk: {
    bg: 'bg-[#FEF2F2]',
    text: 'text-[#BF192B]',
    label: 'Risk',
    icon: <TrendingDown className="w-3 h-3" />,
  },
  avantaj: {
    bg: 'bg-[#ECFDF5]',
    text: 'text-[#00804D]',
    label: 'Avantaj',
    icon: <Sparkles className="w-3 h-3" />,
  },
  zorunlu: {
    bg: 'bg-[#E6F9FF]',
    text: 'text-[#0049AA]',
    label: 'Zorunlu',
    icon: <FileText className="w-3 h-3" />,
  },
};

// ── Types ──────────────────────────────────────────────────────────────────

interface KontrolItemProps {
  kontrol: KurumlarVergisiKontrol & { durum: KontrolDurumu };
  isExpanded: boolean;
  onToggle: () => void;
  onKontrolClick?: (kontrolId: string) => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export function KontrolItem({ kontrol, isExpanded, onToggle, onKontrolClick }: KontrolItemProps) {
  const tipConfig = TIP_CONFIG[kontrol.kontrolTipi];

  return (
    <div className="border border-[#E5E5E5] rounded-lg overflow-hidden">
      <div
        className="px-4 py-3 cursor-pointer hover:bg-[#F5F6F8] transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {DURUM_ICONS[kontrol.durum]}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-[#969696]">{kontrol.id}</span>
              <span className={`px-1.5 py-0.5 text-xs rounded flex items-center gap-1 ${tipConfig.bg} ${tipConfig.text}`}>
                {tipConfig.icon}
                {tipConfig.label}
              </span>
              <h4 className="font-medium text-[#2E2E2E] text-sm">
                {kontrol.baslik}
              </h4>
            </div>
            <p className="text-xs text-[#969696] truncate">{kontrol.aciklama}</p>
          </div>

          {/* Potansiyel Tasarruf Badge (Avantaj icin) */}
          {kontrol.potansiyelTasarruf && (
            <span className="hidden sm:inline-block px-2 py-0.5 text-xs bg-[#ECFDF5] text-[#00804D] rounded">
              Tasarruf
            </span>
          )}

          {/* Risk Seviyesi */}
          <span className={`px-2 py-0.5 text-xs font-medium rounded border ${RISK_COLORS[kontrol.riskSeviyesi]}`}>
            {kontrol.riskSeviyesi.toUpperCase()}
          </span>

          {/* VDK Baglantisi */}
          {kontrol.vdkBaglantisi && kontrol.vdkBaglantisi.length > 0 && (
            <span className="hidden sm:inline-block px-1.5 py-0.5 text-xs bg-[#E6F9FF] text-[#0049AA] rounded font-mono">
              VDK
            </span>
          )}

          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-[#969696]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#969696]" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-[#E5E5E5]">
          <div className="bg-[#F5F6F8] rounded-lg p-4 mt-3 space-y-3">
            <div>
              <h5 className="text-xs font-medium text-[#5A5A5A] mb-1">Aciklama</h5>
              <p className="text-sm text-[#5A5A5A]">{kontrol.detayliAciklama}</p>
            </div>

            <div>
              <h5 className="text-xs font-medium text-[#5A5A5A] mb-1">Kontrol Noktalari</h5>
              <ul className="space-y-1">
                {kontrol.kontrolNoktasi.map((nokta, idx) => (
                  <li key={idx} className="text-xs text-[#5A5A5A] flex items-start gap-1">
                    <span className="text-[#969696]">•</span>
                    {nokta}
                  </li>
                ))}
              </ul>
            </div>

            {kontrol.hesaplamaFormulu && (
              <div>
                <h5 className="text-xs font-medium text-[#5A5A5A] mb-1">Hesaplama</h5>
                <code className="text-xs bg-[#E5E5E5] px-2 py-1 rounded text-[#5A5A5A] block">
                  {kontrol.hesaplamaFormulu}
                </code>
              </div>
            )}

            <div>
              <h5 className="text-xs font-medium text-[#5A5A5A] mb-1">Yasal Dayanak</h5>
              <div className="flex flex-wrap gap-1">
                {kontrol.yasalDayanak.map((dayanak, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-[#E6F9FF] text-[#0049AA] px-2 py-0.5 rounded"
                  >
                    {dayanak.kanun} Md.{dayanak.madde}
                  </span>
                ))}
              </div>
            </div>

            {/* Oneriler */}
            {kontrol.oneriler.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-[#00804D] mb-1">Oneriler</h5>
                <ul className="space-y-1">
                  {kontrol.oneriler.map((oneri, idx) => (
                    <li key={idx} className="text-xs text-[#5A5A5A]">• {oneri}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* VDK Baglantisi */}
            {kontrol.vdkBaglantisi && kontrol.vdkBaglantisi.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-[#0049AA] mb-1">VDK Baglantisi</h5>
                <div className="flex gap-1">
                  {kontrol.vdkBaglantisi.map((vdk, idx) => (
                    <span key={idx} className="text-xs bg-[#E6F9FF] text-[#0049AA] px-2 py-0.5 rounded font-mono">
                      {vdk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {kontrol.potansiyelTasarruf && (
              <div className="bg-[#ECFDF5] border border-[#AAE8B8] rounded p-2">
                <h5 className="text-xs font-medium text-[#00804D] mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Potansiyel Tasarruf
                </h5>
                <p className="text-xs text-[#00804D]">{kontrol.potansiyelTasarruf}</p>
              </div>
            )}

            {kontrol.uyarilar.length > 0 && (
              <div className="bg-[#FFFBEB] border border-[#FFF08C] rounded p-2">
                <h5 className="text-xs font-medium text-[#FA841E] mb-1">Dikkat</h5>
                <ul className="space-y-1">
                  {kontrol.uyarilar.map((uyari, idx) => (
                    <li key={idx} className="text-xs text-[#FA841E]">• {uyari}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onKontrolClick?.(kontrol.id);
                }}
                className="px-3 py-1.5 text-xs bg-[#0049AA] text-white rounded hover:bg-[#0049AA] transition-colors"
              >
                Kontrolü Başlat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KontrolItem;
