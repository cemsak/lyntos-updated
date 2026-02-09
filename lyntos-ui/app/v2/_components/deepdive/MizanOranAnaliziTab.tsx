'use client';
import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import { ORAN_KATEGORILERI } from './mizanOmurgaConstants';
import { formatValue } from './mizanOmurgaHelpers';
import type { OranAnalizi } from './mizanOmurgaTypes';

interface OranAnaliziTabProps {
  selectedOranKategori: keyof typeof ORAN_KATEGORILERI | 'TUMU';
  setSelectedOranKategori: (val: keyof typeof ORAN_KATEGORILERI | 'TUMU') => void;
  filteredOranlar: OranAnalizi[];
}

export function MizanOranAnaliziTab({
  selectedOranKategori,
  setSelectedOranKategori,
  filteredOranlar,
}: OranAnaliziTabProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedOranKategori('TUMU')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            selectedOranKategori === 'TUMU'
              ? 'bg-[#2E2E2E] text-white'
              : 'bg-[#F5F6F8] text-[#5A5A5A] hover:bg-[#E5E5E5]'
          }`}
        >
          Tümü
        </button>
        {Object.entries(ORAN_KATEGORILERI).map(([key, kat]) => {
          const Icon = kat.icon;
          return (
            <button
              key={key}
              onClick={() => setSelectedOranKategori(key as keyof typeof ORAN_KATEGORILERI)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                selectedOranKategori === key
                  ? `bg-${kat.renk}-600 text-white`
                  : 'bg-[#F5F6F8] text-[#5A5A5A] hover:bg-[#E5E5E5]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {kat.baslik}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F6F8]">
            <tr>
              <th className="text-left p-2 font-medium text-[#5A5A5A]">Oran</th>
              <th className="text-right p-2 font-medium text-[#5A5A5A]">Değer</th>
              <th className="text-center p-2 font-medium text-[#5A5A5A]">Normal</th>
              <th className="text-center p-2 font-medium text-[#5A5A5A]">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {filteredOranlar.map((oran, i) => {
              const kat = ORAN_KATEGORILERI[oran.kategori];
              return (
                <tr key={i} className="hover:bg-[#F5F6F8]">
                  <td className="p-2">
                    <div className="flex items-start gap-2">
                      <div className={`w-1 h-8 rounded-full bg-${kat.renk}-400`} />
                      <div>
                        <p className="font-medium text-[#2E2E2E] text-xs">{oran.ad}</p>
                        <p className="text-[10px] text-[#969696]">{oran.yorum}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-2 text-right">
                    <span className={`font-mono font-semibold ${
                      oran.durum === 'kritik' ? 'text-[#BF192B]' :
                      oran.durum === 'uyari' ? 'text-[#FA841E]' : 'text-[#2E2E2E]'
                    }`}>
                      {formatValue(oran.deger, oran.birim)}
                    </span>
                  </td>
                  <td className="p-2 text-center text-[10px] text-[#969696]">
                    {oran.normalAralik.min}-{oran.normalAralik.max}
                    {oran.birim === '%' ? '%' : oran.birim === 'gun' ? ' gün' : 'x'}
                  </td>
                  <td className="p-2 text-center">
                    {oran.durum === 'normal' ? (
                      <CheckCircle2 className="w-4 h-4 text-[#00A651] inline" />
                    ) : oran.durum === 'uyari' ? (
                      <AlertCircle className="w-4 h-4 text-[#FFB114] inline" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-[#F0282D] inline" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
