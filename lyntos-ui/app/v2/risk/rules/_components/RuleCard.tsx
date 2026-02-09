/**
 * Kural Kart Bileşeni
 * SMMM/YMM kullanıcıları için temiz görünüm
 */

import { ToggleLeft, ToggleRight, Scale, FileText, Info } from 'lucide-react';
import type { Rule } from '../_types';
import { severityConfig, categoryLabels } from '../_lib/constants';

interface RuleCardProps {
  rule: Rule;
  onClick: () => void;
}

export function RuleCard({ rule, onClick }: RuleCardProps) {
  const SeverityIcon = severityConfig[rule.severity]?.icon || Info;

  // Güvenli category render
  const categoryLabel = typeof rule.category === 'string'
    ? (categoryLabels[rule.category] || rule.category)
    : '';

  return (
    <div
      onClick={onClick}
      className={`border rounded-lg p-4 transition-all cursor-pointer ${
        rule.is_active
          ? 'bg-white border-[#E5E5E5] hover:shadow-md hover:border-[#B4B4B4]'
          : 'bg-[#F5F6F8] border-[#E5E5E5] opacity-60'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {/* Rule ID */}
            <span className="font-mono text-xs text-[#5A5A5A] bg-[#F5F6F8] px-2 py-0.5 rounded">
              {rule.rule_id}
            </span>

            {/* Severity */}
            <span className={`text-xs px-2 py-0.5 rounded border flex items-center gap-1 ${severityConfig[rule.severity]?.color}`}>
              <SeverityIcon className="w-3 h-3" />
              {severityConfig[rule.severity]?.label}
            </span>

            {/* Category */}
            {categoryLabel && (
              <span className="text-xs text-[#969696] bg-[#F5F6F8] px-2 py-0.5 rounded">
                {categoryLabel}
              </span>
            )}
          </div>

          <h3 className="font-medium text-[#2E2E2E]">{rule.name_tr || rule.name}</h3>

          {rule.description && (
            <p className="text-sm text-[#969696] mt-1 line-clamp-2">{rule.description}</p>
          )}

          {/* Legal Refs & Inputs */}
          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-[#969696]">
            {rule.legal_refs && rule.legal_refs.length > 0 && (
              <span className="flex items-center gap-1">
                <Scale className="w-3 h-3" />
                {rule.legal_refs.slice(0, 2).map(r => typeof r === 'string' ? r : '').join(', ')}
                {rule.legal_refs.length > 2 && ` +${rule.legal_refs.length - 2}`}
              </span>
            )}
            {rule.inputs && rule.inputs.length > 0 && (
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {rule.inputs.length} girdi
              </span>
            )}
          </div>
        </div>

        {/* Active Toggle (visual only) */}
        <div className="ml-4">
          {rule.is_active ? (
            <ToggleRight className="w-8 h-8 text-[#0049AA]" />
          ) : (
            <ToggleLeft className="w-8 h-8 text-[#969696]" />
          )}
        </div>
      </div>
    </div>
  );
}
