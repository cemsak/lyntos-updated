'use client';

import React from 'react';
import { Badge } from '../../_components/shared/Badge';
import { RootCauseTag } from './RootCauseTag';
import { ConfidenceSplitDisplay } from './ConfidenceSplit';
import type { EnrichedCrossCheck, RootCause } from '../_types/crossCheck';
import { ROOT_CAUSE_CONFIG } from '../_types/crossCheck';

interface RootCauseTabProps {
  check: EnrichedCrossCheck;
  onRootCauseChange?: (neden: RootCause) => void;
}

const POSSIBLE_CAUSES: RootCause[] = [
  'UYUMLU',
  'VERI_EKSIK',
  'YAPISAL_FARK',
  'ZAMANLAMA_FARKI',
  'HESAPLAMA_HATASI',
  'BILINMEYEN',
];

export function RootCauseTab({ check, onRootCauseChange }: RootCauseTabProps) {
  return (
    <div className="space-y-6">
      {/* Detected root cause */}
      <div>
        <h4 className="text-xs font-semibold text-[#969696] uppercase tracking-wide mb-2">Tespit Edilen Neden</h4>
        <div className="bg-[#F5F6F8] rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <RootCauseTag neden={check.rootCause.neden} />
            <Badge
              variant={check.rootCause.guvenilirlik === 'kesin' ? 'success' : 'warning'}
              size="xs"
              style="soft"
            >
              {check.rootCause.guvenilirlik === 'kesin' ? 'Kesin Tespit' : 'Tahmini'}
            </Badge>
          </div>
          <p className="text-sm text-[#5A5A5A]">{check.rootCause.aciklama}</p>
        </div>
      </div>

      {/* Root cause description */}
      <div>
        <h4 className="text-xs font-semibold text-[#969696] uppercase tracking-wide mb-2">Neden Aciklamasi</h4>
        <p className="text-sm text-[#5A5A5A] bg-[#F5F6F8] rounded-lg p-3">
          {ROOT_CAUSE_CONFIG[check.rootCause.neden].aciklama}
        </p>
      </div>

      {/* Other possible causes (SMMM can override) */}
      {onRootCauseChange && (
        <div>
          <h4 className="text-xs font-semibold text-[#969696] uppercase tracking-wide mb-2">
            Diger Olasi Nedenler (SMMM secebilir)
          </h4>
          <div className="flex flex-wrap gap-2">
            {POSSIBLE_CAUSES.filter(c => c !== check.rootCause.neden).map(cause => (
              <button
                key={cause}
                onClick={() => onRootCauseChange(cause)}
                className="px-3 py-1.5 text-xs font-medium bg-[#F5F6F8] text-[#5A5A5A] rounded-lg hover:bg-[#E5E5E5] transition-colors"
              >
                {ROOT_CAUSE_CONFIG[cause].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Analysis parameters */}
      <div>
        <h4 className="text-xs font-semibold text-[#969696] uppercase tracking-wide mb-2">Analiz Parametreleri</h4>
        <div className="bg-[#F5F6F8] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-[#E5E5E5]">
                <td className="px-3 py-2 text-[#969696] font-medium">Fark Tutari</td>
                <td className="px-3 py-2 text-[#2E2E2E] font-mono">
                  {check.difference.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                </td>
              </tr>
              <tr className="border-b border-[#E5E5E5]">
                <td className="px-3 py-2 text-[#969696] font-medium">Fark Yuzdesi</td>
                <td className="px-3 py-2 text-[#2E2E2E] font-mono">%{check.difference_percent.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-[#E5E5E5]">
                <td className="px-3 py-2 text-[#969696] font-medium">Tolerans (Tutar)</td>
                <td className="px-3 py-2 text-[#2E2E2E] font-mono">±{check.tolerance_amount} TL</td>
              </tr>
              <tr className="border-b border-[#E5E5E5]">
                <td className="px-3 py-2 text-[#969696] font-medium">Tolerans (Yuzde)</td>
                <td className="px-3 py-2 text-[#2E2E2E] font-mono">±%{check.tolerance_percent}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-[#969696] font-medium">Kontrol Durumu</td>
                <td className="px-3 py-2 text-[#2E2E2E]">{check.status.toUpperCase()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Confidence detail */}
      <div>
        <h4 className="text-xs font-semibold text-[#969696] uppercase tracking-wide mb-2">Guven Detayi</h4>
        <ConfidenceSplitDisplay confidence={check.confidence} />
      </div>
    </div>
  );
}
