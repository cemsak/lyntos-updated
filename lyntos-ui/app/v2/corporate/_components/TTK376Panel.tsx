'use client';

import React, { useState } from 'react';
import {
  Shield,
  Scale,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { formatCurrency } from '../../_lib/format';
import { hesaplaTTK376 } from '../_lib/ttk376';
import type { TTK376Sonuc } from '../_types/corporate';

export function TTK376Panel() {
  const [ttk376Form, setTtk376Form] = useState({ sermaye: '', yedekler: '', ozvarlik: '' });
  const [ttk376Sonuc, setTtk376Sonuc] = useState<TTK376Sonuc | null>(null);

  const handleTTK376Hesapla = () => {
    const sermaye = parseFloat(ttk376Form.sermaye) || 0;
    const yedekler = parseFloat(ttk376Form.yedekler) || 0;
    const ozvarlik = parseFloat(ttk376Form.ozvarlik) || 0;
    if (sermaye > 0) setTtk376Sonuc(hesaplaTTK376(sermaye, yedekler, ozvarlik));
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-start gap-4 p-5 bg-gradient-to-r from-[#FEF2F2] to-[#FFC7C9] border border-[#F0282D] rounded-2xl">
        <div className="w-12 h-12 rounded-xl bg-[#F0282D] flex items-center justify-center flex-shrink-0">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h4 className="font-bold text-[#BF192B]">TTK 376 - Sermaye Kaybı ve Borca Batıklık</h4>
          <p className="text-sm text-[#BF192B] mt-1">
            Bu analiz, şirketin sermaye yapısını TTK 376 kapsamında değerlendirir.
            <span className="font-semibold"> Yönetim kurulu üyelerinin kişisel sorumluluğu söz konusu olabilir!</span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-sm">
        <h3 className="text-lg font-bold text-[#2E2E2E] mb-4 flex items-center gap-2">
          <Scale className="w-5 h-5 text-[#0049AA]" />
          Sermaye Kaybı Analizi
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-[#5A5A5A] mb-2">Sermaye (TL)</label>
            <input
              type="number"
              value={ttk376Form.sermaye}
              onChange={(e) => setTtk376Form({ ...ttk376Form, sermaye: e.target.value })}
              placeholder="1.000.000"
              className="w-full px-4 py-3 border border-[#E5E5E5] rounded-xl focus:ring-2 focus:ring-[#0049AA] focus:border-[#0049AA] transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#5A5A5A] mb-2">Kanuni Yedekler (TL)</label>
            <input
              type="number"
              value={ttk376Form.yedekler}
              onChange={(e) => setTtk376Form({ ...ttk376Form, yedekler: e.target.value })}
              placeholder="200.000"
              className="w-full px-4 py-3 border border-[#E5E5E5] rounded-xl focus:ring-2 focus:ring-[#0049AA] focus:border-[#0049AA] transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#5A5A5A] mb-2">Öz Varlık (TL)</label>
            <input
              type="number"
              value={ttk376Form.ozvarlik}
              onChange={(e) => setTtk376Form({ ...ttk376Form, ozvarlik: e.target.value })}
              placeholder="500.000"
              className="w-full px-4 py-3 border border-[#E5E5E5] rounded-xl focus:ring-2 focus:ring-[#0049AA] focus:border-[#0049AA] transition-all"
            />
          </div>
        </div>

        <button
          onClick={handleTTK376Hesapla}
          className="px-6 py-3 bg-gradient-to-r from-[#0049AA] to-[#0078D0] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
        >
          Analiz Et
        </button>

        {/* Sonuç */}
        {ttk376Sonuc && (
          <div className={`mt-6 p-6 rounded-2xl ${
            ttk376Sonuc.durum === 'saglikli' ? 'bg-gradient-to-br from-[#ECFDF5] to-[#AAE8B8] border-2 border-[#00A651]' :
            ttk376Sonuc.durum === 'yari_kayip' ? 'bg-gradient-to-br from-[#FFFBEB] to-[#FFE045] border-2 border-[#FFB114]' :
            'bg-gradient-to-br from-[#FEF2F2] to-[#FFC7C9] border-2 border-[#F0282D]'
          }`}>
            <div className="flex items-center gap-4 mb-4">
              {ttk376Sonuc.durum === 'saglikli' ? (
                <CheckCircle2 className="w-10 h-10 text-[#00804D]" />
              ) : ttk376Sonuc.durum === 'yari_kayip' ? (
                <AlertTriangle className="w-10 h-10 text-[#E67324]" />
              ) : (
                <XCircle className="w-10 h-10 text-[#BF192B]" />
              )}
              <div>
                <h4 className="text-xl font-black text-[#2E2E2E]">
                  {ttk376Sonuc.durum === 'saglikli' ? '✓ SAĞLIKLI' :
                   ttk376Sonuc.durum === 'yari_kayip' ? '⚠ YARI SERMAYE KAYBI' :
                   ttk376Sonuc.durum === 'ucte_iki_kayip' ? '🚨 2/3 SERMAYE KAYBI' :
                   '❌ BORÇA BATIK'}
                </h4>
                <p className="text-sm text-[#5A5A5A]">{ttk376Sonuc.ttkMadde}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-white/70 p-4 rounded-xl">
                <p className="text-xs text-[#969696]">Kayıp Oranı</p>
                <p className="text-2xl font-black text-[#2E2E2E]">%{ttk376Sonuc.kayipOrani.toFixed(1)}</p>
              </div>
              <div className="bg-white/70 p-4 rounded-xl">
                <p className="text-xs text-[#969696]">1/2 Eşiği</p>
                <p className="text-xl font-bold text-[#2E2E2E]">{formatCurrency(ttk376Sonuc.yariEsik, { decimals: 0 })}</p>
              </div>
              <div className="bg-white/70 p-4 rounded-xl">
                <p className="text-xs text-[#969696]">1/3 Eşiği</p>
                <p className="text-xl font-bold text-[#2E2E2E]">{formatCurrency(ttk376Sonuc.ucteBirEsik, { decimals: 0 })}</p>
              </div>
              <div className="bg-white/70 p-4 rounded-xl">
                <p className="text-xs text-[#969696]">Aksiyon Süresi</p>
                <p className="text-xl font-bold text-[#2E2E2E]">{ttk376Sonuc.aksiyonSuresi || '-'}</p>
              </div>
            </div>

            <div className="bg-white/80 p-4 rounded-xl">
              <p className="text-sm font-semibold text-[#5A5A5A] mb-1">Öneri:</p>
              <p className="text-[#5A5A5A]">{ttk376Sonuc.oneri}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
