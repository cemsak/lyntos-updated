/**
 * C1 & C4: Denge Kontrolleri Paneli
 */

import { useState } from 'react';
import { Scale, ChevronDown, ChevronUp, BookOpen, FileSpreadsheet } from 'lucide-react';
import { CheckResult } from '../_types';
import { getSeverityBadge } from './StatusBadges';
import { formatCurrency } from '../../_lib/format';

interface BalanceChecksPanelProps {
  balanceChecks: CheckResult[];
}

export function BalanceChecksPanel({ balanceChecks }: BalanceChecksPanelProps) {
  const [showDetail, setShowDetail] = useState(true);

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
      <button
        onClick={() => setShowDetail(!showDetail)}
        className="w-full px-4 py-3 flex items-center justify-between bg-[#F5F6F8] border-b border-[#E5E5E5] hover:bg-[#F5F6F8]"
      >
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-[#5A5A5A]" />
          <span className="font-semibold text-[#2E2E2E]">Denge Kontrolleri</span>
          <span className="text-sm text-[#969696]">(C1: Yevmiye, C4: Mizan)</span>
        </div>
        {showDetail ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {showDetail && (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4">
            {balanceChecks.map((check) => {
              const isC1 = check.check_type === 'C1';
              return (
                <div
                  key={check.check_type}
                  className={`rounded-lg p-4 border ${
                    check.passed ? 'bg-[#ECFDF5] border-[#AAE8B8]' : 'bg-[#FEF2F2] border-[#FFC7C9]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {isC1 ? (
                        <BookOpen className={`w-5 h-5 ${check.passed ? 'text-[#00804D]' : 'text-[#BF192B]'}`} />
                      ) : (
                        <FileSpreadsheet className={`w-5 h-5 ${check.passed ? 'text-[#00804D]' : 'text-[#BF192B]'}`} />
                      )}
                      <div>
                        <span className="font-semibold">{check.check_type}: {check.check_name}</span>
                        <p className="text-xs text-[#969696]">{check.message}</p>
                      </div>
                    </div>
                    {getSeverityBadge(check.severity, check.passed)}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#5A5A5A]">Borç:</span>
                      <span className="font-mono">{formatCurrency(check.details.toplam_borc || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5A5A5A]">Alacak:</span>
                      <span className="font-mono">{formatCurrency(check.details.toplam_alacak || 0)}</span>
                    </div>
                    <div className={`flex justify-between font-semibold ${check.passed ? 'text-[#00804D]' : 'text-[#BF192B]'}`}>
                      <span>Fark:</span>
                      <span className="font-mono">{formatCurrency(check.details.fark || 0)}</span>
                    </div>
                    {isC1 && check.details.fis_sayisi !== undefined && (
                      <div className="flex justify-between text-[#969696] pt-2 border-t border-[#E5E5E5] mt-2">
                        <span>Fiş/Satır:</span>
                        <span>{check.details.fis_sayisi?.toLocaleString()} / {check.details.satir_sayisi?.toLocaleString()}</span>
                      </div>
                    )}
                    {!isC1 && check.details.hesap_sayisi !== undefined && (
                      <div className="flex justify-between text-[#969696] pt-2 border-t border-[#E5E5E5] mt-2">
                        <span>Hesap Sayısı:</span>
                        <span>{check.details.hesap_sayisi?.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
