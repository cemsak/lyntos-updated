'use client';

import React from 'react';
import { Badge } from '../../_components/shared/Badge';
import type { CheckSeverity } from '../_types/crossCheck';
import { SEVERITY_CONFIG } from '../_types/crossCheck';

interface ImpactTagProps {
  amount: number;
  severity: CheckSeverity;
  percentage?: number;
}

const formatTL = (val: number): string =>
  new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(val));

const severityBg: Record<CheckSeverity, string> = {
  critical: 'bg-[#FEF2F2] text-[#BF192B]',
  high: 'bg-[#FFFBEB] text-[#E67324]',
  medium: 'bg-[#FFFBEB] text-[#E67324]',
  low: 'bg-[#ECFDF5] text-[#00804D]',
  info: 'bg-[#E6F9FF] text-[#0049AA]',
};

export function ImpactTag({ amount, severity, percentage }: ImpactTagProps) {
  const config = SEVERITY_CONFIG[severity];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`px-2.5 py-1 rounded-lg font-mono text-sm font-semibold ${severityBg[severity]}`}>
        {amount >= 0 ? '+' : '-'}{formatTL(amount)} TL
      </span>
      <Badge variant={config.badgeVariant} size="xs" style="soft">
        {config.label}
      </Badge>
      {percentage !== undefined && percentage > 0 && (
        <span className="text-xs text-[#969696]">
          (%{percentage.toFixed(1)})
        </span>
      )}
    </div>
  );
}
