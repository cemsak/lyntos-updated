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
  pass: { icon: 'P', bg: 'bg-green-50', border: 'border-green-200', iconBg: 'bg-green-100 text-green-700' },
  fail: { icon: 'X', bg: 'bg-red-50', border: 'border-red-200', iconBg: 'bg-red-100 text-red-700' },
  warning: { icon: '!', bg: 'bg-yellow-50', border: 'border-yellow-200', iconBg: 'bg-yellow-100 text-yellow-700' },
  pending: { icon: '?', bg: 'bg-slate-50', border: 'border-slate-200', iconBg: 'bg-slate-100 text-slate-500' },
};

const SEVERITY_CONFIG = {
  CRITICAL: { bg: 'bg-red-100', text: 'text-red-800' },
  HIGH: { bg: 'bg-orange-100', text: 'text-orange-800' },
  MEDIUM: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  LOW: { bg: 'bg-green-100', text: 'text-green-800' },
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
          <span className="font-medium text-sm text-slate-800">
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
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-200">
          {/* Detail */}
          {criterion.detail_tr && (
            <p className="text-sm text-slate-600 mb-3">
              {criterion.detail_tr}
            </p>
          )}

          {/* Recommendation */}
          {criterion.recommendation_tr && (
            <div className="bg-blue-50 rounded p-3 mb-3">
              <div className="flex items-start gap-2">
                <span className="text-blue-500 text-sm">Oneri:</span>
                <p className="text-sm text-blue-800">
                  {criterion.recommendation_tr}
                </p>
              </div>
            </div>
          )}

          {/* Legal References */}
          {criterion.legal_refs && criterion.legal_refs.length > 0 && (
            <div className="flex items-center gap-2 mb-3 text-xs text-slate-500 flex-wrap">
              <span>Yasal Dayanak:</span>
              {criterion.legal_refs.map((ref, i) => (
                <span key={i} className="bg-slate-100 px-2 py-0.5 rounded">
                  {ref}
                </span>
              ))}
            </div>
          )}

          {/* Score */}
          {criterion.score !== undefined && criterion.score > 0 && (
            <div className="flex items-center gap-2 mb-3 text-xs">
              <span className="text-slate-600">Skor:</span>
              <span className="font-medium text-slate-800">
                {criterion.score}
              </span>
            </div>
          )}

          {/* Evidence */}
          {criterion.evidence && Object.keys(criterion.evidence).length > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
                <span>Kanit:</span>
              </div>
              <pre className="text-xs bg-slate-100 rounded p-2 overflow-x-auto">
                {JSON.stringify(criterion.evidence, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
