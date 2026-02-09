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
  LOW: { bg: 'bg-[#ECFDF5]', text: 'text-[#005A46]', border: 'border-[#6BDB83]', label: 'DUSUK RISK', icon: 'P' },
  MEDIUM: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', label: 'ORTA RISK', icon: '!' },
  HIGH: { bg: 'bg-[#FFFBEB]', text: 'text-[#E67324]', border: 'border-[#FFE045]', label: 'YUKSEK RISK', icon: '!!' },
  CRITICAL: { bg: 'bg-[#FEF2F2]', text: 'text-[#980F30]', border: 'border-[#FF9196]', label: 'KRITIK RISK', icon: 'X' },
};

export function UploadValidationBadge({
  assessment,
  loading,
  error,
  onViewDetails,
}: UploadValidationBadgeProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-[#F5F6F8] rounded-lg animate-pulse">
        <div className="w-4 h-4 border-2 border-[#969696] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-[#5A5A5A]">VDK analizi yapiliyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-[#FEF2F2] border border-[#FFC7C9] rounded-lg">
        <span className="text-[#F0282D] font-bold">X</span>
        <span className="text-sm text-[#BF192B]">Hata: {error}</span>
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
          <div className="text-xs text-[#5A5A5A]">
            Skor: {assessment.total_score}/{assessment.max_score}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-8 w-px bg-[#B4B4B4]" />

      {/* Status Counts */}
      <div className="flex items-center gap-3 text-xs">
        {failCount > 0 && (
          <span className="flex items-center gap-1 text-[#BF192B]">
            <span className="w-2 h-2 rounded-full bg-[#F0282D]" />
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
          className="ml-auto text-xs text-[#0049AA] hover:text-[#00287F] hover:underline"
        >
          Detaylari Gor
        </button>
      )}
    </div>
  );
}
