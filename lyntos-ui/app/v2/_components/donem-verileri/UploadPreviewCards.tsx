'use client';

import React, { useMemo } from 'react';
import { CheckCircle2, Upload, Circle } from 'lucide-react';
import type { BelgeTipi, BelgeDurumData } from './types';
import { BELGE_TANIMLARI } from './types';
import { useDonemVerileriV2 } from './useDonemVerileriV2';

interface UploadPreviewCardsProps {
  onUploadClick?: (tip: BelgeTipi) => void;
}

interface RequiredDocItem {
  tip: BelgeTipi;
  label: string;
  status: 'zorunlu' | 'onerilen' | 'opsiyonel';
  durum?: 'VAR' | 'EKSIK' | 'BEKLIYOR';
}

// Tam analiz için gerekli belgeler - gerçek tanımlardan
// Label override: bazı belgelerin UI'da farklı isimle gösterilmesi için
const REQUIRED_DOC_TIPS: Array<{ tip: BelgeTipi; status: 'zorunlu' | 'onerilen' | 'opsiyonel'; labelOverride?: string }> = [
  { tip: 'mizan_ayrintili', status: 'zorunlu' },
  { tip: 'e_defter_yevmiye', status: 'zorunlu' },
  { tip: 'e_defter_kebir', status: 'zorunlu' },
  { tip: 'beyan_kdv', status: 'zorunlu', labelOverride: 'Dönem Beyannameleri' },
  { tip: 'banka_ekstresi', status: 'zorunlu' },
  { tip: 'e_fatura_listesi', status: 'opsiyonel' },
];

const STATUS_CONFIG = {
  zorunlu: { text: 'Zorunlu', className: 'text-[#BF192B] bg-[#FEF2F2]' },
  onerilen: { text: 'Önerilen', className: 'text-[#FA841E] bg-[#FFFBEB]' },
  opsiyonel: { text: 'Opsiyonel', className: 'text-[#969696] bg-[#F5F6F8]' },
};

export function UploadPreviewCards({ onUploadClick }: UploadPreviewCardsProps) {
  // Backend'den gerçek veri al
  const { data, isLoading } = useDonemVerileriV2();

  // Belge durumlarını map'e çevir
  const belgeDurumMap = useMemo(() => {
    const map = new Map<BelgeTipi, BelgeDurumData['durum']>();
    for (const belge of data.belgeler) {
      map.set(belge.tip, belge.durum);
    }
    return map;
  }, [data.belgeler]);

  // Gerekli belgeler listesini oluştur
  const requiredDocs = useMemo<RequiredDocItem[]>(() => {
    return REQUIRED_DOC_TIPS.map(({ tip, status, labelOverride }) => {
      const tanim = BELGE_TANIMLARI[tip];
      return {
        tip,
        label: labelOverride || tanim?.ad || tip,
        status,
        durum: belgeDurumMap.get(tip),
      };
    });
  }, [belgeDurumMap]);

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="bg-[#F5F6F8] rounded-lg h-40" />
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white border border-[#E5E5E5] rounded-lg p-3">
        <h4 className="font-medium text-[#2E2E2E] text-sm mb-3">
          Tam Analiz İçin Gerekli Belgeler
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {requiredDocs.map((doc, idx) => {
            const statusConfig = STATUS_CONFIG[doc.status];
            const isUploaded = doc.durum === 'VAR';

            return (
              <button
                key={doc.tip}
                type="button"
                onClick={() => onUploadClick?.(doc.tip)}
                disabled={!onUploadClick}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all text-left group
                  ${isUploaded
                    ? 'bg-[#ECFDF5]/50 border-[#AAE8B8] hover:bg-[#ECFDF5]'
                    : 'bg-[#F5F6F8] border-[#E5E5E5] hover:bg-[#F5F6F8] hover:border-[#B4B4B4]'
                  }
                  disabled:cursor-default disabled:hover:bg-[#F5F6F8]`}
              >
                {/* Status icon */}
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
                  ${isUploaded ? 'bg-[#ECFDF5]' : 'bg-[#E5E5E5]'}`}
                >
                  {isUploaded ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00804D]" />
                  ) : (
                    <Circle className="w-3 h-3 text-[#969696]" />
                  )}
                </div>

                {/* Label */}
                <span className={`flex-1 text-xs truncate ${isUploaded ? 'text-[#00804D]' : 'text-[#5A5A5A]'}`}>
                  {doc.label}
                </span>

                {/* Status badge */}
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusConfig.className} flex-shrink-0`}>
                  {statusConfig.text}
                </span>

                {/* Upload hint on hover - sadece eksik olanlar için */}
                {!isUploaded && onUploadClick && (
                  <Upload className="w-3.5 h-3.5 text-[#0078D0] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Özet */}
        <div className="mt-3 pt-2 border-t border-[#E5E5E5] flex items-center justify-between text-xs">
          <span className="text-[#969696]">
            {requiredDocs.filter(d => d.durum === 'VAR').length} / {requiredDocs.length} belge yüklendi
          </span>
          {requiredDocs.filter(d => d.status === 'zorunlu' && d.durum !== 'VAR').length > 0 && (
            <span className="text-[#BF192B] font-medium">
              {requiredDocs.filter(d => d.status === 'zorunlu' && d.durum !== 'VAR').length} zorunlu belge eksik
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
