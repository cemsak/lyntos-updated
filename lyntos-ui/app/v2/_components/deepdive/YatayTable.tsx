import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import type { YataySonuc } from './yatayDikeyTypes';
import { formatNumber } from '../../_lib/format';

interface YatayTableProps {
  items: YataySonuc[];
}

export function YatayTable({ items }: YatayTableProps) {
  const formatCurrency = (n: number) => formatNumber(n);

  return (
    <div className="overflow-x-auto max-h-80 overflow-y-auto border border-[#E5E5E5] rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-[#F5F6F8] sticky top-0">
          <tr>
            <th className="text-left p-2 font-medium text-[#5A5A5A] text-xs">Hesap</th>
            <th className="text-right p-2 font-medium text-[#5A5A5A] text-xs">Önceki</th>
            <th className="text-right p-2 font-medium text-[#5A5A5A] text-xs">Cari</th>
            <th className="text-right p-2 font-medium text-[#5A5A5A] text-xs">Değişim %</th>
            <th className="text-center p-2 font-medium text-[#5A5A5A] text-xs">Durum</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E5E5]">
          {items.map((s, i) => (
            <tr
              key={s.hesap_kodu || `yatay-${i}`}
              className={`hover:bg-[#F5F6F8] ${
                s.durum === 'kritik' ? 'bg-[#FEF2F2]' :
                s.durum === 'uyari' ? 'bg-[#FFFBEB]/50' : ''
              }`}
            >
              <td className="p-2">
                <p className="font-mono text-xs text-[#969696]">{s.hesap_kodu}</p>
                <p className="text-xs text-[#2E2E2E] truncate max-w-[180px]">{s.hesap_adi}</p>
                {s.neden && (
                  <p className="text-[10px] text-[#0049AA] mt-0.5 truncate max-w-[180px]">{s.neden}</p>
                )}
              </td>
              <td className="p-2 text-right font-mono text-xs text-[#5A5A5A]">
                {formatCurrency(s.onceki_bakiye)}
              </td>
              <td className="p-2 text-right font-mono text-xs text-[#5A5A5A]">
                {formatCurrency(s.cari_bakiye)}
              </td>
              <td className="p-2 text-right">
                <span className={`font-mono text-xs font-semibold flex items-center justify-end gap-0.5 ${
                  s.degisim_yuzde > 0 ? 'text-[#00A651]' :
                  s.degisim_yuzde < 0 ? 'text-[#BF192B]' : 'text-[#969696]'
                }`}>
                  {s.degisim_yuzde > 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : s.degisim_yuzde < 0 ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : null}
                  {s.degisim_yuzde > 0 ? '+' : ''}
                  {s.degisim_yuzde.toFixed(1)}%
                </span>
              </td>
              <td className="p-2 text-center">
                {s.durum === 'normal' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#00A651] inline" />
                ) : s.durum === 'uyari' ? (
                  <AlertCircle className="w-4 h-4 text-[#FFB114] inline" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[#F0282D] inline" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
