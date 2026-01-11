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
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    error: 'bg-red-100 text-red-700 border-red-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  }[badge.variant] : '';

  return (
    <div className={`bg-white border border-slate-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-800">{title}</h3>
            {subtitle && (
              <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
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
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
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
