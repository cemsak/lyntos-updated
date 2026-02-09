'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { RISK_LEVELS, type RiskLevel } from '@/lib/ui/design-tokens';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  riskLevel?: RiskLevel;
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  riskLevel,
  onClick,
  className,
}) => {
  const TrendIcon =
    trend?.direction === 'up'
      ? TrendingUp
      : trend?.direction === 'down'
        ? TrendingDown
        : Minus;

  const trendColor =
    trend?.direction === 'up'
      ? 'text-[#BF192B]'
      : trend?.direction === 'down'
        ? 'text-[#00804D]'
        : 'text-[#969696]';

  const riskConfig = riskLevel ? RISK_LEVELS[riskLevel] : null;

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl border p-5 transition-all',
        onClick && 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5',
        riskConfig ? riskConfig.color.border : 'border-[#E5E5E5]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                riskConfig ? riskConfig.color.bg : 'bg-[#F5F6F8]'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4',
                  riskConfig ? riskConfig.color.text : 'text-[#5A5A5A]'
                )}
              />
            </div>
          )}
          <span className="text-xs font-medium text-[#969696] uppercase tracking-wide">
            {title}
          </span>
        </div>
        {riskConfig && <span className="text-lg">{riskConfig.icon}</span>}
      </div>

      {/* Value */}
      <div
        className={cn(
          'text-3xl font-bold mb-1',
          riskConfig ? riskConfig.color.text : 'text-[#2E2E2E]'
        )}
      >
        {typeof value === 'number' ? value.toLocaleString('tr-TR') : value}
      </div>

      {/* Subtitle */}
      {subtitle && <p className="text-sm text-[#969696]">{subtitle}</p>}

      {/* Trend */}
      {trend && (
        <div className={cn('flex items-center gap-1 mt-2', trendColor)}>
          <TrendIcon className="w-4 h-4" />
          <span className="text-sm font-medium">
            {trend.direction === 'up'
              ? '+'
              : trend.direction === 'down'
                ? '-'
                : ''}
            {Math.abs(trend.value)}%
          </span>
          {trend.label && (
            <span className="text-xs text-[#969696] ml-1">{trend.label}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
