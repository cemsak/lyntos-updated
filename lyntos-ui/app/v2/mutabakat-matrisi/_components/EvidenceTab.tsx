'use client';

import React from 'react';
import { FileWarning } from 'lucide-react';
import type { EnrichedCrossCheck } from '../_types/crossCheck';

interface EvidenceTabProps {
  check: EnrichedCrossCheck;
}

export function EvidenceTab({ check }: EvidenceTabProps) {
  const evidenceEntries = check.evidence ? Object.entries(check.evidence) : [];

  return (
    <div className="space-y-6">
      {/* Evidence table or warning */}
      {evidenceEntries.length === 0 ? (
        <div className="bg-[#FFFBEB] border border-[#FFE045] rounded-lg p-4 text-sm text-[#E67324]">
          <div className="flex items-start gap-3">
            <FileWarning className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">Kanit Bulunamadi</h4>
              <p>Bu kontrol icin kanit bilgisi mevcut degil. Kanitsiz skor yok prensibi geregi fark incelenmelidir.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#F5F6F8] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E5] bg-[#EDEDF0]">
                <th className="px-3 py-2 text-left text-[#969696] font-semibold text-xs uppercase">Alan</th>
                <th className="px-3 py-2 text-left text-[#969696] font-semibold text-xs uppercase">Deger</th>
              </tr>
            </thead>
            <tbody>
              {evidenceEntries.map(([key, value]) => (
                <tr key={key} className="border-b border-[#E5E5E5] last:border-0">
                  <td className="px-3 py-2 text-[#969696] font-medium w-1/3">{key}</td>
                  <td className="px-3 py-2 text-[#2E2E2E] font-mono">
                    {typeof value === 'number'
                      ? value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })
                      : typeof value === 'object'
                        ? JSON.stringify(value, null, 2)
                        : String(value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Source data summary */}
      <div className="border-t border-[#E5E5E5] pt-4">
        <h4 className="text-xs font-semibold text-[#969696] uppercase tracking-wide mb-2">Veri Kaynaklari</h4>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-[#F5F6F8] rounded-lg p-3">
            <div className="text-[#969696] mb-1">Kaynak</div>
            <div className="font-semibold text-[#2E2E2E]">{check.source_label || 'Bilinmiyor'}</div>
            <div className="font-mono text-[#5A5A5A]">
              {check.source_value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
            </div>
          </div>
          <div className="bg-[#F5F6F8] rounded-lg p-3">
            <div className="text-[#969696] mb-1">Hedef</div>
            <div className="font-semibold text-[#2E2E2E]">{check.target_label || 'Bilinmiyor'}</div>
            <div className="font-mono text-[#5A5A5A]">
              {check.target_value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
            </div>
          </div>
        </div>
      </div>

      {/* Legal basis refs (if backend provides) */}
      {/* Placeholder for future legal_basis_refs integration */}
    </div>
  );
}
