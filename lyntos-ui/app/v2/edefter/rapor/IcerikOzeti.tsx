'use client';

import { FileText, Hash, DollarSign, FileCheck } from 'lucide-react';
import type { RaporSummary } from './types';
import { formatNumber } from './types';
import { formatCurrency } from '../../_lib/format';

interface IcerikOzetiProps {
  raporCount: number;
  summary: RaporSummary | null;
}

export function IcerikOzeti({ raporCount, summary }: IcerikOzetiProps) {
  return (
    <div className="px-6 py-4">
      <h2 className="text-sm font-semibold text-[#5A5A5A] mb-3 flex items-center gap-2">
        <FileCheck className="w-4 h-4" />
        E-Defter İçerik Özeti
      </h2>
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-[#E5E5E5]">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-[#0049AA]" />
            <p className="text-sm text-[#969696]">Yüklenen Dosya</p>
          </div>
          <p className="text-2xl font-bold text-[#2E2E2E]">{raporCount}</p>
          <p className="text-xs text-[#969696] mt-1">adet e-defter</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#E5E5E5]">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-5 h-5 text-[#0049AA]" />
            <p className="text-sm text-[#969696]">Toplam Fiş</p>
          </div>
          <p className="text-2xl font-bold text-[#2E2E2E]">{formatNumber(summary?.toplam_fis || 0)}</p>
          <p className="text-xs text-[#969696] mt-1">yevmiye maddesi</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#E5E5E5]">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-[#00804D]" />
            <p className="text-sm text-[#969696]">Toplam Borç</p>
          </div>
          <p className="text-xl font-bold text-[#2E2E2E]">{formatCurrency(summary?.toplam_borc || 0)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#E5E5E5]">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-[#BF192B]" />
            <p className="text-sm text-[#969696]">Toplam Alacak</p>
          </div>
          <p className="text-xl font-bold text-[#2E2E2E]">{formatCurrency(summary?.toplam_alacak || 0)}</p>
        </div>
      </div>
    </div>
  );
}
