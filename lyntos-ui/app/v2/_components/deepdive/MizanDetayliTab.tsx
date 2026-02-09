'use client';
import React from 'react';
import { formatCurrency } from '../../_lib/format';
import {
  AlertTriangle,
  Search,
} from 'lucide-react';
import type { MizanHesap, VdkRiskBulgusu } from './mizanOmurgaTypes';

interface DetayliMizanTabProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filteredMizan: MizanHesap[];
  vdkBulgular: VdkRiskBulgusu[];
  toplamBorc: number;
  toplamAlacak: number;
  fark: number;
  setSelectedHesapKodu: (val: string | null) => void;
}

export function MizanDetayliTab({
  searchTerm,
  setSearchTerm,
  filteredMizan,
  vdkBulgular,
  toplamBorc,
  toplamAlacak,
  fark,
  setSelectedHesapKodu,
}: DetayliMizanTabProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#969696]" />
        <input
          type="text"
          placeholder="Hesap kodu veya adı ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A651]"
        />
      </div>

      <div className="overflow-x-auto max-h-80 overflow-y-auto border border-[#E5E5E5] rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F6F8] sticky top-0">
            <tr>
              <th className="text-left p-2 font-medium text-[#5A5A5A]">Hesap</th>
              <th className="text-left p-2 font-medium text-[#5A5A5A]">Grup</th>
              <th className="text-right p-2 font-medium text-[#5A5A5A]">Borç</th>
              <th className="text-right p-2 font-medium text-[#5A5A5A]">Alacak</th>
              <th className="text-right p-2 font-medium text-[#5A5A5A]">Bakiye</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {filteredMizan.map((hesap, index) => {
              const vdkRiskli = vdkBulgular.some(b => b.hesapKodu.includes(hesap.kod));
              return (
                <tr key={hesap.kod || `hesap-${index}`} className={`hover:bg-[#F5F6F8] ${vdkRiskli ? 'bg-[#FEF2F2]' : ''}`}>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      {vdkRiskli && <AlertTriangle className="w-3 h-3 text-[#F0282D]" />}
                      <div>
                        <button
                          onClick={() => setSelectedHesapKodu(hesap.kod.slice(0, 3))}
                          className="font-mono text-xs text-[#0049AA] hover:text-[#00287F] hover:underline cursor-pointer"
                          title="Hesap Kartını Aç"
                        >
                          {hesap.kod}
                        </button>
                        <p className="text-[#2E2E2E] text-xs">{hesap.ad}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-2 text-xs text-[#969696]">{hesap.grup}</td>
                  <td className="p-2 text-right font-mono text-xs text-[#5A5A5A]">{formatCurrency(hesap.borc)}</td>
                  <td className="p-2 text-right font-mono text-xs text-[#5A5A5A]">{formatCurrency(hesap.alacak)}</td>
                  <td className="p-2 text-right">
                    <span className={`font-mono text-xs font-medium ${hesap.bakiye >= 0 ? 'text-[#2E2E2E]' : 'text-[#BF192B]'}`}>
                      {formatCurrency(hesap.bakiye)} {hesap.bakiyeYonu}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-[#F5F6F8] font-medium">
            <tr>
              <td className="p-2 text-xs" colSpan={2}>TOPLAM</td>
              <td className="p-2 text-right font-mono text-xs">{formatCurrency(toplamBorc)}</td>
              <td className="p-2 text-right font-mono text-xs">{formatCurrency(toplamAlacak)}</td>
              <td className="p-2 text-right font-mono text-xs">{formatCurrency(fark)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
