import React from 'react';
import {
  Calculator,
  Target,
  AlertCircle,
  CheckCircle2,
  Scale,
} from 'lucide-react';
import type { WhatIfScenario, ScenarioResult } from './whatIfTypes';

interface ScenarioDetailProps {
  scenario: WhatIfScenario;
  result: ScenarioResult;
  value: number;
  onValueChange: (scenarioId: string, value: number) => void;
  onApply?: (scenario: WhatIfScenario, result: ScenarioResult) => void;
}

export function ScenarioDetail({
  scenario,
  result,
  value,
  onValueChange,
  onApply,
}: ScenarioDetailProps) {
  return (
                <div className="px-6 pb-4 space-y-4">
                  {/* Input Slider */}
                  <div className="bg-[#F5F6F8] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[12px] font-medium text-[#5A5A5A]">
                        {scenario.inputLabel}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={value}
                          onChange={(e) =>
                            onValueChange(scenario.id, Number(e.target.value))
                          }
                          className="w-40 px-2 py-1 text-[13px] text-right bg-white border border-[#E5E5E5] rounded font-mono"
                        />
                        <span className="text-[11px] text-[#969696]">
                          {scenario.inputUnit}
                        </span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={scenario.minValue}
                      max={scenario.maxValue}
                      step={scenario.maxValue / 100}
                      value={value}
                      onChange={(e) =>
                        onValueChange(scenario.id, Number(e.target.value))
                      }
                      className="w-full h-2 bg-[#E5E5E5] rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Calculations */}
                  <div className="bg-[#E6F9FF] rounded-lg p-4">
                    <h4 className="text-[11px] font-semibold text-[#00287F] mb-2 flex items-center gap-1">
                      <Calculator className="w-3 h-3" />
                      Hesaplama Detayı
                    </h4>
                    <div className="space-y-1 font-mono text-[11px] text-[#0049AA]">
                      {result.calculations.map((calc, idx) => (
                        <div key={idx}>{calc}</div>
                      ))}
                    </div>
                  </div>

                  {/* Legal Basis */}
                  <div className="flex items-center gap-2 text-[11px]">
                    <Scale className="w-4 h-4 text-[#969696]" />
                    <span className="text-[#969696]">Yasal Dayanak:</span>
                    <span className="font-medium text-[#0049AA]">
                      {scenario.legalBasis}
                    </span>
                  </div>

                  {/* Requirements */}
                  {result.requirements && result.requirements.length > 0 && (
                    <div className="bg-[#ECFDF5] rounded-lg p-3">
                      <h4 className="text-[11px] font-semibold text-[#005A46] mb-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Gereklilikler
                      </h4>
                      <ul className="space-y-1">
                        {result.requirements.map((req, idx) => (
                          <li
                            key={idx}
                            className="text-[10px] text-[#00804D] flex items-start gap-2"
                          >
                            <span className="text-[#00A651] mt-0.5">•</span>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {result.warnings && result.warnings.length > 0 && (
                    <div className="bg-[#FFFBEB] rounded-lg p-3">
                      <h4 className="text-[11px] font-semibold text-[#E67324] mb-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Dikkat Edilmesi Gerekenler
                      </h4>
                      <ul className="space-y-1">
                        {result.warnings.map((warning, idx) => (
                          <li
                            key={idx}
                            className="text-[10px] text-[#FA841E] flex items-start gap-2"
                          >
                            <span className="text-[#FFB114] mt-0.5">⚠</span>
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    onClick={() => onApply?.(scenario, result)}
                    className="w-full py-2 text-[12px] font-medium text-white bg-[#0049AA] hover:bg-[#00287F] rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Target className="w-4 h-4" />
                    Bu Stratejiyi Uygula
                  </button>
                </div>
  );
}
