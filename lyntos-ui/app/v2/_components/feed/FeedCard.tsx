'use client';

/**
 * LYNTOS FeedCard Component
 * Sprint 2.2 - Intelligence Feed Card
 *
 * Displays a single feed item with severity, impact, and actions.
 * Clicking opens detail in Context Rail.
 */

import React from 'react';
import { ChevronRight, Clock, X } from 'lucide-react';
import {
  type FeedItem,
  type FeedSeverity,
  SEVERITY_CONFIG,
  CATEGORY_CONFIG
} from './types';
import { formatCompactNumber } from '../kpi/formatters';

interface FeedCardProps {
  item: FeedItem;
  onSelect?: (item: FeedItem) => void;
  onAction?: (item: FeedItem, action: string) => void;
  onSnooze?: (item: FeedItem) => void;
  onDismiss?: (item: FeedItem) => void;
  selected?: boolean;
  compact?: boolean;
}

/**
 * Format impact for display
 */
function formatImpact(impact: FeedItem['impact']): string | null {
  if (impact.amount_try) {
    return `${formatCompactNumber(impact.amount_try)} TL`;
  }
  if (impact.pct !== undefined) {
    return `%${impact.pct.toFixed(1)}`;
  }
  if (impact.points !== undefined) {
    return `${impact.points} puan`;
  }
  return null;
}

/**
 * Get time ago string
 */
function getTimeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}dk önce`;
  if (diffHours < 24) return `${diffHours}sa önce`;
  return `${diffDays}g önce`;
}

export function FeedCard({
  item,
  onSelect,
  onAction,
  onSnooze,
  onDismiss,
  selected = false,
  compact = false,
}: FeedCardProps) {
  const severityConfig = SEVERITY_CONFIG[item.severity];
  const categoryConfig = CATEGORY_CONFIG[item.category];
  const impactDisplay = formatImpact(item.impact);
  const timeAgo = getTimeAgo(item.created_at);

  const handleClick = () => {
    onSelect?.(item);
  };

  const handleActionClick = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    onAction?.(item, action);
  };

  const handleSnooze = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSnooze?.(item);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss?.(item);
  };

  return (
    <div
      data-feed-card
      data-card-id={item.id}
      onClick={handleClick}
      className={`
        group relative
        bg-white rounded-lg border-l-4 ${severityConfig.borderColor}
        border border-slate-200
        p-4
        transition-all duration-200
        hover:shadow-md hover:border-slate-300
        cursor-pointer
        ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        ${compact ? 'p-3' : 'p-4'}
      `}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      {/* Top Row: Category + Severity + Time */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {/* Category badge */}
          <span className={`text-xs font-medium ${categoryConfig.color} flex items-center gap-1`}>
            <span>{categoryConfig.icon}</span>
            <span>{categoryConfig.label}</span>
          </span>

          {/* Severity badge */}
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${severityConfig.bgColor} ${severityConfig.color}`}>
            {severityConfig.label}
          </span>
        </div>

        {/* Time + Actions */}
        <div className="flex items-center gap-2">
          {timeAgo && (
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo}
            </span>
          )}

          {/* Snooze/Dismiss buttons (show on hover) */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            {item.snoozeable && (
              <button
                onClick={handleSnooze}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                title="Ertele"
              >
                <Clock className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              title="Kapat"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Title */}
      <h3 className={`font-semibold text-slate-900 ${compact ? 'text-sm' : 'text-base'} line-clamp-1`}>
        {item.title}
      </h3>

      {/* Summary */}
      <p className={`text-slate-600 mt-1 line-clamp-2 ${compact ? 'text-xs' : 'text-sm'}`}>
        {item.summary}
      </p>

      {/* Bottom Row: Impact + Actions */}
      <div className="flex items-center justify-between mt-3">
        {/* Impact */}
        {impactDisplay && (
          <span className={`text-sm font-bold ${severityConfig.color}`}>
            {impactDisplay}
          </span>
        )}
        {!impactDisplay && <span />}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {item.actions.slice(0, 2).map((action, idx) => (
            <button
              key={idx}
              onClick={(e) => handleActionClick(e, action.action)}
              className={`
                text-xs font-medium px-2.5 py-1 rounded transition-colors
                ${idx === 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }
              `}
            >
              {action.label}
            </button>
          ))}

          {/* Expand indicator */}
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>
      </div>

      {/* Evidence count indicator */}
      {item.evidence_refs.length > 0 && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[9px] text-slate-400">
            {item.evidence_refs.length} kanıt
          </span>
        </div>
      )}
    </div>
  );
}
