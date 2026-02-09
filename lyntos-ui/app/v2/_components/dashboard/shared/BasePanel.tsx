/**
 * BasePanel - Consistent panel wrapper for all dashboard sections
 * White card style with optional header actions
 */

'use client';

import React from 'react';
import { Info } from 'lucide-react';

interface BasePanelProps {
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  };
  actions?: React.ReactNode;
  showInfo?: boolean;
  onInfoClick?: () => void;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function BasePanel({
  title,
  subtitle,
  badge,
  actions,
  showInfo = false,
  onInfoClick,
  children,
  className = '',
  noPadding = false,
}: BasePanelProps) {
  const badgeClass = badge ? {
    success: 'bg-[#ECFDF5] text-[#00804D] border-[#AAE8B8]',
    warning: 'bg-[#FFFBEB] text-[#FA841E] border-[#FFF08C]',
    error: 'bg-[#FEF2F2] text-[#BF192B] border-[#FFC7C9]',
    info: 'bg-[#E6F9FF] text-[#0049AA] border-[#ABEBFF]',
    neutral: 'bg-[#F5F6F8] text-[#5A5A5A] border-[#E5E5E5]',
  }[badge.variant] : '';

  return (
    <div className={`bg-white border border-[#E5E5E5] rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5E5]">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-base font-semibold text-[#2E2E2E]">{title}</h3>
            {subtitle && (
              <p className="text-sm text-[#969696] mt-0.5">{subtitle}</p>
            )}
          </div>
          {badge && (
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${badgeClass}`}>
              {badge.text}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {actions}
          {showInfo && onInfoClick && (
            <button
              onClick={onInfoClick}
              className="p-1.5 text-[#969696] hover:text-[#5A5A5A] hover:bg-[#F5F6F8] rounded-lg transition-colors"
              title="Bilgi"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={noPadding ? '' : 'p-5'}>
        {children}
      </div>
    </div>
  );
}

export default BasePanel;
