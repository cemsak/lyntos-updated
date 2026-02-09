import React from 'react';
import { TrendingUp } from 'lucide-react';
import type { YiufeData } from './inflationTypes';

interface YiufeIndicatorsProps {
  yiufeData: YiufeData;
  hasYiufeData: boolean;
}

export function YiufeIndicators({ yiufeData, hasYiufeData }: YiufeIndicatorsProps) {
  return (
    <div className="mb-3 p-3 bg-gradient-to-r from-[#E6F9FF] to-[#E6F9FF] rounded-lg border border-[#E6F9FF]">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-4 h-4 text-[#0049AA]" />
        <span className="text-xs font-semibold text-[#00287F]">
          Yİ-ÜFE Göstergeleri {yiufeData.referansTarih ? `(${yiufeData.referansTarih})` : ''}
        </span>
      </div>
      {yiufeData.isLoading ? (
        <div className="text-center py-4">
          <p className="text-xs text-[#969696]">Yİ-ÜFE verileri yükleniyor...</p>
        </div>
      ) : yiufeData.error ? (
        <div className="text-center py-4">
          <p className="text-xs text-[#F0282D]">{yiufeData.error}</p>
        </div>
      ) : hasYiufeData ? (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2 bg-white rounded border border-[#E6F9FF]">
            <p className="text-[10px] text-[#969696] mb-0.5">Son 3 Yıl</p>
            <p className="text-lg font-bold text-[#0049AA]">%{yiufeData.son3Yil}</p>
            <p className={`text-[10px] ${yiufeData.son3Yil! > yiufeData.son3YilEsik ? 'text-[#00804D]' : 'text-[#969696]'}`}>
              Eşik %{yiufeData.son3YilEsik} {yiufeData.son3Yil! > yiufeData.son3YilEsik ? '✓' : ''}
            </p>
          </div>
          <div className="p-2 bg-white rounded border border-[#E6F9FF]">
            <p className="text-[10px] text-[#969696] mb-0.5">Son 12 Ay</p>
            <p className="text-lg font-bold text-[#0049AA]">%{yiufeData.son12Ay}</p>
            <p className={`text-[10px] ${yiufeData.son12Ay! > yiufeData.son12AyEsik ? 'text-[#00804D]' : 'text-[#969696]'}`}>
              Eşik %{yiufeData.son12AyEsik} {yiufeData.son12Ay! > yiufeData.son12AyEsik ? '✓' : ''}
            </p>
          </div>
          <div className="p-2 bg-white rounded border border-[#E6F9FF]">
            <p className="text-[10px] text-[#969696] mb-0.5">Düzeltme Katsayısı</p>
            <p className="text-lg font-bold text-[#0049AA]">{yiufeData.duzeltmeKatsayisi}</p>
            <p className="text-[10px] text-[#969696]">TÜİK Kaynak</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2 bg-white rounded border border-[#E6F9FF]">
            <p className="text-[10px] text-[#969696] mb-0.5">Son 3 Yıl</p>
            <p className="text-lg font-bold text-[#969696]">---</p>
            <p className="text-[10px] text-[#969696]">Eşik %{yiufeData.son3YilEsik}</p>
          </div>
          <div className="p-2 bg-white rounded border border-[#E6F9FF]">
            <p className="text-[10px] text-[#969696] mb-0.5">Son 12 Ay</p>
            <p className="text-lg font-bold text-[#969696]">---</p>
            <p className="text-[10px] text-[#969696]">Eşik %{yiufeData.son12AyEsik}</p>
          </div>
          <div className="p-2 bg-white rounded border border-[#E6F9FF]">
            <p className="text-[10px] text-[#969696] mb-0.5">Düzeltme Katsayısı</p>
            <p className="text-lg font-bold text-[#969696]">---</p>
            <p className="text-[10px] text-[#0078D0]">TCMB EVDS bekleniyor</p>
          </div>
        </div>
      )}
    </div>
  );
}
