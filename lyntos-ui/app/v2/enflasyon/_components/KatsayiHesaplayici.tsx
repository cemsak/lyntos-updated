'use client';

import { useState, useMemo } from 'react';
import { Calculator } from 'lucide-react';
import { formatCurrency } from '../../_lib/format';
import { YIUFE_DATA } from '../_lib/constants';
import { InflationGauge } from './InflationGauge';

export function KatsayiHesaplayici() {
  const [edinimTarihi, setEdinimTarihi] = useState('2020-12');
  const [bilancoTarihi] = useState('2025-12');
  const [degerBrut, setDegerBrut] = useState(1000000);

  const katsayi = useMemo(() => {
    const endEndeks = YIUFE_DATA[bilancoTarihi] || YIUFE_DATA['2025-12'];
    const baslangicEndeks = YIUFE_DATA[edinimTarihi] || YIUFE_DATA['2020-12'];
    return endEndeks / baslangicEndeks;
  }, [edinimTarihi, bilancoTarihi]);

  const duzeltilmisDeger = useMemo(() => degerBrut * katsayi, [degerBrut, katsayi]);
  const duzeltmeFarki = duzeltilmisDeger - degerBrut;

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E5E5E5] bg-gradient-to-r from-[#F5F6F8] to-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0078D0] to-[#0078D0] flex items-center justify-center">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-[#2E2E2E]">Hızlı Katsayı Hesaplayıcı</h3>
            <p className="text-sm text-[#969696]">Yİ-ÜFE endeks bazlı düzeltme hesabı</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sol - Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#5A5A5A] mb-2">Edinim Tarihi</label>
              <select
                value={edinimTarihi}
                onChange={(e) => setEdinimTarihi(e.target.value)}
                className="w-full px-4 py-3 border border-[#E5E5E5] rounded-xl focus:ring-2 focus:ring-[#0078D0] focus:border-[#0078D0] transition-all"
              >
                {Object.keys(YIUFE_DATA)
                  .sort()
                  .reverse()
                  .map((date) => (
                    <option key={date} value={date}>
                      {date.replace('-', '/')}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5A5A5A] mb-2">Brüt Değer (TL)</label>
              <input
                type="number"
                value={degerBrut}
                onChange={(e) => setDegerBrut(Number(e.target.value))}
                className="w-full px-4 py-3 border border-[#E5E5E5] rounded-xl focus:ring-2 focus:ring-[#0078D0] focus:border-[#0078D0] transition-all"
              />
            </div>

            {/* Hesaplama Formülü */}
            <div className="mt-4 p-4 bg-[#F5F6F8] rounded-xl border border-[#E5E5E5]">
              <p className="text-xs font-mono text-[#5A5A5A] space-y-1">
                <span className="block">Katsayı = Yİ-ÜFE ({bilancoTarihi}) / Yİ-ÜFE ({edinimTarihi})</span>
                <span className="block text-[#0049AA] font-semibold">
                  Katsayı = {YIUFE_DATA[bilancoTarihi]?.toFixed(2)} / {YIUFE_DATA[edinimTarihi]?.toFixed(2)} = {katsayi.toFixed(4)}
                </span>
              </p>
            </div>
          </div>

          {/* Sağ - Gauge & Results */}
          <div className="flex flex-col items-center justify-center">
            <InflationGauge katsayi={katsayi} size={180} />

            <div className="w-full mt-6 grid grid-cols-3 gap-3">
              <div className="p-4 bg-gradient-to-br from-[#E6F9FF] to-[#E6F9FF] rounded-xl text-center">
                <p className="text-[10px] text-[#0049AA] uppercase font-semibold">Düzeltme Katsayısı</p>
                <p className="text-xl font-black text-[#0049AA] mt-1">{katsayi.toFixed(4)}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-[#ECFDF5] to-[#ECFDF5] rounded-xl text-center">
                <p className="text-[10px] text-[#00804D] uppercase font-semibold">Düzeltilmiş Değer</p>
                <p className="text-lg font-black text-[#00804D] mt-1">{formatCurrency(duzeltilmisDeger, { decimals: 0 })}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-[#E6F9FF] to-[#E6F9FF] rounded-xl text-center">
                <p className="text-[10px] text-[#0049AA] uppercase font-semibold">Düzeltme Farkı</p>
                <p className="text-lg font-black text-[#0049AA] mt-1">{formatCurrency(duzeltmeFarki, { decimals: 0 })}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
