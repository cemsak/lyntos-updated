'use client';

import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { RiskFactor, RiskLevel } from './types';

interface RiskFactorCardProps {
  factor: RiskFactor;
  defaultExpanded?: boolean;
}

const SEVERITY_DOT: Record<RiskLevel, string> = {
  kritik: 'bg-[#cd3d64]',
  yuksek: 'bg-[#e56f4a]',
  orta: 'bg-[#f5a623]',
  dusuk: 'bg-[#0caf60]',
};

export function RiskFactorCard({ factor, defaultExpanded = false }: RiskFactorCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-[#e3e8ee] dark:border-[#2d3343] rounded-md bg-white dark:bg-[#1a1f2e] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-[#f6f9fc] dark:hover:bg-[#0a0d14] transition-colors"
      >
        {/* Severity dot */}
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${SEVERITY_DOT[factor.seviye]}`} />

        {/* Code */}
        <span className="font-mono text-[13px] font-semibold text-[#1a1f36] dark:text-white w-20 flex-shrink-0">
          {factor.kod}
        </span>

        {/* Title */}
        <span className="flex-1 text-[14px] text-[#1a1f36] dark:text-white truncate">
          {factor.baslik}
        </span>

        {/* Multiplier */}
        {factor.multiplier > 1 && (
          <span className="text-[13px] font-semibold text-[#cd3d64]">
            {factor.multiplier.toFixed(1)}x
          </span>
        )}

        {/* Chevron */}
        <ChevronRight
          className={`w-4 h-4 text-[#697386] transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-[#e3e8ee] dark:border-[#2d3343]">
          {/* Values row */}
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#697386] mb-1">
                Mevcut Deger
              </div>
              <div className="text-[14px] font-semibold text-[#1a1f36] dark:text-white">
                {factor.deger}{factor.birim ? ` ${factor.birim}` : ''}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#697386] mb-1">
                Esik Deger
              </div>
              <div className="text-[14px] font-semibold text-[#1a1f36] dark:text-white">
                {factor.esik}{factor.birim ? ` ${factor.birim}` : ''}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-3 p-2 bg-[#f6f9fc] dark:bg-[#0a0d14] rounded text-[13px] text-[#697386]">
            {factor.aciklama}
          </div>
        </div>
      )}
    </div>
  );
}
