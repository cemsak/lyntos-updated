'use client';

import React from 'react';
import type { RiskFactor } from './types';
import { RiskFactorCard } from './RiskFactorCard';

interface RiskInsightsPanelProps {
  factors: RiskFactor[];
  aiOnerisi?: string;
  legalRefs?: string[];
}

export function RiskInsightsPanel({ factors, aiOnerisi, legalRefs }: RiskInsightsPanelProps) {
  const sortedFactors = [...factors].sort((a, b) => b.multiplier - a.multiplier);

  return (
    <div>
      {/* Section Header - Stripe style */}
      <div className="mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
          Risk Faktorleri
        </h3>
        <p className="text-[13px] text-[#8792a2] mt-1">
          Bu skor neden verildi?
        </p>
      </div>

      {/* Factors List */}
      <div className="space-y-2">
        {sortedFactors.length > 0 ? (
          sortedFactors.map((factor, idx) => (
            <RiskFactorCard
              key={factor.id}
              factor={factor}
              defaultExpanded={idx === 0}
            />
          ))
        ) : (
          <div className="p-4 text-center text-[#697386] bg-[#f6f9fc] rounded-md text-[14px]">
            Risk faktoru tespit edilmedi
          </div>
        )}
      </div>

      {/* AI Recommendation */}
      {aiOnerisi && (
        <div className="mt-6 p-4 border border-[#635bff]/20 bg-[#635bff]/5 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-xl">🤖</span>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#635bff] mb-1">
                VERGUS Onerisi
              </div>
              <p className="text-[14px] text-[#1a1f36] leading-relaxed">
                {aiOnerisi}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Legal References */}
      {legalRefs && legalRefs.length > 0 && (
        <div className="mt-4 flex items-center gap-2 text-[12px] text-[#697386]">
          <span>📚</span>
          <span className="font-medium">Yasal Dayanak:</span>
          <span>{legalRefs.join(', ')}</span>
        </div>
      )}
    </div>
  );
}
