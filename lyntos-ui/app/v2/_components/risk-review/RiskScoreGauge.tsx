'use client';

import React from 'react';
import type { RiskLevel } from './types';

interface RiskScoreGaugeProps {
  score: number;
  riskLevel: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
}

// Stripe-style risk colors
const RISK_COLORS: Record<RiskLevel, string> = {
  kritik: '#F0282D',
  yuksek: '#FA841E',
  orta: '#FFB114',
  dusuk: '#00A651',
};

const RISK_LABELS: Record<RiskLevel, string> = {
  kritik: 'Kritik',
  yuksek: 'Yüksek',
  orta: 'Orta',
  dusuk: 'Düşük',
};

const SIZE_CONFIG = {
  sm: { size: 64, stroke: 6, fontSize: 18, labelSize: 10 },
  md: { size: 96, stroke: 8, fontSize: 28, labelSize: 11 },
  lg: { size: 128, stroke: 10, fontSize: 36, labelSize: 12 },
};

export function RiskScoreGauge({ score, riskLevel, size = 'md' }: RiskScoreGaugeProps) {
  const config = SIZE_CONFIG[size];
  const color = RISK_COLORS[riskLevel];
  const label = RISK_LABELS[riskLevel];

  const radius = (config.size - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const center = config.size / 2;

  return (
    <div className="inline-flex flex-col items-center relative" style={{ width: config.size, height: config.size }}>
      <svg
        width={config.size}
        height={config.size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#E5E5E5"
          strokeWidth={config.stroke}
        />
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>

      {/* Center text */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
      >
        <span
          className="font-semibold text-[#2E2E2E]"
          style={{ fontSize: config.fontSize }}
        >
          {score}
        </span>
        <span
          className="font-medium uppercase tracking-wide"
          style={{ fontSize: config.labelSize, color }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
