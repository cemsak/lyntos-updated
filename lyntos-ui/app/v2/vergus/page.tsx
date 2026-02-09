'use client';

/**
 * VERGUS Tax Strategist Page - Big 4 Quality
 * Sprint 9.1 - LYNTOS V2 Enhancement
 *
 * "Gerçek Üstad" - Tüm güncel mevzuatı tarayıp daha az vergi tavsiye eden sistem
 * Yasal çerçevede ama yasaları kullanarak vergi optimizasyonu
 */

import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Building2,
  Sparkles,
  Scale,
  TrendingDown,
  Calculator,
  FileText,
  BookOpen,
  Target,
  Lightbulb,
  Shield,
  Clock,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { VergusStrategistPanel } from '../_components/vergus-strategist';
import { WhatIfAnalysis } from '../_components/vergus-strategist/WhatIfAnalysis';
import { useDashboardScope } from '../_components/scope/ScopeProvider';
import type { TaxAnalysisResult } from '../_components/vergus-strategist/types';

type TabType = 'analiz' | 'whatif' | 'mevzuat' | 'ozelge';

// Güncel Mevzuat Özeti - 2025
const GUNCEL_MEVZUAT = [
  {
    id: 'kv-oran',
    baslik: 'Kurumlar Vergisi Oranı',
    deger: '%25',
    kaynak: 'KVK Md. 32',
    gecerlilik: '01.01.2025',
    aciklama: '2025 yılı için geçerli genel oran',
  },
  {
    id: 'ihracat-istisna',
    baslik: 'İhracat Hasılat İstisnası',
    deger: '%5',
    kaynak: 'KVK Md. 5/1-e',
    gecerlilik: '01.01.2025',
    aciklama: 'İhracat hasılatının %5\'i istisna',
  },
  {
    id: 'arge-indirim',
    baslik: 'Ar-Ge İlave İndirim',
    deger: '%100',
    kaynak: 'KVK Md. 10, 5746 SK',
    gecerlilik: '01.01.2025',
    aciklama: 'Ar-Ge harcamalarının tamamı ilave indirim',
  },
  {
    id: 'teknokent',
    baslik: 'Teknokent Kazanç İstisnası',
    deger: '%100',
    kaynak: '4691 SK Geç.2',
    gecerlilik: '31.12.2028',
    aciklama: 'Yazılım ve Ar-Ge kazançları istisna',
  },
  {
    id: 'yatirim-tesvik',
    baslik: 'Yatırım Teşviki (6. Bölge)',
    deger: '%0 KV',
    kaynak: 'KVK Md. 32/A',
    gecerlilik: '01.01.2025',
    aciklama: '6. bölgede yatırımlar için KV sıfır',
  },
  {
    id: 'yeniden-degerleme',
    baslik: 'Yeniden Değerleme',
    deger: 'İHTİYARİ',
    kaynak: 'VUK Mük. 298/Ç',
    gecerlilik: '01.01.2025',
    aciklama: 'VUK Geç.37: 2025-2027 enflasyon düzeltmesi askıda. Yeniden değerleme uygulanabilir.',
  },
];

// Son Özelge/Sirkülerler
const SON_OZELGELER = [
  {
    no: '2025-01-GİB-KV-001',
    tarih: '2025-01-10',
    konu: 'İhracat İstisnası Uygulama Esasları',
    ozet: 'Döviz kazandırıcı faaliyetlerde %5 istisna uygulaması hakkında açıklamalar',
    onem: 'yuksek',
  },
  {
    no: '2024-12-GİB-ARGE-045',
    tarih: '2024-12-20',
    konu: 'Ar-Ge Merkezi Personel Teşviki',
    ozet: 'Ar-Ge personeli ücretlerinde %95 gelir vergisi stopaj teşviki uygulama detayları',
    onem: 'yuksek',
  },
  {
    no: '2024-11-GİB-TF-033',
    tarih: '2024-11-15',
    konu: 'Transfer Fiyatlandırması Form Değişikliği',
    ozet: '2025 yılı transfer fiyatlandırması raporlama formlarında değişiklikler',
    onem: 'orta',
  },
  {
    no: '2024-10-SGK-TESVIK-012',
    tarih: '2024-10-25',
    konu: 'SGK İstihdam Teşvikleri Güncelleme',
    ozet: '7103 sayılı Kanun kapsamında ilave istihdam teşviki süre uzatımı',
    onem: 'orta',
  },
];

