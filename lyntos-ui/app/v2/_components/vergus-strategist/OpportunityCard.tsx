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
import { formatCurrency as formatCurrencyCentral } from '../../_lib/format';

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

  const formatCurrency = (value: number) => formatCurrencyCentral(value, { decimals: 0 });

  return (
    <div
      className={`
        bg-white rounded-xl border-2 transition-all overflow-hidden
        ${rank <= 3 ? 'border-[#0049AA]/30' : 'border-[#E5E5E5]'}
      `}
    >
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-start justify-between text-left hover:bg-[#F5F6F8] transition-colors"
      >
        <div className="flex items-start gap-3">
          {/* Rank Badge */}
          <div
            className={`
              w-8 h-8 rounded-lg flex items-center justify-center text-[14px] font-bold
              ${rank <= 3 ? 'bg-[#0049AA] text-white' : 'bg-[#E5E5E5] text-[#5A5A5A]'}
            `}
          >
            {rank}
          </div>

          <div className="flex-1">
            {/* Strategy Name */}
            <div className="flex items-center gap-2">
              <span className="text-[16px]">{category.icon}</span>
              <h3 className="text-[15px] font-semibold text-[#2E2E2E]">
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
              <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-[#0049AA]/10 text-[#0049AA]">
                {opportunity.legal_basis}
              </span>
            </div>

            {/* Description */}
            <p className="text-[12px] text-[#5A5A5A] mt-2 line-clamp-2">
              {opportunity.description}
            </p>
          </div>
        </div>

        {/* Saving Amount */}
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <p className="text-[11px] text-[#5A5A5A]">Potansiyel Tasarruf</p>
            <p className="text-[18px] font-bold text-[#00A651]">
              {formatCurrency(opportunity.potential_saving)}
            </p>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[#5A5A5A]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#5A5A5A]" />
          )}
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-[#E5E5E5]">
          {/* Calculation Details */}
          {opportunity.calculation_details && (
            <div className="mt-4 p-3 bg-[#F5F6F8] rounded-lg">
              <h4 className="text-[12px] font-medium text-[#2E2E2E] mb-2 flex items-center gap-2">
                <Scale className="w-4 h-4" />
                Hesaplama Detayi
              </h4>
              <pre className="text-[11px] text-[#5A5A5A] whitespace-pre-wrap font-mono">
                {opportunity.calculation_details}
              </pre>
            </div>
          )}

          {/* Conditions */}
          {opportunity.conditions.length > 0 && (
            <div className="mt-4">
              <h4 className="text-[12px] font-medium text-[#2E2E2E] mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#00A651]" />
                Kosullar
              </h4>
              <ul className="space-y-1">
                {opportunity.conditions.map((condition, idx) => (
                  <li
                    key={idx}
                    className="text-[12px] text-[#5A5A5A] flex items-start gap-2"
                  >
                    <span className="text-[#00A651] mt-0.5">•</span>
                    {condition}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          {opportunity.actions.length > 0 && (
            <div className="mt-4">
              <h4 className="text-[12px] font-medium text-[#2E2E2E] mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0049AA]" />
                Uygulama Adimlari
              </h4>
              <ol className="space-y-1">
                {opportunity.actions.map((action, idx) => (
                  <li
                    key={idx}
                    className="text-[12px] text-[#5A5A5A] flex items-start gap-2"
                  >
                    <span className="text-[#0049AA] font-medium min-w-[16px]">
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
            <div className="mt-4 p-3 bg-[#FFB114]/10 rounded-lg">
              <h4 className="text-[12px] font-medium text-[#FFB114] mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Uyarilar
              </h4>
              <ul className="space-y-1">
                {opportunity.warnings.map((warning, idx) => (
                  <li key={idx} className="text-[12px] text-[#FFB114]">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risk Level */}
          <div className="mt-4 flex items-center justify-between text-[11px] text-[#5A5A5A]">
            <span>
              Risk Seviyesi:{' '}
              <span
                className={`font-medium ${
                  opportunity.risk_level === 'low'
                    ? 'text-[#00A651]'
                    : opportunity.risk_level === 'medium'
                      ? 'text-[#FFB114]'
                      : 'text-[#F0282D]'
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
