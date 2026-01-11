/**
 * KpiCard - Single KPI metric display
 * Uses design tokens for all styling
 */

'use client';

import React from 'react';
import type { KpiData } from '../types';
import { getBadgeClass } from '../design-tokens';
import { TrendingUp, TrendingDown, Minus, ChevronRight, Info } from 'lucide-react';

interface KpiCardProps {
  data: KpiData;
  onClick?: () => void;
  showInfo?: boolean;
  onInfoClick?: () => void;
}

export function KpiCard({ data, onClick, showInfo = true, onInfoClick }: KpiCardProps) {
  const { label, value, subLabel, status, badge, trend, detailUrl } = data;

  // Status-based background classes
  const statusBgClass = {
    success: 'bg-emerald-50 border-emerald-200',
    warning: 'bg-amber-50 border-amber-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    neutral: 'bg-white border-slate-200',
  }[status];

  // Trend icon
  const TrendIcon = trend?.direction === 'up'
    ? TrendingUp
    : trend?.direction === 'down'
      ? TrendingDown
      : Minus;

  const trendColorClass = trend?.direction === 'up'
    ? 'text-emerald-600'
    : trend?.direction === 'down'
      ? 'text-red-600'
      : 'text-slate-400';

  return (
    <div
      className={`
        relative rounded-lg border p-4 transition-all duration-200
        ${statusBgClass}
        ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : ''}
      `}
      onClick={onClick}
    >
      {/* Header: Label + Badge */}
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-slate-600 leading-tight">
          {label}
        </span>
        {badge && (
          <span className={`
            text-xs font-medium px-2 py-0.5 rounded-full
            ${getBadgeClass(badge.variant)}
          `}>
            {badge.text}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-bold text-slate-800 font-mono">
          {value}
        </span>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs ${trendColorClass}`}>
            <TrendIcon className="w-3 h-3" />
            {trend.value}
          </span>
        )}
      </div>

      {/* Sub Label */}
      {subLabel && (
        <p className="text-xs text-slate-500">{subLabel}</p>
      )}

      {/* Footer: Detail Link + Info */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/50">
        {detailUrl ? (
          <button
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-0.5"
            onClick={(e) => {
              e.stopPropagation();
              // Navigate to detail
            }}
          >
            Detay
            <ChevronRight className="w-3 h-3" />
          </button>
        ) : (
          <span />
        )}

        {showInfo && onInfoClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInfoClick();
            }}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Info className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default KpiCard;
