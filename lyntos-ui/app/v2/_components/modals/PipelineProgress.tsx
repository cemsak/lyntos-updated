import React from 'react';
import { CheckCircle, AlertCircle, Loader2, Search, BarChart3 } from 'lucide-react';
import type { PipelinePhase } from './uploadModalTypes';
import { PIPELINE_LABELS, PIPELINE_ORDER } from './uploadModalTypes';

interface PipelineProgressProps {
  uploaded: boolean;
  uploading: boolean;
  pipelinePhase: PipelinePhase;
  pipelineCrossCheckCount: number;
  pipelineAnalysisCount: number;
}

export function PipelineProgress({
  uploaded,
  uploading,
  pipelinePhase,
  pipelineCrossCheckCount,
  pipelineAnalysisCount,
}: PipelineProgressProps) {
  if (!uploaded && !uploading) return null;

  const currentIndex = PIPELINE_ORDER.indexOf(pipelinePhase);
  const isComplete = pipelinePhase === 'completed';
  const isError = pipelinePhase === 'error';

  // Sadece uploading/parsing aşamasında gösterme (bunlar hızlı geçiyor)
  if (pipelinePhase === 'uploading' || pipelinePhase === 'parsing') return null;

  return (
    <div className="mt-4 bg-[#F0F4FF] rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        {isComplete ? (
          <CheckCircle className="w-4 h-4 text-[#00804D]" />
        ) : isError ? (
          <AlertCircle className="w-4 h-4 text-[#F0282D]" />
        ) : (
          <Loader2 className="w-4 h-4 text-[#0078D0] animate-spin" />
        )}
        <span className="text-sm font-medium text-[#2E2E2E]">
          {PIPELINE_LABELS[pipelinePhase]}
        </span>
      </div>

      {/* Progress steps */}
      <div className="flex gap-1 mb-2">
        {(['cross_checking', 'analyzing', 'completed'] as PipelinePhase[]).map((step, i) => {
          const stepIndex = PIPELINE_ORDER.indexOf(step);
          const isDone = currentIndex >= stepIndex;
          const isCurrent = pipelinePhase === step;
          return (
            <div
              key={step}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                isDone ? 'bg-[#00804D]' : isCurrent ? 'bg-[#0078D0]' : 'bg-[#E5E5E5]'
              }`}
            />
          );
        })}
      </div>

      {/* Step labels */}
      <div className="flex justify-between text-xs text-[#969696]">
        <span className="flex items-center gap-1">
          <Search className="w-3 h-3" />
          Çapraz Kontrol
          {pipelineCrossCheckCount > 0 && (
            <span className="text-[#00804D] font-medium">({pipelineCrossCheckCount})</span>
          )}
        </span>
        <span className="flex items-center gap-1">
          <BarChart3 className="w-3 h-3" />
          Risk Analizi
          {pipelineAnalysisCount > 0 && (
            <span className="text-[#00804D] font-medium">({pipelineAnalysisCount})</span>
          )}
        </span>
      </div>
    </div>
  );
}
