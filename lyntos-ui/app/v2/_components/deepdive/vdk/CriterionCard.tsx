'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface VdkCriterion {
  id: string;
  code: string;
  name_tr: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  score?: number;
  detail_tr?: string;
  recommendation_tr?: string;
  evidence?: Record<string, unknown>;
  legal_refs?: string[];
}

interface CriterionCardProps {
  criterion: VdkCriterion;
  defaultExpanded?: boolean;
}

const STATUS_CONFIG = {
  pass: { icon: 'P', bg: 'bg-[#ECFDF5]', border: 'border-[#AAE8B8]', iconBg: 'bg-[#ECFDF5] text-[#00804D]' },
  fail: { icon: 'X', bg: 'bg-[#FEF2F2]', border: 'border-[#FFC7C9]', iconBg: 'bg-[#FEF2F2] text-[#BF192B]' },
  warning: { icon: '!', bg: 'bg-yellow-50', border: 'border-yellow-200', iconBg: 'bg-yellow-100 text-yellow-700' },
  pending: { icon: '?', bg: 'bg-[#F5F6F8]', border: 'border-[#E5E5E5]', iconBg: 'bg-[#F5F6F8] text-[#969696]' },
};

const SEVERITY_CONFIG = {
  CRITICAL: { bg: 'bg-[#FEF2F2]', text: 'text-[#980F30]' },
  HIGH: { bg: 'bg-[#FFFBEB]', text: 'text-[#E67324]' },
  MEDIUM: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  LOW: { bg: 'bg-[#ECFDF5]', text: 'text-[#005A46]' },
};

export function CriterionCard({ criterion, defaultExpanded = false }: CriterionCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded || criterion.status === 'fail');

  const statusConfig = STATUS_CONFIG[criterion.status];
  const severityConfig = criterion.severity ? SEVERITY_CONFIG[criterion.severity] : null;

  return (
    <div
      className={`rounded-lg border ${statusConfig.border} ${statusConfig.bg} mb-2 overflow-hidden transition-all`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${statusConfig.iconBg}`}>
            {statusConfig.icon}
          </span>
          <span className="font-medium text-sm text-[#2E2E2E]">
            {criterion.code} {criterion.name_tr}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {severityConfig && (
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${severityConfig.bg} ${severityConfig.text}`}
            >
              {criterion.severity}
            </span>
          )}
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-[#969696]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#969696]" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-[#E5E5E5]">
          {/* Detail */}
          {criterion.detail_tr && (
            <p className="text-sm text-[#5A5A5A] mb-3">
              {criterion.detail_tr}
            </p>
          )}

          {/* Recommendation */}
          {criterion.recommendation_tr && (
            <div className="bg-[#E6F9FF] rounded p-3 mb-3">
              <div className="flex items-start gap-2">
                <span className="text-[#0078D0] text-sm">Oneri:</span>
                <p className="text-sm text-[#00287F]">
                  {criterion.recommendation_tr}
                </p>
              </div>
            </div>
          )}

          {/* Legal References */}
          {criterion.legal_refs && criterion.legal_refs.length > 0 && (
            <div className="flex items-center gap-2 mb-3 text-xs text-[#969696] flex-wrap">
              <span>Yasal Dayanak:</span>
              {criterion.legal_refs.map((ref, i) => (
                <span key={i} className="bg-[#F5F6F8] px-2 py-0.5 rounded">
                  {ref}
                </span>
              ))}
            </div>
          )}

          {/* Score */}
          {criterion.score !== undefined && criterion.score > 0 && (
            <div className="flex items-center gap-2 mb-3 text-xs">
              <span className="text-[#5A5A5A]">Skor:</span>
              <span className="font-medium text-[#2E2E2E]">
                {criterion.score}
              </span>
            </div>
          )}

          {/* Evidence */}
          {criterion.evidence && Object.keys(criterion.evidence).length > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-2 text-xs text-[#969696]">
                <span>Kanit:</span>
              </div>
              <pre className="text-xs bg-[#F5F6F8] rounded p-2 overflow-x-auto">
                {JSON.stringify(criterion.evidence, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
