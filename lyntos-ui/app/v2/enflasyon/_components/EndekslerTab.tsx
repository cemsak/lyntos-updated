'use client';

import React from 'react';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { YIUFE_DATA } from '../_lib/constants';

export function EndekslerTab() {
  const sortedEntries = Object.entries(YIUFE_DATA).sort(([a], [b]) => b.localeCompare(a));

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E5E5] bg-gradient-to-r from-[#F5F6F8] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0078D0] to-[#0078D0] flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-[#2E2E2E]">Yİ-ÜFE Endeks Tablosu</h3>
              <p className="text-sm text-[#969696]">TÜİK Yurt İçi Üretici Fiyat Endeksi</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#E5E5E5]">
                  <th className="text-left py-3 px-4 font-bold text-[#5A5A5A]">Dönem</th>
                  <th className="text-right py-3 px-4 font-bold text-[#5A5A5A]">Endeks</th>
                  <th className="text-right py-3 px-4 font-bold text-[#5A5A5A]">Katsayı (→ 2025/12)</th>
                  <th className="text-right py-3 px-4 font-bold text-[#5A5A5A]">Değişim</th>
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map(([date, value], index) => {
                  const katsayi = YIUFE_DATA['2025-12'] / value;
                  const prevEntry = sortedEntries[index + 1];
                  const change = prevEntry ? ((value - prevEntry[1]) / prevEntry[1]) * 100 : 0;

                  return (
                    <tr key={date} className="border-b border-[#E5E5E5] hover:bg-[#F5F6F8] transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#2E2E2E]">{date.replace('-', '/')}</td>
                      <td className="py-3 px-4 text-right text-[#5A5A5A]">{value.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-bold text-[#0049AA]">{katsayi.toFixed(4)}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {change > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[#00804D] font-medium">
                            <TrendingUp className="w-3 h-3" />
                            +{change.toFixed(1)}%
                          </span>
                        ) : change < 0 ? (
                          <span className="inline-flex items-center gap-1 text-[#BF192B] font-medium">
                            <TrendingDown className="w-3 h-3" />
                            {change.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-[#969696]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-[#969696] mt-4">
            Kaynak: TÜİK. Aralık 2025 değeri tahminidir, güncel değeri{' '}
            <a
              href="https://data.tuik.gov.tr/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0049AA] hover:underline"
            >
              TÜİK
            </a>
            &apos;ten alınız.
          </p>
        </div>
      </div>
    </div>
  );
}
