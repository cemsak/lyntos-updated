'use client';

/**
 * LYNTOS Progress Indicator Components - Kaizen Görsel Sistem
 *
 * İlerleme göstergesi bileşenleri (lineer, dairesel, adım bazlı)
 */

import React from 'react';
import { CheckCircle2, Circle, Lock, LucideIcon } from 'lucide-react';

// =============================================================================
// LINEAR PROGRESS
// =============================================================================

interface LinearProgressProps {
  value: number; // 0-100
  max?: number;
  label?: string;
  showValue?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const linearVariantStyles = {
  default: 'bg-[#0078D0]',
  success: 'bg-[#00A651]',
  warning: 'bg-[#FFB114]',
  error: 'bg-[#F0282D]',
  gradient: 'bg-gradient-to-r from-[#0078D0] to-[#0078D0]',
};

const linearSizeStyles = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export function LinearProgress({
  value,
  max = 100,
  label,
  showValue = false,
  variant = 'default',
  size = 'md',
  animated = false,
}: LinearProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-sm font-medium text-[#5A5A5A]">{label}</span>}
          {showValue && (
            <span className="text-sm text-[#969696]">
              {value}/{max} ({percentage.toFixed(0)}%)
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-[#E5E5E5] rounded-full overflow-hidden ${linearSizeStyles[size]}`}>
        <div
          className={`
            ${linearSizeStyles[size]}
            ${linearVariantStyles[variant]}
            rounded-full
            transition-all duration-500 ease-out
            ${animated ? 'animate-pulse' : ''}
          `}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// CIRCULAR PROGRESS
// =============================================================================

interface CircularProgressProps {
  value: number; // 0-100
  max?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  strokeWidth?: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
  showValue?: boolean;
  label?: string;
}

const circularSizeStyles = {
  sm: { size: 48, fontSize: 'text-xs', labelSize: 'text-[8px]' },
  md: { size: 64, fontSize: 'text-sm', labelSize: 'text-[10px]' },
  lg: { size: 80, fontSize: 'text-lg', labelSize: 'text-xs' },
  xl: { size: 120, fontSize: 'text-2xl', labelSize: 'text-sm' },
};

const circularVariantColors = {
  default: '#0049AA',
  success: '#00A651',
  warning: '#FFB114',
  error: '#F0282D',
};

export function CircularProgress({
  value,
  max = 100,
  size = 'md',
  strokeWidth = 6,
  variant = 'default',
  showValue = true,
  label,
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const { size: sizeValue, fontSize, labelSize } = circularSizeStyles[size];

  const radius = (sizeValue - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={sizeValue} height={sizeValue} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={sizeValue / 2}
          cy={sizeValue / 2}
          r={radius}
          stroke="#E5E5E5"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={sizeValue / 2}
          cy={sizeValue / 2}
          r={radius}
          stroke={circularVariantColors[variant]}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showValue && (
          <span className={`${fontSize} font-bold text-[#2E2E2E]`}>
            {percentage.toFixed(0)}%
          </span>
        )}
        {label && (
          <span className={`${labelSize} text-[#969696] uppercase tracking-wide`}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// RISK SCORE GAUGE
// =============================================================================

interface RiskScoreGaugeProps {
  score: number; // 0-100
  size?: 'md' | 'lg' | 'xl';
  showLabel?: boolean;
}

export function RiskScoreGauge({ score, size = 'lg', showLabel = true }: RiskScoreGaugeProps) {
  const variant = score >= 70 ? 'error' : score >= 40 ? 'warning' : 'success';
  const label = score >= 70 ? 'YÜKSEK' : score >= 40 ? 'ORTA' : 'DÜŞÜK';

  const sizeConfig = {
    md: { outer: 80, inner: 64, border: 6 },
    lg: { outer: 96, inner: 80, border: 8 },
    xl: { outer: 128, inner: 108, border: 10 },
  };

  const config = sizeConfig[size];

  const borderColor = {
    success: 'border-[#00CB50]',
    warning: 'border-[#FFCE19]',
    error: 'border-[#FF555F]',
  };

  const textColor = {
    success: 'text-[#00804D]',
    warning: 'text-[#FA841E]',
    error: 'text-[#BF192B]',
  };

  return (
    <div className="flex items-center gap-4">
      <div
        className={`
          rounded-full border-${config.border}
          ${borderColor[variant]}
          flex items-center justify-center
        `}
        style={{
          width: config.outer,
          height: config.outer,
          borderWidth: config.border,
        }}
      >
        <div className="text-center">
          <span className="text-2xl font-bold text-[#2E2E2E]">{score}</span>
          <span className="text-sm text-[#969696] block">/100</span>
        </div>
      </div>
      {showLabel && (
        <div>
          <p className="text-sm text-[#969696]">Risk Skoru</p>
          <p className={`text-lg font-bold ${textColor[variant]}`}>
            {label} RİSK
          </p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// STEP PROGRESS
// =============================================================================

interface Step {
  id: string | number;
  title: string;
  description?: string;
  icon?: LucideIcon;
  status: 'completed' | 'current' | 'pending' | 'locked';
}

interface StepProgressProps {
  steps: Step[];
  variant?: 'horizontal' | 'vertical';
  onStepClick?: (step: Step) => void;
}

const stepStatusStyles = {
  completed: {
    circle: 'bg-[#00A651] text-white',
    connector: 'bg-[#00A651]',
    title: 'text-[#00804D]',
    description: 'text-[#00804D]',
  },
  current: {
    circle: 'bg-[#0078D0] text-white ring-4 ring-[#E6F9FF]',
    connector: 'bg-[#E5E5E5]',
    title: 'text-[#0049AA] font-semibold',
    description: 'text-[#5A5A5A]',
  },
  pending: {
    circle: 'bg-[#E5E5E5] text-[#969696]',
    connector: 'bg-[#E5E5E5]',
    title: 'text-[#5A5A5A]',
    description: 'text-[#969696]',
  },
  locked: {
    circle: 'bg-[#F5F6F8] text-[#969696]',
    connector: 'bg-[#E5E5E5]',
    title: 'text-[#969696]',
    description: 'text-[#B4B4B4]',
  },
};

export function StepProgress({ steps, variant = 'horizontal', onStepClick }: StepProgressProps) {
  const isVertical = variant === 'vertical';

  return (
    <div className={isVertical ? 'space-y-4' : 'flex items-start'}>
      {steps.map((step, index) => {
        const styles = stepStatusStyles[step.status];
        const isLast = index === steps.length - 1;
        const Icon = step.icon || (step.status === 'completed' ? CheckCircle2 : step.status === 'locked' ? Lock : Circle);

        return (
          <div
            key={step.id}
            className={`
              ${isVertical ? '' : 'flex-1'}
              ${onStepClick && step.status !== 'locked' ? 'cursor-pointer' : ''}
            `}
            onClick={() => onStepClick && step.status !== 'locked' && onStepClick(step)}
          >
            <div className={isVertical ? 'flex items-start gap-4' : 'flex flex-col items-center'}>
              {/* Step indicator */}
              <div className="relative flex items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${styles.circle}
                    transition-all duration-200
                    ${onStepClick && step.status !== 'locked' ? 'hover:scale-110' : ''}
                  `}
                >
                  {step.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : step.status === 'locked' ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-bold">{index + 1}</span>
                  )}
                </div>

                {/* Connector line */}
                {!isLast && !isVertical && (
                  <div
                    className={`
                      absolute left-full top-1/2 -translate-y-1/2
                      h-0.5 w-[calc(100%-40px)]
                      ${styles.connector}
                    `}
                    style={{ marginLeft: '8px', width: 'calc(100% - 40px)' }}
                  />
                )}
              </div>

              {/* Vertical connector */}
              {!isLast && isVertical && (
                <div className={`absolute left-5 top-10 w-0.5 h-full ${styles.connector}`} />
              )}

              {/* Content */}
              <div className={isVertical ? 'flex-1' : 'mt-2 text-center'}>
                <p className={`text-sm ${styles.title}`}>{step.title}</p>
                {step.description && (
                  <p className={`text-xs ${styles.description} mt-0.5`}>{step.description}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default LinearProgress;