export default function VergusPage() {
  const { selectedClient, selectedPeriod } = useDashboardScope();
  const [activeTab, setActiveTab] = useState<TabType>('analiz');
  const [analysisResult, setAnalysisResult] = useState<TaxAnalysisResult | null>(null);

  useEffect(() => {
    setAnalysisResult(null);
  }, [selectedClient?.id, selectedPeriod?.id]);

  // Mükellef seçimi zorunlu
  if (!selectedClient || !selectedPeriod) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-[#00287F] via-[#0049AA] to-[#0078D0] rounded-2xl p-8 text-white mb-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Vergi Stratejisti</h1>
                  <p className="text-white/80 text-sm">Big 4 Kalitesinde Vergi Optimizasyonu</p>
                </div>
              </div>
              <p className="text-white/90 max-w-xl leading-relaxed">
                Tüm güncel mevzuatı, özelgeleri ve sirkülerleri tarayarak şirketiniz için
                <strong> yasal çerçevede maksimum vergi avantajı</strong> sağlayan stratejiler sunar.
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/60 uppercase tracking-wider">2025 Güncellemesi</p>
              <p className="text-3xl font-bold">%25</p>
              <p className="text-xs text-white/70">Kurumlar Vergisi Oranı</p>
            </div>
          </div>
        </div>

        {/* Mükellef Seç Uyarısı */}
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-8 flex flex-col items-center justify-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#FFFBEB] flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-[#FFB114]" />
          </div>
          <h3 className="text-lg font-semibold text-[#2E2E2E] mb-2">Mükellef Seçilmedi</h3>
          <p className="text-[#5A5A5A] text-center max-w-md mb-6">
            Kişiselleştirilmiş vergi stratejisi analizi için lütfen önce mükellef ve dönem seçin.
          </p>
          <a
            href="/v2/clients"
            className="flex items-center gap-2 px-6 py-3 bg-[#0049AA] text-white rounded-xl hover:bg-[#00287F] transition-colors font-medium"
          >
            <Building2 className="w-5 h-5" />
            Mükellef Seç
          </a>
        </div>

        {/* Güncel Mevzuat Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#2E2E2E] flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#0049AA]" />
              2025 Yılı Vergi Parametreleri
            </h2>
            <span className="text-xs text-[#969696]">Son güncelleme: Ocak 2025</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {GUNCEL_MEVZUAT.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-[#E5E5E5] p-4 hover:border-[#0049AA]/50 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#969696]">{item.kaynak}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-[#ECFDF5] text-[#00804D] rounded">
                    {item.gecerlilik}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-[#2E2E2E]">{item.baslik}</h3>
                <p className="text-2xl font-bold text-[#0049AA] mt-1">{item.deger}</p>
                <p className="text-[10px] text-[#969696] mt-2">{item.aciklama}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Son Özelgeler */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#2E2E2E] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#0049AA]" />
              Son Özelge ve Sirkülerler
            </h2>
            <a href="#" className="text-sm text-[#0049AA] hover:underline flex items-center gap-1">
              Tümünü Gör
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
          <div className="bg-white rounded-xl border border-[#E5E5E5] divide-y divide-[#E5E5E5]">
            {SON_OZELGELER.map((ozelge) => (
              <div
                key={ozelge.no}
                className="p-4 hover:bg-[#F5F6F8] transition-colors flex items-start justify-between"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      ozelge.onem === 'yuksek' ? 'bg-[#F0282D]' : 'bg-[#FFB114]'
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#969696]">{ozelge.no}</span>
                      <span className="text-xs text-[#969696]">•</span>
                      <span className="text-xs text-[#969696]">{ozelge.tarih}</span>
                    </div>
                    <h4 className="text-sm font-medium text-[#2E2E2E] mt-1">{ozelge.konu}</h4>
                    <p className="text-xs text-[#969696] mt-0.5">{ozelge.ozet}</p>
                  </div>
                </div>
                <button className="p-2 text-[#5A5A5A] hover:text-[#0049AA] hover:bg-[#0049AA]/10 rounded-lg transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Ana içerik - Mükellef seçildiğinde
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#00287F] via-[#0049AA] to-[#0078D0] rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Vergi Stratejisti</h1>
              <p className="text-white/80 text-sm">
                {selectedClient.name} • {selectedPeriod.id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-white/60">Potansiyel Tasarruf</p>
              <p className="text-2xl font-bold">
                {analysisResult
                  ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(analysisResult.total_potential_saving)
                  : 'Analiz Bekleniyor'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 mb-6 bg-[#F5F6F8] p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('analiz')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'analiz'
              ? 'bg-white text-[#0049AA] shadow-sm'
              : 'text-[#5A5A5A] hover:text-[#2E2E2E]'
          }`}
        >
          <Target className="w-4 h-4" />
          Fırsat Analizi
        </button>
        <button
          onClick={() => setActiveTab('whatif')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'whatif'
              ? 'bg-white text-[#0049AA] shadow-sm'
              : 'text-[#5A5A5A] hover:text-[#2E2E2E]'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          What-If Analizi
        </button>
        <button
          onClick={() => setActiveTab('mevzuat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'mevzuat'
              ? 'bg-white text-[#0049AA] shadow-sm'
              : 'text-[#5A5A5A] hover:text-[#2E2E2E]'
          }`}
        >
          <Scale className="w-4 h-4" />
          Mevzuat Tarama
        </button>
        <button
          onClick={() => setActiveTab('ozelge')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'ozelge'
              ? 'bg-white text-[#0049AA] shadow-sm'
              : 'text-[#5A5A5A] hover:text-[#2E2E2E]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Özelge/Sirküler
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'analiz' && (
        <VergusStrategistPanel
          clientId={selectedClient.id}
          clientName={selectedClient.name}
          period={selectedPeriod.id}
          onAnalysisComplete={setAnalysisResult}
        />
      )}

      {activeTab === 'whatif' && (
        <WhatIfAnalysis
          clientId={selectedClient.id}
          period={selectedPeriod.id}
        />
      )}

      {activeTab === 'mevzuat' && (
        <div className="space-y-6">
          {/* Mevzuat Tarama */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
            <h3 className="text-lg font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#0049AA]" />
              2025 Güncel Vergi Mevzuatı
            </h3>
            <p className="text-sm text-[#5A5A5A] mb-6">
              SMMM/YMM için güncel vergi mevzuatı özeti. Tüm stratejiler bu mevzuata dayanmaktadır.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {GUNCEL_MEVZUAT.map((item) => (
                <div
                  key={item.id}
                  className="border border-[#E5E5E5] rounded-xl p-4 hover:border-[#0049AA]/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium px-2 py-0.5 bg-[#0049AA]/10 text-[#0049AA] rounded">
                      {item.kaynak}
                    </span>
                    <span className="text-xs text-[#969696]">{item.gecerlilik}</span>
                  </div>
                  <h4 className="font-medium text-[#2E2E2E]">{item.baslik}</h4>
                  <p className="text-2xl font-bold text-[#00A651] mt-1">{item.deger}</p>
                  <p className="text-xs text-[#969696] mt-2">{item.aciklama}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Yasal Uyarı */}
          <div className="bg-[#FFFBEB] border border-[#FFF08C] rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#FA841E] mt-0.5" />
              <div>
                <h4 className="font-medium text-[#E67324]">Önemli Uyarı</h4>
                <p className="text-sm text-[#FA841E] mt-1">
                  Bu bilgiler genel bilgilendirme amaçlıdır. Mevzuat sürekli değişmektedir.
                  Güncel durum için yetkili mercilere başvurunuz. Tüm işlemler usulüne uygun
                  belgelendirilmelidir.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ozelge' && (
        <div className="space-y-6">
          {/* Özelge/Sirküler Listesi */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
            <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
              <h3 className="font-semibold text-[#2E2E2E] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#0049AA]" />
                Son Özelge ve Sirkülerler
              </h3>
              <span className="text-xs text-[#969696]">Toplam: {SON_OZELGELER.length} kayıt</span>
            </div>
            <div className="divide-y divide-[#E5E5E5]">
              {SON_OZELGELER.map((ozelge) => (
                <div
                  key={ozelge.no}
                  className="p-4 hover:bg-[#F5F6F8] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-3 h-3 rounded-full mt-1 ${
                          ozelge.onem === 'yuksek' ? 'bg-[#F0282D]' : 'bg-[#FFB114]'
                        }`}
                      />
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-[#969696]">{ozelge.no}</span>
                          <span className="text-xs text-[#969696]">|</span>
                          <span className="text-xs text-[#969696] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {ozelge.tarih}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              ozelge.onem === 'yuksek'
                                ? 'bg-[#FEF2F2] text-[#BF192B]'
                                : 'bg-[#FFFBEB] text-[#FA841E]'
                            }`}
                          >
                            {ozelge.onem === 'yuksek' ? 'Yüksek Öncelik' : 'Normal'}
                          </span>
                        </div>
                        <h4 className="font-medium text-[#2E2E2E] mt-2">{ozelge.konu}</h4>
                        <p className="text-sm text-[#5A5A5A] mt-1">{ozelge.ozet}</p>
                      </div>
                    </div>
                    <button className="p-2 text-[#0049AA] hover:bg-[#0049AA]/10 rounded-lg transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RegWatch Entegrasyonu */}
          <div className="bg-gradient-to-r from-[#2E2E2E] to-[#2E2E2E] rounded-xl p-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-6 h-6 text-[#00A651]" />
              <h3 className="text-lg font-bold">RegWatch Entegrasyonu</h3>
            </div>
            <p className="text-[#B4B4B4] text-sm mb-4">
              LYNTOS RegWatch sistemi Resmi Gazete, GİB Mevzuat ve E-Mevzuat portallarını
              otomatik tarar. Vergi ile ilgili tüm değişiklikler anında sisteme yansır.
            </p>
            <a
              href="/v2/regwatch"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
            >
              RegWatch'a Git
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
