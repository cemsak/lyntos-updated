import React from 'react';
import type { DikeyYapiOzeti } from './yatayDikeyTypes';
import { formatNumber } from '../../_lib/format';

interface DikeySummaryCardsProps {
  yapiOzeti: DikeyYapiOzeti;
}

export function DikeySummaryCards({ yapiOzeti }: DikeySummaryCardsProps) {
  const formatCurrency = (n: number) => formatNumber(n);

  return (
    <>
      {/* Aktif / Pasif Yapı Kartları */}
      <div className="grid grid-cols-2 gap-2">
        {/* Aktif Taraf */}
        <div className="p-3 bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg">
          <p className="text-[10px] text-[#0049AA] font-semibold uppercase mb-2">Aktif</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-[#5A5A5A]">Dönen Varlıklar</span>
              <span className="font-mono font-semibold text-[#2E2E2E]">
                %{yapiOzeti.donen_varliklar.oran_aktif.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5A5A5A]">Duran Varlıklar</span>
              <span className="font-mono font-semibold text-[#2E2E2E]">
                %{yapiOzeti.duran_varliklar.oran_aktif.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between border-t border-[#ABEBFF] pt-1 mt-1">
              <span className="text-[#0049AA] font-semibold">Toplam Aktif</span>
              <span className="font-mono font-bold text-[#0049AA]">
                {formatCurrency(yapiOzeti.toplam_aktif)} TL
              </span>
            </div>
          </div>
        </div>

        {/* Pasif Taraf */}
        <div className="p-3 bg-[#ECFDF5] border border-[#AAE8B8] rounded-lg">
          <p className="text-[10px] text-[#00804D] font-semibold uppercase mb-2">Pasif</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-[#5A5A5A]">KVYK</span>
              <span className="font-mono font-semibold text-[#2E2E2E]">
                %{yapiOzeti.kvyk.oran_pasif.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5A5A5A]">UVYK</span>
              <span className="font-mono font-semibold text-[#2E2E2E]">
                %{yapiOzeti.uvyk.oran_pasif.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5A5A5A]">Özkaynaklar</span>
              <span className="font-mono font-semibold text-[#2E2E2E]">
                %{yapiOzeti.ozkaynaklar.oran_pasif.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between border-t border-[#AAE8B8] pt-1 mt-1">
              <span className="text-[#00804D] font-semibold">Toplam Pasif</span>
              <span className="font-mono font-bold text-[#00804D]">
                {formatCurrency(yapiOzeti.toplam_pasif)} TL
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Brüt Kar Marjı */}
      <div className="p-3 bg-[#F5F6F8] rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-xs">
            <span className="text-[#969696]">Net Satışlar: </span>
            <span className="font-mono font-semibold text-[#2E2E2E]">
              {formatCurrency(yapiOzeti.net_satislar)} TL
            </span>
          </div>
          <div className="text-xs">
            <span className="text-[#969696]">SMM: </span>
            <span className="font-mono font-semibold text-[#2E2E2E]">
              {formatCurrency(yapiOzeti.smm)} TL
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[#969696]">Brüt Kar Marjı</p>
          <p className={`text-sm font-bold ${
            yapiOzeti.brut_kar_marji >= 15 ? 'text-[#00A651]' :
            yapiOzeti.brut_kar_marji >= 5 ? 'text-[#FA841E]' : 'text-[#BF192B]'
          }`}>
            %{yapiOzeti.brut_kar_marji.toFixed(1)}
          </p>
        </div>
      </div>
    </>
  );
}
