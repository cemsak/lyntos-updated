'use client';

import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { PeriodData } from '../_types/client';

interface PeriodDataRowProps {
  period: PeriodData;
}

function DataIcon({ hasData, label }: { hasData: boolean; label: string }) {
  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
        hasData
          ? 'bg-[#ECFDF5] text-[#00804D]'
          : 'bg-[#F5F6F8] text-[#969696]'
      }`}
      title={hasData ? `${label} yüklü` : `${label} yüklenmemiş`}
    >
      {hasData ? (
        <CheckCircle2 className="w-3 h-3" />
      ) : (
        <XCircle className="w-3 h-3" />
      )}
      <span>{label}</span>
    </div>
  );
}

export function PeriodDataRow({ period }: PeriodDataRowProps) {
  const { data, analysis } = period;

  return (
    <div className="flex items-center justify-between py-2 px-3 bg-[#F5F6F8] rounded-lg text-sm">
      <div className="flex items-center gap-2">
        <span className="font-medium text-[#5A5A5A]">{period.period_label}</span>
        {analysis.has_results && (
          <span className="text-xs text-[#0049AA]">
            ({analysis.finding_count} bulgu)
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        <DataIcon hasData={data.mizan} label="Mizan" />
        <DataIcon hasData={data.beyanname} label="Beyan" />
        <DataIcon hasData={data.banka} label="Banka" />
        <DataIcon hasData={data.edefter} label="E-Defter" />
        <DataIcon hasData={data.tahakkuk} label="Tahakkuk" />
      </div>
    </div>
  );
}
