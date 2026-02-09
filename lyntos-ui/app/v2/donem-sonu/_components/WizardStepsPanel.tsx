'use client';

/**
 * WizardStepsPanel - Dönem sonu wizard adım listesi paneli
 */

import React from 'react';
import { ClipboardCheck, CheckCircle2 } from 'lucide-react';
import { type WizardStepsPanelProps } from '../_types';
import { StepCard } from './StepCard';

export function WizardStepsPanel({
  steps,
  effectiveCompletedSteps,
  getStepStatus,
  onStepClick,
  onMarkComplete,
}: WizardStepsPanelProps) {
  return (
      <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0078D0] to-[#0078D0] rounded-xl flex items-center justify-center text-white">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#2E2E2E]">İşlem Adımları</h2>
              <p className="text-sm text-[#969696]">Sırasıyla tamamlayın</p>
            </div>
          </div>

          {/* Timeline indicator */}
          <div className="hidden sm:flex items-center gap-1">
            {[1, 2, 3, 4].map((step) => (
              <React.Fragment key={step}>
                <div
                  className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                  ${
                    effectiveCompletedSteps.includes(step)
                      ? 'bg-[#00A651] text-white'
                      : getStepStatus(step) === 'current'
                        ? 'bg-[#0078D0] text-white'
                        : 'bg-[#E5E5E5] text-[#969696]'
                  }
                `}
                >
                  {effectiveCompletedSteps.includes(step) ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    step
                  )}
                </div>
                {step < 4 && (
                  <div
                    className={`w-8 h-1 rounded ${effectiveCompletedSteps.includes(step) ? 'bg-[#6BDB83]' : 'bg-[#E5E5E5]'}`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Cards */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <StepCard
              key={step.id}
              step={step}
              index={index}
              onStepClick={onStepClick}
              onMarkComplete={onMarkComplete}
              isCompleted={effectiveCompletedSteps.includes(step.id)}
            />
          ))}
        </div>
      </div>
  );
}
