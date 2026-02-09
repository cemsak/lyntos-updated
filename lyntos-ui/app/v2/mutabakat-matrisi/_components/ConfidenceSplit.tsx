'use client';

import React from 'react';
import type { ConfidenceSplit as ConfidenceSplitType } from '../_types/crossCheck';

interface ConfidenceSplitProps {
  confidence: ConfidenceSplitType;
  compact?: boolean;
}

function barColor(score: number): string {
  if (score >= 80) return 'bg-[#00A651]';
  if (score >= 50) return 'bg-[#FFB114]';
  return 'bg-[#F0282D]';
}

export function ConfidenceSplitDisplay({ confidence, compact = false }: ConfidenceSplitProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-1.5 bg-[#E5E5E5] rounded-full overflow-hidden">
            <div className={`h-full ${barColor(confidence.kapsam)}`} style={{ width: `${confidence.kapsam}%` }} />
          </div>
          <span className="text-[10px] text-[#969696]">K:{confidence.kapsam}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-1.5 bg-[#E5E5E5] rounded-full overflow-hidden">
            <div className={`h-full ${barColor(confidence.eslestirme)}`} style={{ width: `${confidence.eslestirme}%` }} />
          </div>
          <span className="text-[10px] text-[#969696]">E:{confidence.eslestirme}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-[10px] text-[#969696] uppercase tracking-wide mb-1">Kapsam Guveni</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-[#E5E5E5] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${barColor(confidence.kapsam)}`}
                style={{ width: `${confidence.kapsam}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-[#5A5A5A] w-8 text-right">
              {confidence.kapsam}%
            </span>
          </div>
        </div>
        <div className="flex-1">
          <div className="text-[10px] text-[#969696] uppercase tracking-wide mb-1">Eslestirme Guveni</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-[#E5E5E5] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${barColor(confidence.eslestirme)}`}
                style={{ width: `${confidence.eslestirme}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-[#5A5A5A] w-8 text-right">
              {confidence.eslestirme}%
            </span>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-[#969696] italic">{confidence.aciklama}</p>
    </div>
  );
}
