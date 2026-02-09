'use client';

/**
 * KpiCard
 * Compact KPI display card for the Kurumlar Vergisi page
 */

import React from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';

export interface KpiCardProps {
  label: string;
  value: string;
  trend?: { value: string; direction: 'up' | 'down' };
  status?: 'success' | 'warning' | 'error' | 'neutral';
  loading?: boolean;
}

const STATUS_COLORS = {
  success: 'text-[#00804D]',
  warning: 'text-[#FA841E]',
  error: 'text-[#BF192B]',
  neutral: 'text-[#5A5A5A]',
};

export function KpiCard({ label, value, trend, status = 'neutral', loading }: KpiCardProps) {
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-lg p-4">
      <p className="text-xs text-[#969696] uppercase tracking-wide">{label}</p>
      {loading ? (
        <div className="h-8 mt-1 flex items-center">
          <Loader2 className="w-5 h-5 text-[#969696] animate-spin" />
        </div>
      ) : (
        <>
          <p className={`text-2xl font-bold mt-1 ${STATUS_COLORS[status]}`}>{value}</p>
          {trend && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${
              trend.direction === 'up' ? 'text-[#00804D]' : 'text-[#BF192B]'
            }`}>
              <TrendingUp className={`w-3 h-3 ${trend.direction === 'down' ? 'rotate-180' : ''}`} />
              {trend.value}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default KpiCard;
