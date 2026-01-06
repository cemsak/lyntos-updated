'use client';

import React from 'react';
import { VdkAssessmentResult } from './useVdkValidation';

interface UploadValidationBadgeProps {
  assessment: VdkAssessmentResult | null;
  loading?: boolean;
  error?: string | null;
  onViewDetails?: () => void;
}

const RISK_LEVEL_CONFIG = {
  LOW: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', label: 'DUSUK RISK', icon: 'P' },
  MEDIUM: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', label: 'ORTA RISK', icon: '!' },
  HIGH: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', label: 'YUKSEK RISK', icon: '!!' },
  CRITICAL: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', label: 'KRITIK RISK', icon: 'X' },
};

export function UploadValidationBadge({
  assessment,
  loading,
  error,
  onViewDetails,
}: UploadValidationBadgeProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg animate-pulse">
        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-600">VDK analizi yapiliyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
        <span className="text-red-500 font-bold">X</span>
        <span className="text-sm text-red-700">Hata: {error}</span>
      </div>
    );
  }

  if (!assessment) {
    return null;
  }

  const config = RISK_LEVEL_CONFIG[assessment.risk_level];
  const failCount = assessment.criteria.filter(c => c.status === 'fail').length;
  const warningCount = assessment.criteria.filter(c => c.status === 'warning').length;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${config.bg} ${config.border}`}
    >
      {/* Risk Level Badge */}
      <div className="flex items-center gap-2">
        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${config.text} bg-white`}>
          {config.icon}
        </span>
        <div>
          <span className={`font-semibold text-sm ${config.text}`}>
            {config.label}
          </span>
          <div className="text-xs text-slate-600">
            Skor: {assessment.total_score}/{assessment.max_score}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-8 w-px bg-slate-300" />

      {/* Status Counts */}
      <div className="flex items-center gap-3 text-xs">
        {failCount > 0 && (
          <span className="flex items-center gap-1 text-red-700">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {failCount} risk
          </span>
        )}
        {warningCount > 0 && (
          <span className="flex items-center gap-1 text-yellow-700">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            {warningCount} uyari
          </span>
        )}
      </div>

      {/* View Details Button */}
      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="ml-auto text-xs text-blue-600 hover:text-blue-800 hover:underline"
        >
          Detaylari Gor
        </button>
      )}
    </div>
  );
}
