'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { getRiskLevelFromScore, RISK_LEVELS } from '@/lib/ui/design-tokens';

interface RiskProgressBarProps {
  value: number;
  max?: number;
  thresholds?: {
    warning?: number;
    critical?: number;
  };
  showValue?: boolean;
  showThresholds?: boolean;
  label?: string;
  unit?: string;
  className?: string;
}

export const RiskProgressBar: React.FC<RiskProgressBarProps> = ({
  value,
  max = 100,
  thresholds,
  showValue = true,
  showThresholds = true,
  label,
  unit = '',
  className,
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  const riskLevel = getRiskLevelFromScore(percentage);
  const config = RISK_LEVELS[riskLevel];

  return (
    <div className={cn('w-full', className)}>
      {/* Label row */}
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1">
          {label && (
            <span className="text-sm font-medium text-[#5A5A5A]">{label}</span>
          )}
          {showValue && (
            <span className={cn('text-sm font-bold', config.color.text)}>
              {value.toLocaleString('tr-TR')}
              {unit}
            </span>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className="relative h-3 bg-[#F5F6F8] rounded-full overflow-hidden">
        {/* Threshold markers */}
        {showThresholds && thresholds?.warning && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#FFCE19] z-10"
            style={{ left: `${(thresholds.warning / max) * 100}%` }}
          />
        )}
        {showThresholds && thresholds?.critical && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#FF555F] z-10"
            style={{ left: `${(thresholds.critical / max) * 100}%` }}
          />
        )}

        {/* Fill */}
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            config.color.bgSolid
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Threshold labels */}
      {showThresholds && (thresholds?.warning || thresholds?.critical) && (
        <div className="relative h-4 mt-1">
          {thresholds?.warning && (
            <span
              className="absolute text-xs text-[#FA841E] transform -translate-x-1/2"
              style={{ left: `${(thresholds.warning / max) * 100}%` }}
            >
              {thresholds.warning}
              {unit}
            </span>
          )}
          {thresholds?.critical && (
            <span
              className="absolute text-xs text-[#BF192B] transform -translate-x-1/2"
              style={{ left: `${(thresholds.critical / max) * 100}%` }}
            >
              {thresholds.critical}
              {unit}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default RiskProgressBar;
