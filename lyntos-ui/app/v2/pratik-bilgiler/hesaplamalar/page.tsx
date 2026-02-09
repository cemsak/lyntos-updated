'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calculator, Percent, Users, TrendingDown, RefreshCw, Loader2, Briefcase, Clock, Stamp } from 'lucide-react';
import { formatNumber } from '../../_lib/format';
import { useTaxParams, paramValue, paramMeta } from '../_hooks/useTaxParams';
import KidemIhbarCalculator from './_components/KidemIhbarCalculator';
import DetayliGecikmeCalculator from './_components/DetayliGecikmeCalculator';
import DamgaVergisiCalculator from './_components/DamgaVergisiCalculator';

const TABS = [
  { id: 'gelir-vergisi', label: 'Gelir Vergisi', icon: Percent, color: '#0049AA' },
  { id: 'bordro', label: 'Bordro', icon: Users, color: '#00804D' },
  { id: 'kidem-ihbar', label: 'Kıdem & İhbar', icon: Briefcase, color: '#FA841E' },
  { id: 'gecikme', label: 'Gecikme Faizi', icon: Clock, color: '#BF192B' },
  { id: 'damga', label: 'Damga Vergisi', icon: Stamp, color: '#0049AA' },
  { id: 'amortisman', label: 'Amortisman', icon: TrendingDown, color: '#0049AA' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function HesaplamalarPage() {
  const [activeTab, setActiveTab] = useState<TabId>('gelir-vergisi');

  const { data: gvDilimleri, isLoading: gvLoading } = useTaxParams('gelir_vergisi_dilimleri');
  const { data: asgariParams } = useTaxParams('asgari_ucret');

  const isLoading = gvLoading;

  // GV dilimleri
  const dilimler = useMemo(() =>
    gvDilimleri
      .map(p => ({
        min: (paramMeta<{ min: number }>(p)).min ?? 0,
        max: (paramMeta<{ max: number | null }>(p)).max,
        oran: paramValue(p),
      }))
      .sort((a, b) => a.min - b.min),
    [gvDilimleri]
  );

  // Asgari ücret
  const asgariMeta = asgariParams[0]
    ? paramMeta<{ brut: number }>(asgariParams[0])
    : null;
  const asgariUcretBrut = asgariMeta?.brut ?? 22104;

  // Gelir Vergisi State
  const [gelirTutari, setGelirTutari] = useState('');

  // Bordro State
  const [brutUcret, setBrutUcret] = useState(asgariUcretBrut.toString());

  // Amortisman State
  const [amortismanDeger, setAmortismanDeger] = useState('');
  const [amortismanOran, setAmortismanOran] = useState('20');
  const [amortismanYil, setAmortismanYil] = useState('5');

  const formatTL = (value: number) => formatNumber(value, 2);

  // Gelir Vergisi Hesaplama
  const gelirVergisiSonuc = useMemo(() => {
    const tutar = parseFloat(gelirTutari) || 0;
    if (tutar <= 0 || dilimler.length === 0) return null;

    let toplamVergi = 0;
    const detaylar: { dilim: number; matrah: number; oran: number; vergi: number }[] = [];

    for (let i = 0; i < dilimler.length; i++) {
      const dilim = dilimler[i];
      const dilimUst = dilim.max || Infinity;
      if (tutar <= dilim.min) break;

      const oncekiUst = i > 0 ? dilimler[i - 1].max || 0 : 0;
      const buDilimMatrah = Math.min(tutar, dilimUst) - Math.max(oncekiUst, dilim.min);

      if (buDilimMatrah > 0) {
        const vergi = buDilimMatrah * (dilim.oran / 100);
        toplamVergi += vergi;
        detaylar.push({ dilim: i + 1, matrah: buDilimMatrah, oran: dilim.oran, vergi });
      }
    }

    return {
      brutGelir: tutar,
      toplamVergi,
      netGelir: tutar - toplamVergi,
      efektifOran: (toplamVergi / tutar) * 100,
      detaylar
    };
  }, [gelirTutari, dilimler]);

  // Bordro Hesaplama
  const bordroSonuc = useMemo(() => {
    const brut = parseFloat(brutUcret) || 0;
    if (brut <= 0) return null;

    const sgkIsciUzunVade = brut * 0.09;
    const sgkIsciSaglik = brut * 0.05;
    const sgkIsciIssizlik = brut * 0.01;
    const sgkIsciToplam = sgkIsciUzunVade + sgkIsciSaglik + sgkIsciIssizlik;

    const gvMatrah = brut - sgkIsciToplam;

    let gvOran = 15;
    if (dilimler.length > 0) {
      for (const d of dilimler) {
        if (gvMatrah * 12 <= (d.max || Infinity)) {
          gvOran = d.oran;
          break;
        }
      }
    }
    const gelirVergisi = gvMatrah * (gvOran / 100);
    const damgaVergisi = brut * 0.00759;

    const sgkIsverenKisaVade = brut * 0.02;
    const sgkIsverenUzunVade = brut * 0.11;
    const sgkIsverenSaglik = brut * 0.075;
    const sgkIsverenIssizlik = brut * 0.02;
    const sgkIsverenToplam = sgkIsverenKisaVade + sgkIsverenUzunVade + sgkIsverenSaglik + sgkIsverenIssizlik;

    const netUcret = brut - sgkIsciToplam - gelirVergisi - damgaVergisi;
    const isverenMaliyeti = brut + sgkIsverenToplam;

    return { brut, sgkIsciToplam, gelirVergisi, damgaVergisi, netUcret, sgkIsverenToplam, isverenMaliyeti, gvOran };
  }, [brutUcret, dilimler]);

  // Amortisman Hesaplama
  const amortismanSonuc = useMemo(() => {
    const deger = parseFloat(amortismanDeger) || 0;
    const oran = parseFloat(amortismanOran) || 20;
    const yil = parseInt(amortismanYil) || 5;
    if (deger <= 0) return null;

    const yillikAmortisman = deger * (oran / 100);
    const plan: { yil: number; amortisman: number; birikimli: number; kalanDeger: number }[] = [];

    let birikimli = 0;
    for (let i = 1; i <= yil; i++) {
      const buYilAmortisman = Math.min(yillikAmortisman, deger - birikimli);
      birikimli += buYilAmortisman;
      plan.push({ yil: i, amortisman: buYilAmortisman, birikimli, kalanDeger: deger - birikimli });
      if (birikimli >= deger) break;
    }

    return { maliyet: deger, oran, yillikAmortisman, plan };
  }, [amortismanDeger, amortismanOran, amortismanYil]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/v2/pratik-bilgiler"
          className="flex items-center gap-2 px-3 py-2 text-sm text-[#5A5A5A] hover:text-[#2E2E2E] hover:bg-[#F5F6F8] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Geri
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#2E2E2E] flex items-center gap-2">
            <Calculator className="w-6 h-6 text-[#0049AA]" />
            Hesaplamalar
          </h1>
          <p className="text-[#5A5A5A]">Vergi, SGK, tazminat ve diğer mali hesaplama araçları</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-1.5 flex gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-[#0049AA] text-white shadow-sm'
                  : 'text-[#5A5A5A] hover:bg-[#F5F6F8] hover:text-[#2E2E2E]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#0049AA] animate-spin" />
        </div>
      ) : (
        <>
          {/* Gelir Vergisi */}
          {activeTab === 'gelir-vergisi' && (
            <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
              <h2 className="font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
                <Percent className="w-5 h-5 text-[#0049AA]" />
                Gelir Vergisi Hesaplama (GVK Md. 103)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#5A5A5A] mb-2">
                    Yıllık Gelir Tutarı (TL)
                  </label>
                  <input
                    type="number"
                    value={gelirTutari}
                    onChange={(e) => setGelirTutari(e.target.value)}
                    placeholder="Örn: 500000"
                    className="w-full px-4 py-3 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#0078D0] focus:border-[#0078D0]"
                  />
                </div>

                {gelirVergisiSonuc && (
                  <div className="bg-[#E6F9FF] rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[#5A5A5A]">Brüt Gelir</p>
                        <p className="font-semibold text-[#2E2E2E]">{formatTL(gelirVergisiSonuc.brutGelir)} TL</p>
                      </div>
                      <div>
                        <p className="text-[#5A5A5A]">Toplam Vergi</p>
                        <p className="font-semibold text-[#BF192B]">{formatTL(gelirVergisiSonuc.toplamVergi)} TL</p>
                      </div>
                      <div>
                        <p className="text-[#5A5A5A]">Net Gelir</p>
                        <p className="font-semibold text-[#00804D]">{formatTL(gelirVergisiSonuc.netGelir)} TL</p>
                      </div>
                      <div>
                        <p className="text-[#5A5A5A]">Efektif Oran</p>
                        <p className="font-semibold text-[#2E2E2E]">%{gelirVergisiSonuc.efektifOran.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {gelirVergisiSonuc && gelirVergisiSonuc.detaylar.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F5F6F8]">
                      <tr>
                        <th className="px-3 py-2 text-left">Dilim</th>
                        <th className="px-3 py-2 text-right">Matrah</th>
                        <th className="px-3 py-2 text-center">Oran</th>
                        <th className="px-3 py-2 text-right">Vergi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5E5]">
                      {gelirVergisiSonuc.detaylar.map((d) => (
                        <tr key={d.dilim}>
                          <td className="px-3 py-2">{d.dilim}. Dilim</td>
                          <td className="px-3 py-2 text-right">{formatTL(d.matrah)} TL</td>
                          <td className="px-3 py-2 text-center">%{d.oran}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatTL(d.vergi)} TL</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Bordro */}
          {activeTab === 'bordro' && (
            <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
              <h2 className="font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#00804D]" />
                Bordro Hesaplama (2026)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#5A5A5A] mb-2">
                    Brüt Ücret (TL)
                  </label>
                  <input
                    type="number"
                    value={brutUcret}
                    onChange={(e) => setBrutUcret(e.target.value)}
                    className="w-full px-4 py-3 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-[#00A651]"
                  />
                  <button
                    onClick={() => setBrutUcret(asgariUcretBrut.toString())}
                    className="mt-2 text-xs text-[#00804D] hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Asgari Ücret ({formatTL(asgariUcretBrut)} TL)
                  </button>
                </div>

                {bordroSonuc && (
                  <>
                    <div className="bg-[#ECFDF5] rounded-lg p-4">
                      <h3 className="font-medium text-[#005A46] mb-3">İşçi Kesintileri</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#5A5A5A]">SGK İşçi Payı (%15)</span>
                          <span className="text-[#BF192B]">-{formatTL(bordroSonuc.sgkIsciToplam)} TL</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#5A5A5A]">Gelir Vergisi (%{bordroSonuc.gvOran})</span>
                          <span className="text-[#BF192B]">-{formatTL(bordroSonuc.gelirVergisi)} TL</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#5A5A5A]">Damga Vergisi</span>
                          <span className="text-[#BF192B]">-{formatTL(bordroSonuc.damgaVergisi)} TL</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-[#AAE8B8] font-semibold">
                          <span className="text-[#005A46]">Net Ücret</span>
                          <span className="text-[#00804D]">{formatTL(bordroSonuc.netUcret)} TL</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#E6F9FF] rounded-lg p-4">
                      <h3 className="font-medium text-[#00287F] mb-3">İşveren Maliyeti</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#5A5A5A]">Brüt Ücret</span>
                          <span>{formatTL(bordroSonuc.brut)} TL</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#5A5A5A]">SGK İşveren Payı (%22.5)</span>
                          <span className="text-[#FA841E]">+{formatTL(bordroSonuc.sgkIsverenToplam)} TL</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-[#ABEBFF] font-semibold">
                          <span className="text-[#00287F]">Toplam Maliyet</span>
                          <span className="text-[#0049AA]">{formatTL(bordroSonuc.isverenMaliyeti)} TL</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Kıdem & İhbar */}
          {activeTab === 'kidem-ihbar' && <KidemIhbarCalculator />}

          {/* Detaylı Gecikme */}
          {activeTab === 'gecikme' && <DetayliGecikmeCalculator />}

          {/* Damga Vergisi */}
          {activeTab === 'damga' && <DamgaVergisiCalculator />}

          {/* Amortisman */}
          {activeTab === 'amortisman' && (
            <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
              <h2 className="font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-[#0049AA]" />
                Normal Amortisman Hesaplama (VUK Md. 315)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-[#5A5A5A] mb-2">
                    Maliyet Bedeli (TL)
                  </label>
                  <input
                    type="number"
                    value={amortismanDeger}
                    onChange={(e) => setAmortismanDeger(e.target.value)}
                    placeholder="Örn: 100000"
                    className="w-full px-4 py-3 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#0078D0] focus:border-[#0078D0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5A5A5A] mb-2">
                    Amortisman Oranı (%)
                  </label>
                  <select
                    value={amortismanOran}
                    onChange={(e) => {
                      setAmortismanOran(e.target.value);
                      setAmortismanYil(String(Math.ceil(100 / parseFloat(e.target.value))));
                    }}
                    className="w-full px-4 py-3 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#0078D0] focus:border-[#0078D0]"
                  >
                    <option value="2">%2 (50 yıl - Binalar)</option>
                    <option value="10">%10 (10 yıl - Makineler)</option>
                    <option value="20">%20 (5 yıl - Taşıtlar, Demirbaş)</option>
                    <option value="25">%25 (4 yıl - Bilgisayar)</option>
                    <option value="33.33">%33.33 (3 yıl - Yazılım)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5A5A5A] mb-2">
                    Faydalı Ömür (Yıl)
                  </label>
                  <input
                    type="number"
                    value={amortismanYil}
                    onChange={(e) => setAmortismanYil(e.target.value)}
                    className="w-full px-4 py-3 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#0078D0] focus:border-[#0078D0]"
                  />
                </div>
              </div>

              {amortismanSonuc && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#E6F9FF]">
                      <tr>
                        <th className="px-4 py-2 text-left">Yıl</th>
                        <th className="px-4 py-2 text-right">Yıllık Amortisman</th>
                        <th className="px-4 py-2 text-right">Birikimli Amortisman</th>
                        <th className="px-4 py-2 text-right">Kalan Değer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5E5]">
                      {amortismanSonuc.plan.map((p) => (
                        <tr key={p.yil} className="hover:bg-[#F5F6F8]">
                          <td className="px-4 py-2">{p.yil}. Yıl</td>
                          <td className="px-4 py-2 text-right">{formatTL(p.amortisman)} TL</td>
                          <td className="px-4 py-2 text-right">{formatTL(p.birikimli)} TL</td>
                          <td className="px-4 py-2 text-right font-medium">
                            {p.kalanDeger > 0 ? `${formatTL(p.kalanDeger)} TL` :
                              <span className="text-[#00804D]">Tamamen İtfa</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Bilgi Notu */}
      <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-4">
        <h3 className="font-medium text-[#00287F] mb-2">Bilgilendirme</h3>
        <p className="text-sm text-[#0049AA]">
          Bu hesaplamalar bilgi amaçlıdır. Resmi beyannamelerde kullanmadan önce mali müşavirinize danışınız.
          Özel durumlar (teşvikler, istisnalar, AGİ vb.) hesaplamalara dahil edilmemiştir.
        </p>
      </div>
    </div>
  );
}
