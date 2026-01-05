'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CriterionCard } from './CriterionCard';

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

interface CriteriaSectionProps {
  title: string;
  subtitle: string;
  criteria: VdkCriterion[];
  icon: string;
  defaultExpanded?: boolean;
}

export function CriteriaSection({
  title,
  subtitle,
  criteria,
  icon,
  defaultExpanded = true,
}: CriteriaSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const failCount = criteria.filter((c) => c.status === 'fail').length;
  const warningCount = criteria.filter((c) => c.status === 'warning').length;

  return (
    <div className="mb-6">
      {/* Section Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-3 border-b border-slate-200 hover:bg-slate-50 transition-colors rounded-t"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <div className="text-left">
            <h3 className="font-semibold text-slate-800">
              {title}
            </h3>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {failCount > 0 && (
            <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
              {failCount} risk
            </span>
          )}
          {warningCount > 0 && (
            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
              {warningCount} uyari
            </span>
          )}
          <span className="text-xs text-slate-400">{criteria.length} kriter</span>
          {expanded ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Criteria Cards */}
      {expanded && (
        <div className="pt-4">
          {criteria.map((criterion) => (
            <CriterionCard key={criterion.code} criterion={criterion} />
          ))}
        </div>
      )}
    </div>
  );
}
