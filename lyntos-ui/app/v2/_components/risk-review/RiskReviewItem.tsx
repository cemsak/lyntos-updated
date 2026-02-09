'use client';

import React from 'react';
import { ChevronRight, User, Calendar, AlertTriangle } from 'lucide-react';
import type { RiskReviewItem as RiskReviewItemType, RiskFactor } from './types';
import { RISK_LEVEL_CONFIG, REVIEW_STATUS_CONFIG, formatRiskScore } from './types';

interface RiskReviewItemProps {
  item: RiskReviewItemType;
  onClick?: (item: RiskReviewItemType) => void;
  selected?: boolean;
}

function RiskFactorBadge({ factor }: { factor: RiskFactor }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-[#F5F6F8] text-[#5A5A5A]"
      title={factor.aciklama}
    >
      <span className="font-semibold">{factor.kod}</span>
      {factor.multiplier > 1 && (
        <span className="text-[#BF192B] font-bold">{factor.multiplier.toFixed(1)}x</span>
      )}
    </span>
  );
}

export function RiskReviewItem({ item, onClick, selected = false }: RiskReviewItemProps) {
  const riskConfig = RISK_LEVEL_CONFIG[item.riskLevel];
  const statusConfig = REVIEW_STATUS_CONFIG[item.status];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(item)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(item); }}
      className={`
        group flex items-center gap-4 p-4
        border-b border-[#E5E5E5]
        hover:bg-[#F5F6F8]
        cursor-pointer transition-colors
        ${selected ? 'bg-[#E6F9FF] border-l-4 border-l-[#0078D0]' : ''}
      `}
    >
      {/* Risk Dot */}
      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${riskConfig.dotColor}`} />

      {/* Score */}
      <div className="w-14 text-center flex-shrink-0">
        <div className={`text-2xl font-bold ${riskConfig.color}`}>{formatRiskScore(item.riskSkoru)}</div>
        <div className="text-[10px] text-[#969696] uppercase">puan</div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-[#2E2E2E] truncate">{item.mukellefAdi}</h4>
          <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs ${statusConfig.bgColor} ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-[#969696] mb-2">
          {item.sektor && <span>🏢 {item.sektor}</span>}
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{item.donem}</span>
          {item.assignedTo && <span className="flex items-center gap-1"><User className="w-3 h-3" />{item.assignedTo}</span>}
        </div>
        {item.topRiskFactors.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <AlertTriangle className="w-3 h-3 text-[#FFB114] flex-shrink-0" />
            {item.topRiskFactors.slice(0, 3).map(f => <RiskFactorBadge key={f.id} factor={f} />)}
            {item.topRiskFactors.length > 3 && <span className="text-xs text-[#969696]">+{item.topRiskFactors.length - 3}</span>}
          </div>
        )}
      </div>

      {/* Arrow */}
      <ChevronRight className="w-5 h-5 text-[#969696] group-hover:text-[#5A5A5A] flex-shrink-0" />
    </div>
  );
}
