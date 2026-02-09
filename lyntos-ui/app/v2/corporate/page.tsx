'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ŞİRKETLER HUKUKU REHBERİ
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SMMM/YMM için Şirketler Hukuku İşlem Rehberi
 * Vergi Avantajı + Sektör Teşvikleri + Ticaret Sicili Bilgileri
 *
 * Kaynaklar:
 * - 6102 sayılı Türk Ticaret Kanunu
 * - 5520 sayılı Kurumlar Vergisi Kanunu
 * - 3065 sayılı KDV Kanunu
 * - 492 sayılı Harçlar Kanunu
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../_lib/format';
import {
  Building2,
  Calculator,
  AlertTriangle,
  BarChart3,
  Briefcase,
  Shield,
  Zap,
  Layers,
  Scale,
  Landmark,
  BookOpen,
  Sparkles,
} from 'lucide-react';

import { GUNCEL_ORANLAR_2026, SIRKET_ISLEMLERI, SEKTOR_TESVIKLERI } from './_lib/constants';
import type { CorporateTab } from './_types/corporate';
import {
  AnimatedStatCard,
  IslemCard,
  TTK376Panel,
  HarcHesaplayiciPanel,
  VergiAvantajiCard,
  SektorTesvikleri,
  TicaretSiciliBilgiKarti,
} from './_components';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function CorporatePage() {
  const [activeTab, setActiveTab] = useState<CorporateTab>('dashboard');
  const [expandedIslemler, setExpandedIslemler] = useState<string[]>([]);
  const [selectedKategori, setSelectedKategori] = useState<string>('all');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleIslem = (id: string) => {
    setExpandedIslemler(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredIslemler =
    selectedKategori === 'all'
      ? SIRKET_ISLEMLERI
      : SIRKET_ISLEMLERI.filter(i => i.kategori === selectedKategori);

  const stats = {
    toplamIslem: SIRKET_ISLEMLERI.length,
    kolayIslem: SIRKET_ISLEMLERI.filter(i => i.zorlukDerecesi <= 2).length,
    yapisalIslem: SIRKET_ISLEMLERI.filter(i => i.kategori === 'yapisal').length,
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 pb-8">
      {/* ═══════════════════════════════════════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00287F] via-[#0049AA] to-[#0078D0]">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-72 h-72 bg-[#0078D0] rounded-full filter blur-3xl" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#00B4EB] rounded-full filter blur-3xl" />
          </div>
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
            }}
          />
        </div>

        <div className="relative p-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FFCE19] to-[#FFB114] flex items-center justify-center shadow-2xl shadow-[#FFB114]/30">
                  <Building2 className="w-9 h-9 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-white">
                    Şirketler Hukuku Rehberi
                  </h1>
                  <p className="text-[#ABEBFF] font-medium">
                    TTK + KVK + KDV İstisnaları + Harç/Damga Vergisi
                  </p>
                </div>
              </div>

              {/* Alert Banner */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#FFB114]/20 to-[#FFB114]/20 border border-[#FFB114]/30 rounded-xl backdrop-blur-sm max-w-xl mt-6">
                <div className="w-10 h-10 rounded-lg bg-[#FFB114] flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">
                    Asgari Sermaye Uyumu - Son Tarih: 31.12.2026
                  </p>
                  <p className="text-[#FFF08C] text-xs">
                    A.Ş.: 250.000 TL | Ltd.Şti.: 50.000 TL
                  </p>
                </div>
              </div>
            </div>

            {/* Sağ - Özet Bilgiler */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 min-w-[280px]">
              <div className="flex items-center gap-2 mb-4">
                <Scale className="w-5 h-5 text-[#FFCE19]" />
                <span className="text-white font-semibold">2026 Güncel Oranlar</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#ABEBFF] text-sm">Damga Vergisi</span>
                  <span className="text-white font-bold">‰9,48</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#ABEBFF] text-sm">Tescil Harcı</span>
                  <span className="text-white font-bold">
                    {formatCurrency(GUNCEL_ORANLAR_2026.ticaretSicilHarci.tesciHarci, { decimals: 0 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#ABEBFF] text-sm">A.Ş. Asgari</span>
                  <span className="text-white font-bold">
                    {formatCurrency(GUNCEL_ORANLAR_2026.minimumSermaye.as, { decimals: 0 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#ABEBFF] text-sm">Ltd. Asgari</span>
                  <span className="text-white font-bold">
                    {formatCurrency(GUNCEL_ORANLAR_2026.minimumSermaye.ltd, { decimals: 0 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          STAT CARDS
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedStatCard
          label="Toplam İşlem"
          value={stats.toplamIslem}
          subtitle="Rehberdeki işlem türü sayısı"
          icon={<Briefcase className="w-6 h-6" />}
          color="primary"
          delay={0}
        />
        <AnimatedStatCard
          label="Kolay İşlem"
          value={stats.kolayIslem}
          subtitle="Zorluk derecesi 1-2 olan işlemler"
          icon={<Zap className="w-6 h-6" />}
          color="success"
          delay={100}
        />
        <AnimatedStatCard
          label="Yapısal İşlem"
          value={stats.yapisalIslem}
          subtitle="Tür değişikliği, birleşme vb."
          icon={<Building2 className="w-6 h-6" />}
          color="warning"
          delay={200}
        />
        <AnimatedStatCard
          label="Sektör Teşviki"
          value={SEKTOR_TESVIKLERI.length}
          subtitle="Uygulanabilir teşvik kategorisi"
          icon={<Sparkles className="w-6 h-6" />}
          color="info"
          delay={300}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB NAVIGATION
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex gap-2 p-1 bg-[#F5F6F8] rounded-2xl overflow-x-auto">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'islemler', label: 'İşlem Türleri', icon: <Briefcase className="w-4 h-4" /> },
          { id: 'ttk376', label: 'TTK 376', icon: <Shield className="w-4 h-4" /> },
          { id: 'hesaplayici', label: 'Hesaplayıcı', icon: <Calculator className="w-4 h-4" /> },
          { id: 'ticaret-sicili', label: 'Ticaret Sicili', icon: <Landmark className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as CorporateTab)}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold
              transition-all duration-300 whitespace-nowrap
              ${
                activeTab === tab.id
                  ? 'bg-white text-[#2E2E2E] shadow-lg'
                  : 'text-[#969696] hover:text-[#5A5A5A] hover:bg-white/50'
              }
            `}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          DASHBOARD TAB
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-slide-up">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setActiveTab('islemler')}
              className="group p-6 bg-gradient-to-br from-[#0049AA] to-[#0078D0] rounded-2xl text-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <Briefcase className="w-10 h-10 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-lg">İşlem Türleri</h3>
              <p className="text-[#ABEBFF] text-sm mt-1">
                {stats.toplamIslem} farklı işlem türü ve vergi avantajları
              </p>
            </button>

            <button
              onClick={() => setActiveTab('ttk376')}
              className="group p-6 bg-gradient-to-br from-[#F0282D] to-[#BF192B] rounded-2xl text-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <Shield className="w-10 h-10 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-lg">TTK 376 Analizi</h3>
              <p className="text-[#FFC7C9] text-sm mt-1">
                Sermaye kaybı ve borca batıklık tespiti
              </p>
            </button>

            <button
              onClick={() => setActiveTab('ticaret-sicili')}
              className="group p-6 bg-gradient-to-br from-[#00A651] to-[#00804D] rounded-2xl text-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <Landmark className="w-10 h-10 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-lg">Ticaret Sicili</h3>
              <p className="text-[#AAE8B8] text-sm mt-1">
                Tescil harçları ve gerekli evrak bilgileri
              </p>
            </button>
          </div>

          {/* Vergi Avantajı Öne Çıkanlar */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center gap-3 bg-gradient-to-r from-[#F5F6F8] to-white">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00A651] to-[#00804D] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-[#2E2E2E]">
                  Vergi Avantajlı İşlemler
                </h3>
                <p className="text-sm text-[#969696]">
                  KVK ve KDV istisnalarından yararlanılabilecek işlemler
                </p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {SIRKET_ISLEMLERI.filter(
                i => i.kategori === 'yapisal' || i.kategori === 'devir'
              ).map(islem => (
                <VergiAvantajiCard key={islem.id} islem={islem} />
              ))}
            </div>
          </div>

          {/* 2026 Güncel Oranlar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-[#E6F9FF] to-[#ABEBFF] rounded-2xl p-5 border border-[#0078D0]">
              <div className="flex items-center gap-2 mb-2">
                <Scale className="w-5 h-5 text-[#0049AA]" />
                <h4 className="font-semibold text-[#0049AA]">Damga Vergisi</h4>
              </div>
              <p className="text-3xl font-black text-[#0049AA]">‰9,48</p>
              <p className="text-xs text-[#0049AA] mt-1">
                Ana sözleşme, sermaye artırımı vb.
              </p>
            </div>
            <div className="bg-gradient-to-br from-[#E6F9FF] to-[#ABEBFF] rounded-2xl p-5 border border-[#0049AA]">
              <div className="flex items-center gap-2 mb-2">
                <Landmark className="w-5 h-5 text-[#0049AA]" />
                <h4 className="font-semibold text-[#0049AA]">Tescil Harcı</h4>
              </div>
              <p className="text-3xl font-black text-[#0049AA]">
                {formatCurrency(GUNCEL_ORANLAR_2026.ticaretSicilHarci.tesciHarci, { decimals: 0 })}
              </p>
              <p className="text-xs text-[#0049AA] mt-1">2026 güncel oran</p>
            </div>
            <div className="bg-gradient-to-br from-[#ECFDF5] to-[#AAE8B8] rounded-2xl p-5 border border-[#00A651]">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-[#00804D]" />
                <h4 className="font-semibold text-[#00804D]">Asgari Sermaye</h4>
              </div>
              <p className="text-lg font-black text-[#00804D]">
                A.Ş.: {formatCurrency(250_000, { decimals: 0 })}
              </p>
              <p className="text-lg font-black text-[#00804D]">
                Ltd.: {formatCurrency(50_000, { decimals: 0 })}
              </p>
            </div>
          </div>

          {/* Sektör Teşvikleri */}
          <SektorTesvikleri />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          İŞLEMLER TAB
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'islemler' && (
        <div className="space-y-4 animate-slide-up">
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { id: 'all', label: 'Tümü', icon: <Layers className="w-3 h-3" /> },
              { id: 'kurulus', label: 'Kuruluş', icon: <Building2 className="w-3 h-3" /> },
              { id: 'sermaye', label: 'Sermaye', icon: <Scale className="w-3 h-3" /> },
              { id: 'yapisal', label: 'Yapısal', icon: <Briefcase className="w-3 h-3" /> },
              { id: 'devir', label: 'Devir', icon: <Zap className="w-3 h-3" /> },
              { id: 'tasfiye', label: 'Tasfiye', icon: <AlertTriangle className="w-3 h-3" /> },
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setSelectedKategori(filter.id)}
                className={`
                  flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all
                  ${
                    selectedKategori === filter.id
                      ? 'bg-[#0049AA] text-white shadow-lg'
                      : 'bg-white border border-[#E5E5E5] text-[#5A5A5A] hover:border-[#0049AA] hover:text-[#0049AA]'
                  }
                `}
              >
                {filter.icon}
                {filter.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {filteredIslemler.map((islem, index) => (
              <IslemCard
                key={islem.id}
                islem={islem}
                isExpanded={expandedIslemler.includes(islem.id)}
                onToggle={() => toggleIslem(islem.id)}
                index={index}
              />
            ))}
          </div>
        </div>
      )}

      {/* TTK 376 TAB */}
      {activeTab === 'ttk376' && <TTK376Panel />}

      {/* HARÇ HESAPLAYICI TAB */}
      {activeTab === 'hesaplayici' && <HarcHesaplayiciPanel />}

      {/* TİCARET SİCİLİ TAB */}
      {activeTab === 'ticaret-sicili' && <TicaretSiciliBilgiKarti />}
    </div>
  );
}
