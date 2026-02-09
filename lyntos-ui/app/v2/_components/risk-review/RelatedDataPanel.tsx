'use client';

import React from 'react';
import type { RiskLevel } from './types';

interface PastPeriod {
  donem: string;
  skor: number;
  riskLevel: RiskLevel;
  duzeltme?: boolean;
}

interface Partner {
  ad: string;
  oran: number;
}

interface RelatedDataPanelProps {
  pastPeriods?: PastPeriod[];
  partners?: Partner[];
}

const RISK_DOT: Record<RiskLevel, string> = {
  kritik: 'bg-[#F0282D]',
  yuksek: 'bg-[#FA841E]',
  orta: 'bg-[#FFB114]',
  dusuk: 'bg-[#00A651]',
};

export function RelatedDataPanel({ pastPeriods, partners }: RelatedDataPanelProps) {
  return (
    <div className="space-y-6">
      {/* Past Periods */}
      {pastPeriods && pastPeriods.length > 0 && (
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5A5A] mb-3">
            Gecmis Donemler
          </h4>
          <div className="space-y-1">
            {pastPeriods.map((p) => (
              <div
                key={p.donem}
                className="flex items-center justify-between py-2 border-b border-[#E5E5E5] last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${RISK_DOT[p.riskLevel]}`} />
                  <span className="text-[14px] text-[#2E2E2E]">{p.donem}</span>
                  {p.duzeltme && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-[#0049AA]/10 text-[#0049AA] rounded font-medium">
                      duzeltme
                    </span>
                  )}
                </div>
                <span className="text-[14px] font-semibold text-[#2E2E2E]">
                  {p.skor}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Partners */}
      {partners && partners.length > 0 && (
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5A5A] mb-3">
            Ortaklar
          </h4>
          <div className="space-y-1">
            {partners.map((p) => (
              <div
                key={p.ad}
                className="flex items-center justify-between py-2 border-b border-[#E5E5E5] last:border-0"
              >
                <span className="text-[14px] text-[#2E2E2E]">{p.ad}</span>
                <span className="text-[14px] text-[#5A5A5A]">%{p.oran}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
