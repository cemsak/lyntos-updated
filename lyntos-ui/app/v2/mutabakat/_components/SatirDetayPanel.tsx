'use client';
import React from 'react';
import { X } from 'lucide-react';
import { RootCauseTag } from './RootCauseTag';
import { EvidenceBlocks } from './EvidenceBlocks';
import { SmmmKararDropdown } from './SmmmKararDropdown';
import { useEvidenceSearch } from '../_hooks/useEvidenceSearch';
import type { EnrichedMutabakatSatir, SmmmKarar } from '../_types/cariMutabakat';
import { ROOT_CAUSE_CONFIG, MUTABAKAT_TOLERANS_TL } from '../_types/cariMutabakat';

interface SatirDetayPanelProps {
  satir: EnrichedMutabakatSatir | null;
  clientId: string;
  periodId: string;
  onClose: () => void;
  onKararChange: (hesapKodu: string, karar: SmmmKarar, not: string) => void;
  formatTL: (val: number) => string;
}

/**
 * Sag slide-over panel: Satir detayi + kanitlar + SMMM karari.
 *
 * Satir tiklandiginda acilir, 4 kanit blogu paralel yuklenir.
 */
export function SatirDetayPanel({
  satir,
  clientId,
  periodId,
  onClose,
  onKararChange,
  formatTL,
}: SatirDetayPanelProps) {
  const { evidence } = useEvidenceSearch({
    hesapKodu: satir?.hesap_kodu || null,
    karsiTaraf: satir?.karsi_taraf || satir?.hesap_adi || null,
    clientId,
    periodId,
    enabled: !!satir,
  });

  if (!satir) return null;

  const rootCauseConfig = ROOT_CAUSE_CONFIG[satir.rootCause.neden];
  const farkKritik = satir.fark > MUTABAKAT_TOLERANS_TL;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div role="dialog" aria-modal="true" aria-label="Satır detayı" className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5] bg-[#F5F6F8]">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-[#2E2E2E] truncate">
              {satir.hesap_kodu}
            </h3>
            <p className="text-sm text-[#969696] truncate">
              {satir.karsi_taraf || satir.hesap_adi || '-'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#E5E5E5] transition-colors ml-3"
          >
            <X className="w-5 h-5 text-[#969696]" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Fark Ozeti */}
          <div className="bg-[#F5F6F8] rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-[#5A5A5A]">Fark Ozeti</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-lg p-3 border border-[#E5E5E5]">
                <p className="text-xs text-[#969696] mb-1">Mizan Bakiye</p>
                <p className="font-semibold text-[#2E2E2E] font-mono">
                  {formatTL(satir.mizan_bakiye)}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-[#E5E5E5]">
                <p className="text-xs text-[#969696] mb-1">Ekstre Bakiye</p>
                <p className="font-semibold text-[#2E2E2E] font-mono">
                  {formatTL(satir.ekstre_bakiye)}
                </p>
              </div>
              <div
                className={`rounded-lg p-3 border ${
                  farkKritik
                    ? 'bg-[#FEF2F2] border-[#FFC7C9]'
                    : 'bg-[#ECFDF5] border-[#AAE8B8]'
                }`}
              >
                <p className="text-xs text-[#969696] mb-1">Fark</p>
                <p
                  className={`font-semibold font-mono ${
                    farkKritik ? 'text-[#BF192B]' : 'text-[#00804D]'
                  }`}
                >
                  {formatTL(satir.fark)}
                  {satir.fark_yuzde > 0 && (
                    <span className="text-xs ml-1">(%{satir.fark_yuzde.toFixed(1)})</span>
                  )}
                </p>
              </div>
            </div>

            {/* Root Cause */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#969696]">Otomatik neden:</span>
              <RootCauseTag neden={satir.rootCause.neden} />
              <span className="text-xs text-[#969696] italic">
                ({satir.rootCause.guvenilirlik})
              </span>
            </div>
            <p className="text-xs text-[#5A5A5A]">{rootCauseConfig.uzunAciklama}</p>

            {/* Supheli Alacak Uyarisi */}
            {satir.supheli_alacak_riski && (
              <div className="bg-[#FEF2F2] border border-[#FF9196] rounded-lg p-3">
                <p className="text-xs font-semibold text-[#BF192B]">
                  VUK Md. 323 — Supheli Alacak Uyarisi
                </p>
                <p className="text-xs text-[#BF192B] mt-1">
                  Bu alacak {satir.aging_gun} gundur tahsil edilememiş. Supheli ticari alacak
                  karsiligi (TDHP 128/129) ayrilmasi degerlendirilmelidir.
                </p>
              </div>
            )}
          </div>

          {/* Kanitlar */}
          <EvidenceBlocks evidence={evidence} formatTL={formatTL} />

          {/* SMMM Karari */}
          <SmmmKararDropdown
            currentKarar={satir.smmmKarar}
            onKararChange={(karar, not) => onKararChange(satir.hesap_kodu, karar, not)}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E5E5E5] bg-[#F5F6F8]">
          <div className="flex items-center justify-between text-xs text-[#969696]">
            <span>
              Aging: {satir.aging_gun > 0 ? `${satir.aging_gun} gun` : '-'} |
              Durum: {satir.durum}
            </span>
            {satir.onaylayan && (
              <span>
                Onaylayan: {satir.onaylayan} ({satir.onay_tarihi})
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
