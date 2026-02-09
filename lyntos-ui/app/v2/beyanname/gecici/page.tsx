'use client';

/**
 * Geçici Vergi Beyanname Hazırlık Sayfası
 * Pencere 12 - Beyanname Hazırlık
 *
 * Üç aylık dönemler için geçici vergi beyanname hazırlığı
 */

import { useState } from 'react';
import { useDashboardScope } from '../../_components/scope/ScopeProvider';
import { API_BASE_URL } from '../../_lib/config/api';
import { formatCurrency } from '../../_lib/format';
import {
  FileText,
  Download,
  Calculator,
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';

interface GeciciVergiData {
  donem: string;
  matrah: number;
  hesaplanan_vergi: number;
  mahsup_edilecek: number;
  odenecek_vergi: number;
  beyan_tarihi?: string;
  son_odeme_tarihi: string;
  status: 'completed' | 'pending' | 'overdue';
}

const QUARTERS_2026 = [
  { q: 'Q1', label: '1. Çeyrek', period: 'Ocak - Mart 2026', dueDate: '17 Mayıs 2026' },
  { q: 'Q2', label: '2. Çeyrek', period: 'Nisan - Haziran 2026', dueDate: '17 Ağustos 2026' },
  { q: 'Q3', label: '3. Çeyrek', period: 'Temmuz - Eylül 2026', dueDate: '17 Kasım 2026' },
];

export default function GeciciVergiBeyannameHazirlik() {
  const { scope, isReady } = useDashboardScope();
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q1');

  const clientId = scope.client_id;
  const periodId = scope.period;
  const isScopeComplete = Boolean(clientId && periodId);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
        <div className="h-8 w-8 border-3 border-[#B4B4B4] border-t-[#0049AA] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isScopeComplete) {
    return (
      <div className="p-6">
        <div className="bg-[#FFFBEB] border border-[#FFF08C] rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[#FFB114]" />
          <p className="text-[#FA841E]">Lütfen mükellef ve dönem seçin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2E2E2E] flex items-center gap-3">
            <Calendar className="w-7 h-7 text-[#0049AA]" />
            Geçici Vergi Beyanname Hazırlık
          </h1>
          <p className="text-[#969696] mt-1">
            Üç aylık dönemler için geçici vergi beyanname hazırlığı
          </p>
        </div>
        <button
          className="px-4 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#0049AA] flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          PDF İndir
        </button>
      </div>

      {/* Quarter Selection */}
      <div className="grid grid-cols-3 gap-4">
        {QUARTERS_2026.map((q) => (
          <button
            key={q.q}
            onClick={() => setSelectedQuarter(q.q)}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              selectedQuarter === q.q
                ? 'border-[#0078D0] bg-[#E6F9FF]'
                : 'border-[#E5E5E5] bg-white hover:border-[#B4B4B4]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-bold text-[#2E2E2E]">{q.label}</span>
              {selectedQuarter === q.q && (
                <CheckCircle className="w-5 h-5 text-[#0049AA]" />
              )}
            </div>
            <p className="text-sm text-[#5A5A5A]">{q.period}</p>
            <p className="text-xs text-[#969696] mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Son Beyan: {q.dueDate}
            </p>
          </button>
        ))}
      </div>

      {/* Calculation Panel */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl shadow-sm">
        <div className="px-5 py-4 border-b border-[#E5E5E5]">
          <h2 className="text-base font-semibold text-[#2E2E2E]">
            Geçici Vergi Hesaplama - {selectedQuarter} 2026
          </h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-6">
            {/* Sol: Girdi Alanları */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#5A5A5A] mb-1">
                  Kümülatif Kar/Zarar (₺)
                </label>
                <input
                  type="text"
                  placeholder="Örn: 500.000"
                  className="w-full px-4 py-2 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#0078D0] focus:border-transparent"
                />
                <p className="text-xs text-[#969696] mt-1">
                  Yılbaşından itibaren toplam ticari kar
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5A5A5A] mb-1">
                  KKEG (Kanunen Kabul Edilmeyen Giderler) (₺)
                </label>
                <input
                  type="text"
                  placeholder="Örn: 50.000"
                  className="w-full px-4 py-2 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#0078D0] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5A5A5A] mb-1">
                  İstisna/Muafiyetler (₺)
                </label>
                <input
                  type="text"
                  placeholder="Örn: 10.000"
                  className="w-full px-4 py-2 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#0078D0] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5A5A5A] mb-1">
                  Önceki Dönem Ödenen Geçici Vergi (₺)
                </label>
                <input
                  type="text"
                  placeholder="Örn: 25.000"
                  className="w-full px-4 py-2 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#0078D0] focus:border-transparent"
                />
              </div>
            </div>

            {/* Sağ: Hesaplama Sonuçları */}
            <div className="bg-[#F5F6F8] rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-[#5A5A5A]">Hesaplama Sonucu</h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-[#E5E5E5]">
                  <span className="text-[#5A5A5A]">Ticari Kar</span>
                  <span className="font-medium text-[#2E2E2E]">₺500.000</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#E5E5E5]">
                  <span className="text-[#5A5A5A]">+ KKEG</span>
                  <span className="font-medium text-[#2E2E2E]">₺50.000</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#E5E5E5]">
                  <span className="text-[#5A5A5A]">- İstisnalar</span>
                  <span className="font-medium text-[#2E2E2E]">₺10.000</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#E5E5E5]">
                  <span className="text-[#5A5A5A] font-medium">Mali Kar (Matrah)</span>
                  <span className="font-bold text-[#2E2E2E]">₺540.000</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#E5E5E5]">
                  <span className="text-[#5A5A5A]">Hesaplanan Vergi (%25)</span>
                  <span className="font-medium text-[#0049AA]">₺135.000</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#E5E5E5]">
                  <span className="text-[#5A5A5A]">- Mahsup (Önceki Dönem)</span>
                  <span className="font-medium text-[#2E2E2E]">₺25.000</span>
                </div>
                <div className="flex justify-between items-center py-3 bg-[#E6F9FF] rounded-lg px-3 mt-2">
                  <span className="font-semibold text-[#00287F]">ÖDENECEk GEÇİCİ VERGİ</span>
                  <span className="text-xl font-bold text-[#0049AA]">₺110.000</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Panel */}
      <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-xl p-5">
        <h3 className="text-[#00287F] font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Geçici Vergi Beyanname Bilgileri
        </h3>
        <ul className="mt-3 text-sm text-[#0049AA] space-y-1">
          <li>• Geçici vergi oranı 2026 yılı için %25'tir (KVK Md. 32).</li>
          <li>• 1. Dönem: 17 Mayıs, 2. Dönem: 17 Ağustos, 3. Dönem: 17 Kasım'a kadar beyan edilir.</li>
          <li>• Kümülatif hesaplama yapılır, önceki dönem ödenen vergiler mahsup edilir.</li>
          <li>• Mali zarar durumunda geçici vergi hesaplanmaz.</li>
        </ul>
      </div>
    </div>
  );
}
