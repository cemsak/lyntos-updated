'use client';

// ════════════════════════════════════════════════════════════════════════════
// KpiCard - Individual KPI metric card
// ════════════════════════════════════════════════════════════════════════════

import { Badge, BadgeVariant } from '../shared/Badge';

export type KpiTrend = 'up' | 'down' | 'neutral';

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: KpiTrend;
  trendValue?: string;
  status?: BadgeVariant;
  statusLabel?: string;
  subtitle?: string;
  loading?: boolean;
  advancedMode?: boolean;
  technicalId?: string;
}

const trendIcons: Record<KpiTrend, JSX.Element> = {
  up: (
    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  ),
  down: (
    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  ),
  neutral: (
    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
    </svg>
  ),
};

export function KpiCard({
  label,
  value,
  unit,
  trend,
  trendValue,
  status,
  statusLabel,
  subtitle,
  loading = false,
  advancedMode = false,
  technicalId
}: KpiCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
        <div className="h-3 bg-gray-200 rounded w-2/3 mb-3" />
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Header row */}
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </span>
        {status && statusLabel && (
          <Badge variant={status}>{statusLabel}</Badge>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-2xl font-bold text-gray-900 tabular-nums">
          {typeof value === 'number' ? value.toLocaleString('tr-TR') : value}
        </span>
        {unit && (
          <span className="text-sm text-gray-500">{unit}</span>
        )}
      </div>

      {/* Trend or subtitle */}
      <div className="flex items-center gap-2">
        {trend && trendValue && (
          <div className="flex items-center gap-1">
            {trendIcons[trend]}
            <span className={`text-xs font-medium ${
              trend === 'up' ? 'text-green-600' :
              trend === 'down' ? 'text-red-600' :
              'text-gray-500'
            }`}>
              {trendValue}
            </span>
          </div>
        )}
        {subtitle && (
          <span className="text-xs text-gray-500">{subtitle}</span>
        )}
      </div>

      {/* Technical ID - only shown in advanced mode */}
      {advancedMode && technicalId && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <span className="text-[10px] font-mono text-gray-400">{technicalId}</span>
        </div>
      )}
    </div>
  );
}

export default KpiCard;
