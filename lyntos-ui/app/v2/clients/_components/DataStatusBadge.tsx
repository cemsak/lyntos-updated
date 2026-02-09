'use client';

import React from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import type { DataStatus } from '../_types/client';

interface DataStatusBadgeProps {
  status: DataStatus;
}

export function DataStatusBadge({ status }: DataStatusBadgeProps) {
  const { summary } = status;

  if (summary.total_periods === 0) {
    return (
      <div className="flex items-center gap-1.5 text-[#FA841E]">
        <AlertCircle className="w-4 h-4" />
        <span className="text-xs font-medium">Dönem yok</span>
      </div>
    );
  }

  if (!summary.has_mizan) {
    return (
      <div className="flex items-center gap-1.5 text-[#BF192B]">
        <XCircle className="w-4 h-4" />
        <span className="text-xs font-medium">Veri yüklenmemiş</span>
      </div>
    );
  }

  if (summary.data_complete) {
    return (
      <div className="flex items-center gap-1.5 text-[#00804D]">
        <CheckCircle2 className="w-4 h-4" />
        <span className="text-xs font-medium">
          {summary.complete_periods}/{summary.total_periods} dönem hazır
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-[#FA841E]">
      <AlertCircle className="w-4 h-4" />
      <span className="text-xs font-medium">
        {summary.complete_periods}/{summary.total_periods} dönem
      </span>
    </div>
  );
}
