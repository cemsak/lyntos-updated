import React from 'react';
import type { BaseFinancialData } from './whatIfTypes';

interface BaseDataSummaryProps {
  baseData: BaseFinancialData;
  mizanLoading: boolean;
  hasMizanData: boolean;
  formatCurrency: (value: number) => string;
}

export function BaseDataSummary({
  baseData,
  mizanLoading,
  hasMizanData,
  formatCurrency,
}: BaseDataSummaryProps) {
  return (
      <div className="px-6 py-3 bg-[#F5F6F8] border-b border-[#E5E5E5]">
        <div className="flex items-center gap-6 text-[11px]">
          {mizanLoading ? (
            <span className="text-[#969696]">Mizan verisi yukleniyor...</span>
          ) : (
            <>
              <div>
                <span className="text-[#969696]">KV Matrahi:</span>{' '}
                <span className="font-medium text-[#5A5A5A]">
                  {baseData.kvMatrahi > 0
                    ? formatCurrency(baseData.kvMatrahi)
                    : 'Veri yok'}
                </span>
              </div>
              <div>
                <span className="text-[#969696]">Mevcut KV:</span>{' '}
                <span className="font-medium text-[#5A5A5A]">
                  {baseData.kvMatrahi > 0
                    ? formatCurrency(baseData.kvMatrahi * baseData.kvOrani)
                    : 'Veri yok'}
                </span>
              </div>
              <div>
                <span className="text-[#969696]">KV Orani:</span>{' '}
                <span className="font-medium text-[#5A5A5A]">
                  %{(baseData.kvOrani * 100).toFixed(0)}
                </span>
              </div>
              {hasMizanData && (
                <div>
                  <span className="px-1.5 py-0.5 bg-[#ECFDF5] text-[#00804D] rounded text-[9px] font-medium">
                    Mizan Verisi
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
  );
}
