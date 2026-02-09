'use client';

/**
 * Mevzuat Referans Modal
 * Sprint 9.1 - LYNTOS V2 Big 4 Enhancement
 *
 * Displays full legal references for tax strategies
 * Includes VUK, GVK, KVK, KDVK references with links
 */

import React from 'react';
import {
  Scale,
  X,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import type { YasalDayanak } from './mevzuatData';
import { MEVZUAT_DATABASE, STRATEGY_TO_MEVZUAT } from './mevzuatData';
import { MevzuatReferansCard } from './MevzuatReferansCard';

// Re-export types for backward compatibility
export type { MevzuatTipi, YasalDayanak, OzelgeRef } from './mevzuatData';

interface MevzuatReferansModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategyName: string;
  legalBasis: string;
  yapilanIslem?: string;
  references?: YasalDayanak[];
}

export function MevzuatReferansModal({
  isOpen,
  onClose,
  strategyName,
  legalBasis,
  yapilanIslem,
  references,
}: MevzuatReferansModalProps) {
  if (!isOpen) return null;

  // Strateji için mevzuat referanslarını bul
  const strategyKey = strategyName.toLowerCase().replace(/\s+/g, '-');
  const mevzuatIds = STRATEGY_TO_MEVZUAT[strategyKey] || [];
  const mevzuatList = mevzuatIds
    .map((id) => MEVZUAT_DATABASE[id])
    .filter(Boolean);

  // Eğer references prop'u verilmişse onu kullan
  const displayReferences = references || mevzuatList;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mevzuat-referans-modal-title"
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden"
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0049AA] to-[#0049AA] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 id="mevzuat-referans-modal-title" className="text-[16px] font-bold text-white">Yasal Dayanak</h2>
                <p className="text-[12px] text-white/80">{strategyName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)]">
          {/* Kısa Referans */}
          <div className="flex items-center gap-2 mb-4 p-3 bg-[#F5F6F8] rounded-lg">
            <BookOpen className="w-4 h-4 text-[#969696]" />
            <span className="text-[13px] font-medium text-[#5A5A5A]">
              Temel Dayanak: {legalBasis}
            </span>
          </div>

          {/* Yapılan İşlem */}
          {yapilanIslem && (
            <div className="mb-6 p-4 bg-[#ECFDF5] border border-[#AAE8B8] rounded-xl">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#00804D] mt-0.5" />
                <div>
                  <h4 className="text-[13px] font-semibold text-[#005A46]">
                    Önerilen Uygulama
                  </h4>
                  <p className="text-[12px] text-[#00804D] mt-1">{yapilanIslem}</p>
                </div>
              </div>
            </div>
          )}

          {/* Mevzuat Detayları */}
          {displayReferences.length > 0 ? (
            <div className="space-y-4">
              {displayReferences.map((ref) => (
                <MevzuatReferansCard key={ref.id} reference={ref} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Scale className="w-12 h-12 text-[#B4B4B4] mx-auto mb-3" />
              <p className="text-[13px] text-[#969696]">
                Bu strateji için detaylı mevzuat bilgisi hazırlanıyor.
              </p>
              <p className="text-[11px] text-[#969696] mt-1">
                Temel dayanak: {legalBasis}
              </p>
            </div>
          )}

          {/* Footer - Uyarı */}
          <div className="mt-6 p-4 bg-[#F5F6F8] rounded-xl">
            <p className="text-[10px] text-[#969696] leading-relaxed">
              <strong>Yasal Uyarı:</strong> Bu bilgiler genel bilgilendirme
              amaçlıdır ve profesyonel danışmanlık yerine geçmez. Mevzuat
              sürekli değişmektedir, güncel durumu yetkili mercilerden teyit
              ediniz. Tüm işlemler usulüne uygun belgelendirilmelidir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MevzuatReferansModal;
