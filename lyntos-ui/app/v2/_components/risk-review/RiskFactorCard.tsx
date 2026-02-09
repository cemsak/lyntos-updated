'use client';

import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { RiskFactor, RiskLevel } from './types';

interface RiskFactorCardProps {
  factor: RiskFactor;
  defaultExpanded?: boolean;
}

const SEVERITY_DOT: Record<RiskLevel, string> = {
  kritik: 'bg-[#F0282D]',
  yuksek: 'bg-[#FA841E]',
  orta: 'bg-[#FFB114]',
  dusuk: 'bg-[#00A651]',
};

export function RiskFactorCard({ factor, defaultExpanded = false }: RiskFactorCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-[#E5E5E5] rounded-md bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-[#F5F6F8] transition-colors"
      >
        {/* Severity dot */}
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${SEVERITY_DOT[factor.seviye]}`} />

        {/* Code */}
        <span className="font-mono text-[13px] font-semibold text-[#2E2E2E] w-20 flex-shrink-0">
          {factor.kod}
        </span>

        {/* Title */}
        <span className="flex-1 text-[14px] text-[#2E2E2E] truncate">
          {factor.baslik}
        </span>

        {/* Multiplier */}
        {factor.multiplier > 1 && (
          <span className="text-[13px] font-semibold text-[#F0282D]">
            {factor.multiplier.toFixed(1)}x
          </span>
        )}

        {/* Chevron */}
        <ChevronRight
          className={`w-4 h-4 text-[#5A5A5A] transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-[#E5E5E5]">
          {/* Values row */}
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#5A5A5A] mb-1">
                Mevcut Deger
              </div>
              <div className="text-[14px] font-semibold text-[#2E2E2E]">
                {factor.deger}{factor.birim ? ` ${factor.birim}` : ''}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#5A5A5A] mb-1">
                Esik Deger
              </div>
              <div className="text-[14px] font-semibold text-[#2E2E2E]">
                {factor.esik}{factor.birim ? ` ${factor.birim}` : ''}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-3 p-2 bg-[#F5F6F8] rounded text-[13px] text-[#5A5A5A]">
            {factor.aciklama}
          </div>
        </div>
      )}
    </div>
  );
}
