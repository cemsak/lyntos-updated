'use client';

import React, { useState } from 'react';
import { Calculator, Info } from 'lucide-react';
import { formatCurrency } from '../../_lib/format';
import { GUNCEL_ORANLAR_2026, SIRKET_ISLEMLERI } from '../_lib/constants';
import type { HarcHesapSonuc } from '../_types/corporate';

export function HarcHesaplayiciPanel() {
  const [harcForm, setHarcForm] = useState({ islemTuru: 'kurulus-as', sermaye: '' });
  const [harcSonuc, setHarcSonuc] = useState<HarcHesapSonuc | null>(null);

  const handleHarcHesapla = () => {
    const sermaye = parseFloat(harcForm.sermaye) || 0;
    const islem = SIRKET_ISLEMLERI.find(i => i.id === harcForm.islemTuru);
    if (islem && sermaye > 0) {
      const damgaVergisi = sermaye * islem.damgaVergisiOrani;
      const tesciHarci = GUNCEL_ORANLAR_2026.ticaretSicilHarci.tesciHarci;
      const ilanHarci = GUNCEL_ORANLAR_2026.ticaretSicilHarci.ilanHarci;
      const noterMasrafi = GUNCEL_ORANLAR_2026.noterHarclari.imzaTasdik * 10;
      setHarcSonuc({
        damgaVergisi,
        tesciHarci,
        ilanHarci,
        noterMasrafi,
        toplam: damgaVergisi + tesciHarci + ilanHarci + noterMasrafi,
      });
    }
  };

  const selectedIslem = SIRKET_ISLEMLERI.find(i => i.id === harcForm.islemTuru);

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-sm">
        <h3 className="text-lg font-bold text-[#2E2E2E] mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-[#00A651]" />
          Harç ve Maliyet Hesaplayıcı
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-[#5A5A5A] mb-2">İşlem Türü</label>
            <select
              value={harcForm.islemTuru}
              onChange={(e) => setHarcForm({ ...harcForm, islemTuru: e.target.value })}
              className="w-full px-4 py-3 border border-[#E5E5E5] rounded-xl focus:ring-2 focus:ring-[#0049AA] focus:border-[#0049AA] transition-all"
            >
              {SIRKET_ISLEMLERI.map(islem => (
                <option key={islem.id} value={islem.id}>{islem.kod} - {islem.ad}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#5A5A5A] mb-2">Sermaye Tutarı (TL)</label>
            <input
              type="number"
              value={harcForm.sermaye}
              onChange={(e) => setHarcForm({ ...harcForm, sermaye: e.target.value })}
              placeholder="1.000.000"
              className="w-full px-4 py-3 border border-[#E5E5E5] rounded-xl focus:ring-2 focus:ring-[#0049AA] focus:border-[#0049AA] transition-all"
            />
          </div>
        </div>

        <button
          onClick={handleHarcHesapla}
          className="px-6 py-3 bg-gradient-to-r from-[#00A651] to-[#00804D] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
        >
          Hesapla
        </button>

        {/* Sonuç */}
        {harcSonuc && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-[#2E2E2E]">Maliyet Detayı</h4>
              {[
                { label: 'Damga Vergisi', value: harcSonuc.damgaVergisi },
                { label: 'Tescil Harcı', value: harcSonuc.tesciHarci },
                { label: 'İlan Harcı', value: harcSonuc.ilanHarci },
                { label: 'Noter Masrafı (Tahmini)', value: harcSonuc.noterMasrafi },
              ].map((item, i) => (
                <div key={i} className="flex justify-between p-3 bg-[#F5F6F8] rounded-xl">
                  <span className="text-[#5A5A5A]">{item.label}</span>
                  <span className="font-semibold text-[#2E2E2E]">{formatCurrency(item.value, { decimals: 0 })}</span>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="p-5 bg-gradient-to-br from-[#E6F9FF] to-[#ABEBFF] rounded-2xl border border-[#0049AA]">
                <p className="text-sm text-[#0049AA] font-medium">Toplam Maliyet</p>
                <p className="text-4xl font-black text-[#0049AA]">{formatCurrency(harcSonuc.toplam, { decimals: 0 })}</p>
              </div>

              {selectedIslem && (
                <div className="p-4 bg-[#ECFDF5] rounded-2xl border border-[#00A651]/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-[#00804D]" />
                    <p className="text-sm text-[#00804D] font-medium">Vergi Avantajı Notu</p>
                  </div>
                  <p className="text-xs text-[#2E2E2E] leading-relaxed">{selectedIslem.vergiAvantaji}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
