import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { YatayData } from './yatayDikeyTypes';

interface YataySummaryCardsProps {
  data: YatayData;
}

export function YataySummaryCards({ data }: YataySummaryCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <div className="p-3 bg-[#F5F6F8] rounded-lg text-center">
        <p className="text-[10px] text-[#969696] uppercase">Dönem Karşılaştırma</p>
        <p className="text-xs font-semibold text-[#2E2E2E]">
          {data.onceki_period} <ArrowRight className="w-3 h-3 inline" /> {data.cari_period}
        </p>
      </div>
      <div className="p-3 bg-[#F5F6F8] rounded-lg text-center">
        <p className="text-[10px] text-[#969696] uppercase">Ciro Değişim</p>
        <p className={`text-sm font-bold ${
          data.ozet.ciro_degisim_yuzde >= 0 ? 'text-[#00A651]' : 'text-[#BF192B]'
        }`}>
          {data.ozet.ciro_degisim_yuzde >= 0 ? '+' : ''}
          {data.ozet.ciro_degisim_yuzde.toFixed(1)}%
        </p>
      </div>
      <div className="p-3 bg-[#FFFBEB] rounded-lg text-center">
        <p className="text-[10px] text-[#969696] uppercase">Material Değişim</p>
        <p className="text-sm font-bold text-[#FA841E]">
          {data.ozet.material_degisim_sayisi}
        </p>
      </div>
      <div className="p-3 bg-[#FEF2F2] rounded-lg text-center">
        <p className="text-[10px] text-[#969696] uppercase">Kritik</p>
        <p className="text-sm font-bold text-[#BF192B]">
          {data.ozet.kritik_sayisi}
        </p>
      </div>
    </div>
  );
}
