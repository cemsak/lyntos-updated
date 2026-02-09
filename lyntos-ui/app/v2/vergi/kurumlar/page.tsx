'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Landmark,
  Calculator,
  Download,
  AlertCircle,
  Circle,
  CheckCircle2,
  Percent,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { KurumlarVergisiPanel } from '../../_components/vergi-analiz';
import { useCorporateTax } from '../../_hooks/useCorporateTax';
import { formatCurrency } from '../../_lib/format';
import { KpiCard } from './KpiCard';
import { CalculationRow } from './CalculationRow';
import { KontrolDetayModal, KONTROL_DETAYLARI, type KontrolDetail } from './KontrolDetayModal';
import { ScopeGuide } from '../../_components/shared/ScopeGuide';
import { ConnectionError } from '../../_components/shared/ConnectionError';

export default function KurumlarVergisiPage() {
  const { data, loading, error, scopeIncomplete, fetchTax } = useCorporateTax();
  const [selectedKontrol, setSelectedKontrol] = useState<KontrolDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchTax();
  }, [fetchTax]);

  // 20 Kritik Kontrol click handler
  const handleKontrolClick = useCallback((kontrolId: string) => {
    const kontrol = KONTROL_DETAYLARI[kontrolId];
    if (kontrol) {
      setSelectedKontrol(kontrol);
      setIsModalOpen(true);
    } else {
      setSelectedKontrol({
        id: kontrolId,
        name: kontrolId,
        description: 'Bu kontrol için detay bilgisi henüz eklenmedi.',
        mevzuatRef: '-',
        checkItems: [],
        status: 'pending'
      });
      setIsModalOpen(true);
    }
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedKontrol(null);
  }, []);

  const formatVal = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '\u20BA---';
    return formatCurrency(val, { decimals: 0 });
  };

  const getStatus = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'neutral' as const;
    if (val > 0) return 'success' as const;
    return 'neutral' as const;
  };

  // Checklist items with completion status
  const checklistItems = [
    { label: 'Donem sonu mizan yuklendi', completed: data !== null },
    { label: 'Enflasyon duzeltmesi yapildi', completed: false },
    { label: 'KKEG kalemleri belirlendi', completed: data?.mali_kar?.kkeg !== undefined && data.mali_kar.kkeg > 0 },
    { label: 'Istisna ve indirimler kontrol edildi', completed: data?.indirimler !== undefined },
    { label: 'Gecmis yil zararlari mahsup edildi', completed: data?.mali_kar?.gecmis_zarar !== undefined },
    { label: 'Kurumlar vergisi hesaplandi', completed: data?.hesaplanan_vergi !== undefined && data.hesaplanan_vergi > 0 },
    { label: 'Gecici vergi mahsubu yapildi', completed: data?.mahsuplar?.gecici_vergi !== undefined },
    { label: 'Beyanname hazirlandi', completed: false }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2E2E2E] flex items-center gap-2">
            <Landmark className="w-7 h-7 text-[#0049AA]" />
            Kurumlar Vergisi
          </h1>
          <p className="text-[#5A5A5A] mt-1">
            2025 mali yili kurumlar vergisi hesaplamasi ve beyannamesi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTax()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-[#5A5A5A] hover:text-[#2E2E2E] hover:bg-[#F5F6F8] rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
          <button
            disabled={!data}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              data ? 'bg-[#0049AA] text-white hover:bg-[#0049AA]' : 'bg-[#F5F6F8] text-[#969696] cursor-not-allowed'
            }`}
          >
            <Download className="w-4 h-4" />
            Rapor Indir
          </button>
        </div>
      </div>

      {/* Scope Guide */}
      {scopeIncomplete && (
        <ScopeGuide variant="banner" description="Kurumlar vergisi hesaplaması için üstteki menülerden bir mükellef ve dönem seçin." />
      )}

      {/* Error Banner — sadece gerçek API hataları */}
      {error && !scopeIncomplete && (
        <ConnectionError variant="banner" context="Kurumlar vergisi verileri" onRetry={() => fetchTax()} />
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Vergi Matrahi"
          value={formatVal(data?.matrah)}
          status={getStatus(data?.matrah)}
          loading={loading}
        />
        <KpiCard
          label="Hesaplanan KV"
          value={formatVal(data?.hesaplanan_vergi)}
          status={getStatus(data?.hesaplanan_vergi)}
          loading={loading}
        />
        <KpiCard
          label="Mahsup Edilecek"
          value={formatVal((data?.mahsuplar?.gecici_vergi || 0) + (data?.mahsuplar?.yurtdisi_vergi || 0))}
          status="neutral"
          loading={loading}
        />
        <KpiCard
          label="Odenecek KV"
          value={formatVal(data?.odenecek_vergi)}
          status={data?.odenecek_vergi && data.odenecek_vergi > 0 ? 'warning' : 'success'}
          loading={loading}
        />
      </div>

      {/* Main Calculation Panel */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[#2E2E2E] mb-4">
          Kurumlar Vergisi Hesaplamasi
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left - Matrah Calculation */}
          <div>
            <h3 className="font-medium text-[#5A5A5A] mb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Matrah Hesabi
            </h3>
            <div className="bg-[#F5F6F8] rounded-lg p-4 space-y-1">
              <CalculationRow label="Ticari Bilanco Kari" value={data?.ticari_kar?.net_donem_kari ?? null} loading={loading} />
              <CalculationRow label="KKEG" value={data?.mali_kar?.kkeg ?? null} type="add" loading={loading} />
              <CalculationRow label="Istirak Kazanclari Istisnasi" value={data?.mali_kar?.istisna_kazanclar ?? null} type="subtract" loading={loading} />
              <CalculationRow label="Ar-Ge Indirimi" value={data?.indirimler?.r_and_d ?? null} type="subtract" loading={loading} />
              <CalculationRow label="Diger Indirimler" value={(data?.indirimler?.yatirim ?? 0) + (data?.indirimler?.bagis ?? 0) + (data?.indirimler?.sponsorluk ?? 0) || null} type="subtract" loading={loading} />
              <CalculationRow label="Gecmis Yil Zararlari" value={data?.mali_kar?.gecmis_zarar ?? null} type="subtract" loading={loading} />
              <div className="pt-2 mt-2 border-t border-[#E5E5E5]">
                <CalculationRow label="Kurumlar Vergisi Matrahi" value={data?.matrah ?? null} highlight loading={loading} />
              </div>
            </div>
          </div>

          {/* Right - Tax Calculation */}
          <div>
            <h3 className="font-medium text-[#5A5A5A] mb-3 flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Vergi Hesabi
            </h3>
            <div className="bg-[#F5F6F8] rounded-lg p-4 space-y-1">
              <CalculationRow label="Matrah" value={data?.matrah ?? null} loading={loading} />
              <CalculationRow label={`Kurumlar Vergisi (%${(data?.vergi_orani ?? 0.25) * 100})`} value={data?.hesaplanan_vergi ?? null} loading={loading} />
              <div className="py-2 border-t border-[#E5E5E5] mt-2">
                <CalculationRow label="Hesaplanan Kurumlar Vergisi" value={data?.hesaplanan_vergi ?? null} loading={loading} />
              </div>
              <CalculationRow label="Gecici Vergi Mahsubu" value={data?.mahsuplar?.gecici_vergi ?? null} type="subtract" loading={loading} />
              <CalculationRow label="Tevkifat Mahsubu" value={data?.mahsuplar?.yurtdisi_vergi ?? null} type="subtract" loading={loading} />
              <div className="pt-2 mt-2 border-t border-[#E5E5E5]">
                <CalculationRow label="Odenecek Kurumlar Vergisi" value={data?.odenecek_vergi ?? null} highlight loading={loading} />
              </div>
            </div>
            <button
              onClick={() => fetchTax()}
              disabled={loading}
              className={`w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                loading
                  ? 'bg-[#E5E5E5] text-[#969696] cursor-not-allowed'
                  : 'bg-[#0049AA] text-white hover:bg-[#0049AA]'
              }`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Calculator className="w-4 h-4" />
              )}
              {loading ? 'Hesaplaniyor...' : 'Hesapla'}
            </button>
          </div>
        </div>
      </div>

      {/* Important Dates */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[#2E2E2E] mb-4">Onemli Tarihler</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#F5F6F8] rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-[#2E2E2E]">30 Nisan</p>
            <p className="text-sm text-[#969696] mt-1">Beyanname Son Tarihi</p>
          </div>
          <div className="bg-[#F5F6F8] rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-[#2E2E2E]">30 Nisan</p>
            <p className="text-sm text-[#969696] mt-1">1. Taksit Odeme</p>
          </div>
          <div className="bg-[#F5F6F8] rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-[#2E2E2E]">31 Temmuz</p>
            <p className="text-sm text-[#969696] mt-1">2. Taksit Odeme</p>
          </div>
        </div>
      </div>

      {/* Success/Info Banner */}
      {data ? (
        <div className="bg-[#ECFDF5] border border-[#AAE8B8] rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#00804D] flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-[#005A46]">Veriler Yuklendi</h4>
            <p className="text-sm text-[#00804D] mt-1">
              Kurumlar vergisi hesaplanmistir. Guvenilirlik: {data.trust_score === 1 ? 'Yuksek (Resmi mevzuat)' : 'Orta'}
            </p>
          </div>
        </div>
      ) : !loading && (
        <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#0049AA] flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-[#00287F]">Veri Yukleme Gerekli</h4>
            <p className="text-sm text-[#0049AA] mt-1">
              Kurumlar vergisi hesaplamasi icin donem sonu mizan ve beyanname verilerinizi yukleyin.
              Yukleme sonrasi hesaplama otomatik olarak yapilacaktir.
            </p>
          </div>
        </div>
      )}

      {/* 20 Kritik Kontrol Panel */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E5E5] bg-gradient-to-r from-[#E6F9FF] to-white">
          <h2 className="text-lg font-semibold text-[#2E2E2E] flex items-center gap-2">
            <span>🏛</span> 20 Kritik Kontrol
          </h2>
          <p className="text-sm text-[#969696] mt-1">Risk, Avantaj ve Zorunlu kontroller</p>
        </div>
        <div className="p-4">
          <KurumlarVergisiPanel yil={2025} onKontrolClick={handleKontrolClick} />
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[#2E2E2E] mb-4">Kontrol Listesi</h2>
        <div className="space-y-2">
          {checklistItems.map((item, index) => (
            <div key={index} className="flex items-center gap-3 p-2 rounded hover:bg-[#F5F6F8]">
              {item.completed ? (
                <CheckCircle2 className="w-4 h-4 text-[#00A651]" />
              ) : (
                <Circle className="w-4 h-4 text-[#B4B4B4]" />
              )}
              <span className={`text-sm ${item.completed ? 'text-[#2E2E2E]' : 'text-[#5A5A5A]'}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Kontrol Detay Modal */}
      {isModalOpen && selectedKontrol && (
        <KontrolDetayModal kontrol={selectedKontrol} onClose={closeModal} />
      )}
    </div>
  );
}
