'use client';

/**
 * Tax Opportunity Card Component
 * Sprint 9.0 - LYNTOS V2
 *
 * Displays a single tax optimization opportunity with expandable details.
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Scale,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import type { TaxOpportunity } from './types';
import {
  PRIORITY_CONFIG,
  DIFFICULTY_CONFIG,
  CATEGORY_CONFIG,
} from './types';

interface OpportunityCardProps {
  opportunity: TaxOpportunity;
  rank: number;
}

export function OpportunityCard({ opportunity, rank }: OpportunityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const priority = PRIORITY_CONFIG[opportunity.priority];
  const difficulty = DIFFICULTY_CONFIG[opportunity.difficulty];
  const category =
    CATEGORY_CONFIG[opportunity.category as keyof typeof CATEGORY_CONFIG] ||
    CATEGORY_CONFIG.KURUMLAR_VERGISI;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div
      className={`
        bg-white dark:bg-[#1a1f2e] rounded-xl border-2 transition-all overflow-hidden
        ${rank <= 3 ? 'border-[#635bff]/30' : 'border-[#e3e8ee] dark:border-[#2d3343]'}
      `}
    >
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-start justify-between text-left hover:bg-[#f6f9fc] dark:hover:bg-[#0a0d14] transition-colors"
      >
        <div className="flex items-start gap-3">
          {/* Rank Badge */}
          <div
            className={`
              w-8 h-8 rounded-lg flex items-center justify-center text-[14px] font-bold
              ${rank <= 3 ? 'bg-[#635bff] text-white' : 'bg-[#e3e8ee] dark:bg-[#2d3343] text-[#697386]'}
            `}
          >
            {rank}
          </div>

          <div className="flex-1">
            {/* Strategy Name */}
            <div className="flex items-center gap-2">
              <span className="text-[16px]">{category.icon}</span>
              <h3 className="text-[15px] font-semibold text-[#1a1f36] dark:text-white">
                {opportunity.strategy_name}
              </h3>
            </div>

            {/* Tags Row */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span
                className="px-2 py-0.5 text-[10px] font-medium rounded"
                style={{
                  backgroundColor: `${priority.color}20`,
                  color: priority.color,
                }}
              >
                {priority.label} Oncelik
              </span>
              <span
                className="px-2 py-0.5 text-[10px] font-medium rounded"
                style={{
                  backgroundColor: `${difficulty.color}20`,
                  color: difficulty.color,
                }}
              >
                {difficulty.label}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-[#635bff]/10 text-[#635bff]">
                {opportunity.legal_basis}
              </span>
            </div>

            {/* Description */}
            <p className="text-[12px] text-[#697386] mt-2 line-clamp-2">
              {opportunity.description}
            </p>
          </div>
        </div>

        {/* Saving Amount */}
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <p className="text-[11px] text-[#697386]">Potansiyel Tasarruf</p>
            <p className="text-[18px] font-bold text-[#0caf60]">
              {formatCurrency(opportunity.potential_saving)}
            </p>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[#697386]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#697386]" />
          )}
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-[#e3e8ee] dark:border-[#2d3343]">
          {/* Calculation Details */}
          {opportunity.calculation_details && (
            <div className="mt-4 p-3 bg-[#f6f9fc] dark:bg-[#0a0d14] rounded-lg">
              <h4 className="text-[12px] font-medium text-[#1a1f36] dark:text-white mb-2 flex items-center gap-2">
                <Scale className="w-4 h-4" />
                Hesaplama Detayi
              </h4>
              <pre className="text-[11px] text-[#697386] whitespace-pre-wrap font-mono">
                {opportunity.calculation_details}
              </pre>
            </div>
          )}

          {/* Conditions */}
          {opportunity.conditions.length > 0 && (
            <div className="mt-4">
              <h4 className="text-[12px] font-medium text-[#1a1f36] dark:text-white mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#0caf60]" />
                Kosullar
              </h4>
              <ul className="space-y-1">
                {opportunity.conditions.map((condition, idx) => (
                  <li
                    key={idx}
                    className="text-[12px] text-[#697386] flex items-start gap-2"
                  >
                    <span className="text-[#0caf60] mt-0.5">•</span>
                    {condition}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          {opportunity.actions.length > 0 && (
            <div className="mt-4">
              <h4 className="text-[12px] font-medium text-[#1a1f36] dark:text-white mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#635bff]" />
                Uygulama Adimlari
              </h4>
              <ol className="space-y-1">
                {opportunity.actions.map((action, idx) => (
                  <li
                    key={idx}
                    className="text-[12px] text-[#697386] flex items-start gap-2"
                  >
                    <span className="text-[#635bff] font-medium min-w-[16px]">
                      {idx + 1}.
                    </span>
                    {action}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Warnings */}
          {opportunity.warnings.length > 0 && (
            <div className="mt-4 p-3 bg-[#f5a623]/10 rounded-lg">
              <h4 className="text-[12px] font-medium text-[#f5a623] mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Uyarilar
              </h4>
              <ul className="space-y-1">
                {opportunity.warnings.map((warning, idx) => (
                  <li key={idx} className="text-[12px] text-[#f5a623]">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risk Level */}
          <div className="mt-4 flex items-center justify-between text-[11px] text-[#697386]">
            <span>
              Risk Seviyesi:{' '}
              <span
                className={`font-medium ${
                  opportunity.risk_level === 'low'
                    ? 'text-[#0caf60]'
                    : opportunity.risk_level === 'medium'
                      ? 'text-[#f5a623]'
                      : 'text-[#cd3d64]'
                }`}
              >
                {opportunity.risk_level === 'low'
                  ? 'Dusuk'
                  : opportunity.risk_level === 'medium'
                    ? 'Orta'
                    : 'Yuksek'}
              </span>
            </span>
            <span>2025 Durum: {opportunity.status_2025}</span>
          </div>
        </div>
      )}
    </div>
  );
}
