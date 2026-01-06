'use client';

import React from 'react';
import { VdkAssessmentResult, VdkCriterionResult } from './useVdkValidation';

interface QuickRiskSummaryProps {
  assessment: VdkAssessmentResult;
  maxItems?: number;
}

export function QuickRiskSummary({ assessment, maxItems = 5 }: QuickRiskSummaryProps) {
  // Get top risks (fail first, then warning, sorted by score)
  const topRisks = [...assessment.criteria]
    .filter(c => c.status === 'fail' || c.status === 'warning')
    .sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'fail' ? -1 : 1;
      }
      return b.score - a.score;
    })
    .slice(0, maxItems);

  if (topRisks.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-green-800">
          <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">P</span>
          <span className="font-medium">Tum VDK kriterleri gecti</span>
        </div>
        <p className="text-sm text-green-600 mt-1">
          Yuklenen dosyalarda kritik risk tespit edilmedi.
        </p>
      </div>
    );
  }

  const totalRisks = assessment.criteria.filter(c => c.status === 'fail' || c.status === 'warning').length;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
        <span className="w-5 h-5 rounded bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">!</span>
        Tespit Edilen Riskler ({topRisks.length})
      </h4>
      <div className="space-y-2">
        {topRisks.map((risk) => (
          <RiskItem key={risk.id} risk={risk} />
        ))}
      </div>
      {totalRisks > maxItems && (
        <p className="text-xs text-slate-500 mt-3">
          +{totalRisks - maxItems} daha fazla risk icin detayli raporu inceleyin.
        </p>
      )}
    </div>
  );
}

function RiskItem({ risk }: { risk: VdkCriterionResult }) {
  const statusIcon = risk.status === 'fail' ? 'X' : '!';
  const statusBg = risk.status === 'fail' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700';
  const statusColor = risk.status === 'fail' ? 'text-red-700' : 'text-yellow-700';

  return (
    <div className="flex items-start gap-2 text-sm">
      <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${statusBg}`}>
        {statusIcon}
      </span>
      <div className="flex-1">
        <span className={`font-medium ${statusColor}`}>
          [{risk.code}] {risk.name_tr}
        </span>
        {risk.detail_tr && (
          <p className="text-slate-600 text-xs mt-0.5">{risk.detail_tr}</p>
        )}
      </div>
      <span className="text-xs bg-slate-200 px-2 py-0.5 rounded">
        +{risk.score}
      </span>
    </div>
  );
}
