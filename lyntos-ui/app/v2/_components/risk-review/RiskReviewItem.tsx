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
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
      title={factor.aciklama}
    >
      <span className="font-semibold">{factor.kod}</span>
      {factor.multiplier > 1 && (
        <span className="text-red-600 dark:text-red-400 font-bold">{factor.multiplier.toFixed(1)}x</span>
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
        border-b border-slate-100 dark:border-slate-700
        hover:bg-slate-50 dark:hover:bg-slate-800/50
        cursor-pointer transition-colors
        ${selected ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : ''}
      `}
    >
      {/* Risk Dot */}
      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${riskConfig.dotColor}`} />

      {/* Score */}
      <div className="w-14 text-center flex-shrink-0">
        <div className={`text-2xl font-bold ${riskConfig.color}`}>{formatRiskScore(item.riskSkoru)}</div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">puan</div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{item.mukellefAdi}</h4>
          <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs ${statusConfig.bgColor} ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-2">
          {item.sektor && <span>🏢 {item.sektor}</span>}
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{item.donem}</span>
          {item.assignedTo && <span className="flex items-center gap-1"><User className="w-3 h-3" />{item.assignedTo}</span>}
        </div>
        {item.topRiskFactors.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
            {item.topRiskFactors.slice(0, 3).map(f => <RiskFactorBadge key={f.id} factor={f} />)}
            {item.topRiskFactors.length > 3 && <span className="text-xs text-slate-400">+{item.topRiskFactors.length - 3}</span>}
          </div>
        )}
      </div>

      {/* Arrow */}
      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 flex-shrink-0" />
    </div>
  );
}
