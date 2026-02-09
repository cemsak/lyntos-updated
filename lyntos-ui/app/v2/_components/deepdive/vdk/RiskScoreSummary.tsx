'use client';

import React from 'react';

interface RiskScoreSummaryProps {
  totalScore: number;
  maxScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  statusCounts: {
    pass: number;
    fail: number;
    warning: number;
    pending: number;
  };
}

const RISK_LEVEL_CONFIG = {
  LOW: { bg: 'bg-[#00A651]', text: 'text-[#005A46]', label: 'DUSUK' },
  MEDIUM: { bg: 'bg-yellow-500', text: 'text-yellow-800', label: 'ORTA' },
  HIGH: { bg: 'bg-[#FFB114]', text: 'text-[#E67324]', label: 'YUKSEK' },
  CRITICAL: { bg: 'bg-[#F0282D]', text: 'text-[#980F30]', label: 'KRITIK' },
};

export function RiskScoreSummary({
  totalScore,
  maxScore,
  riskLevel,
  statusCounts,
}: RiskScoreSummaryProps) {
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const config = RISK_LEVEL_CONFIG[riskLevel] || RISK_LEVEL_CONFIG.LOW;

  return (
    <div className="bg-[#F5F6F8] rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[#5A5A5A]">
          Risk Özeti
        </h3>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${config.bg} text-white`}
        >
          {config.label}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative h-4 bg-[#E5E5E5] rounded-full overflow-hidden mb-3">
        <div
          className={`absolute left-0 top-0 h-full ${config.bg} transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-[#5A5A5A]">
          {totalScore} / {maxScore} ({percentage}%)
        </span>
      </div>

      {/* Status Counts */}
      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#F0282D]" />
          <span className="text-[#5A5A5A]">
            {statusCounts.fail} Fail
          </span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-[#5A5A5A]">
            {statusCounts.warning} Warning
          </span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#969696]" />
          <span className="text-[#5A5A5A]">
            {statusCounts.pending} Pending
          </span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#00A651]" />
          <span className="text-[#5A5A5A]">
            {statusCounts.pass} Pass
          </span>
        </span>
      </div>
    </div>
  );
}
