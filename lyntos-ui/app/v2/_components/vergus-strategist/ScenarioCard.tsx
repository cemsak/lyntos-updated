import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { WhatIfScenario, ScenarioResult } from './whatIfTypes';
import { CATEGORY_COLORS } from './whatIfTypes';
import { ScenarioDetail } from './ScenarioDetail';

interface ScenarioCardProps {
  scenario: WhatIfScenario;
  result: ScenarioResult;
  value: number;
  isExpanded: boolean;
  formatCurrency: (value: number) => string;
  onToggle: (scenarioId: string) => void;
  onValueChange: (scenarioId: string, value: number) => void;
  onApply?: (scenario: WhatIfScenario, result: ScenarioResult) => void;
}

export function ScenarioCard({
  scenario,
  result,
  value,
  isExpanded,
  formatCurrency,
  onToggle,
  onValueChange,
  onApply,
}: ScenarioCardProps) {
  const colors = CATEGORY_COLORS[scenario.category];

  return (
    <div className="hover:bg-[#F5F6F8] transition-colors">
      {/* Scenario Header */}
      <button
        onClick={() => onToggle(scenario.id)}
        className="w-full px-6 py-4 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-[20px]">{colors.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-[#2E2E2E]">
                {scenario.name}
              </h3>
              <span
                className={`px-2 py-0.5 text-[9px] font-medium rounded ${colors.bg} ${colors.text}`}
              >
                {scenario.difficulty.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-[#969696] mt-0.5">
              {scenario.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-[#969696]">Tasarruf</p>
            <p className="text-[16px] font-bold text-[#00804D]">
              {formatCurrency(result.saving)}
            </p>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[#969696]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#969696]" />
          )}
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <ScenarioDetail
          scenario={scenario}
          result={result}
          value={value}
          onValueChange={onValueChange}
          onApply={onApply}
        />
      )}
    </div>
  );
}
