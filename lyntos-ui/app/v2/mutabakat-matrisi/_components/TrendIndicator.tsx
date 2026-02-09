'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { TrendData } from '../_types/crossCheck';

interface TrendIndicatorProps {
  trend: TrendData;
}

export function TrendIndicator({ trend }: TrendIndicatorProps) {
  if (trend.direction === 'no_history') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-[#969696]" title="Gecmis donem verisi yok">
        <Minus className="w-3 h-3" />
      </span>
    );
  }

  const config = {
    up: { Icon: TrendingUp, color: 'text-[#BF192B]', label: `+%${trend.change_pct.toFixed(0)}` },
    down: { Icon: TrendingDown, color: 'text-[#00804D]', label: `-%${trend.change_pct.toFixed(0)}` },
    stable: { Icon: Minus, color: 'text-[#969696]', label: '' },
  }[trend.direction] || { Icon: Minus, color: 'text-[#969696]', label: '' };

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${config.color}`}
      title={trend.aciklama}
    >
      <config.Icon className="w-3 h-3" />
      {config.label && <span>{config.label}</span>}
    </span>
  );
}
