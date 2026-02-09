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
    success: 'bg-[#ECFDF5] border-[#AAE8B8]',
    warning: 'bg-[#FFFBEB] border-[#FFF08C]',
    error: 'bg-[#FEF2F2] border-[#FFC7C9]',
    info: 'bg-[#E6F9FF] border-[#ABEBFF]',
    neutral: 'bg-white border-[#E5E5E5]',
  }[status];

  // Trend icon
  const TrendIcon = trend?.direction === 'up'
    ? TrendingUp
    : trend?.direction === 'down'
      ? TrendingDown
      : Minus;

  const trendColorClass = trend?.direction === 'up'
    ? 'text-[#00804D]'
    : trend?.direction === 'down'
      ? 'text-[#BF192B]'
      : 'text-[#969696]';

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
        <span className="text-sm font-medium text-[#5A5A5A] leading-tight">
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
        <span className="text-2xl font-bold text-[#2E2E2E] font-mono">
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
        <p className="text-xs text-[#969696]">{subLabel}</p>
      )}

      {/* Footer: Detail Link + Info */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#E5E5E5]/50">
        {detailUrl ? (
          <button
            className="text-xs text-[#0049AA] hover:text-[#0049AA] font-medium flex items-center gap-0.5"
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
            className="text-[#969696] hover:text-[#5A5A5A] transition-colors"
          >
            <Info className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default KpiCard;
