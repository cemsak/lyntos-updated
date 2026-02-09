'use client';

/**
 * Timeline Period Selector - BÜYÜK KUTULAR TASARIMI
 * LYNTOS Kokpit Premium UI - Faz 2 Refaktör
 *
 * İŞ KURALLARI:
 * - 2025 ve sonrası yıllar seçilebilir (2024 ve öncesi YOK)
 * - Tüm dönemler SEÇİLEBİLİR (veri yüklemek için)
 * - Verisi olan dönemler yeşil "Veri" gösterir (backend isActive=true)
 * - Verisi olmayan dönemler sarı "Bekliyor" gösterir
 * - Gelecek dönemler (henüz gelmemiş) gri "Yakında" gösterir
 * - Varsayılan olarak VERİSİ OLAN en güncel yıla gider
 */

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, Clock, Calendar, AlertCircle } from 'lucide-react';
import { useLayoutContext } from './useLayoutContext';
import type { Period } from './types';

// Minimum yıl - 2025 öncesi desteklenmiyor
const MIN_YEAR = 2025;

// Dönem durumu için tip
type PeriodStatus = 'past' | 'current' | 'future';

interface TimelinePeriod extends Period {
  status: PeriodStatus;
  hasData: boolean;
}

// Çeyrek için ay aralıkları
const QUARTER_MONTHS: Record<number, { short: string; full: string }> = {
  1: { short: 'Oca-Mar', full: 'Ocak - Mart' },
  2: { short: 'Nis-Haz', full: 'Nisan - Haziran' },
  3: { short: 'Tem-Eyl', full: 'Temmuz - Eylül' },
  4: { short: 'Eki-Ara', full: 'Ekim - Aralık' },
};

// Çeyrek kısa isimleri
const QUARTER_NAMES: Record<number, string> = {
  1: 'Q1',
  2: 'Q2',
  3: 'Q3',
  4: 'Q4',
};

export function TimelinePeriodSelector() {
  const { periods, selectedPeriod, setSelectedPeriod, selectedClient } = useLayoutContext();

  // Güncel tarih bilgileri
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;

  // Max yıl - güncel yıl + 1 (gelecek yıl da seçilebilir)
  const maxYear = currentYear + 1;

  // Seçili yıl state'i
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    // 1. Seçili period varsa onun yılını kullan
    if (selectedPeriod) return selectedPeriod.year;

    // 2. Verisi olan yılları kontrol et
    if (periods.length > 0) {
      const activeYears = periods
        .filter(p => p.isActive)
        .map(p => p.year);

      if (activeYears.length > 0) {
        // En güncel verili yıl
        return Math.max(...activeYears);
      }

      // Hiç aktif veri yoksa, mevcut yılları kontrol et
      const allYears = [...new Set(periods.map(p => p.year))];
      if (allYears.length > 0) {
        return Math.max(...allYears);
      }
    }

    // 3. Hiç veri yoksa güncel yıl
    return currentYear;
  });

  // Periods veya selectedPeriod değiştiğinde yılı senkronize et
  useEffect(() => {
    // Seçili period varsa, onun yılına git
    if (selectedPeriod) {
      setSelectedYear(selectedPeriod.year);
      return;
    }

    // Periods yüklendiyse, verisi olan yıla git
    if (periods.length > 0) {
      const activeYears = periods
        .filter(p => p.isActive)
        .map(p => p.year);

      if (activeYears.length > 0) {
        const latestActiveYear = Math.max(...activeYears);
        setSelectedYear(prev => {
          // Sadece mevcut yılda veri yoksa değiştir
          const currentYearHasData = activeYears.includes(prev);
          if (!currentYearHasData) {
            return latestActiveYear;
          }
          return prev;
        });
      }
    }
  }, [periods, selectedPeriod]);

  // Yıl navigasyonu
  const handlePrevYear = useCallback(() => {
    setSelectedYear(prev => Math.max(MIN_YEAR, prev - 1));
  }, []);

  const handleNextYear = useCallback(() => {
    setSelectedYear(prev => Math.min(maxYear, prev + 1));
  }, [maxYear]);

  // Backend'den gelen dönemleri map'e çevir (hızlı erişim için)
  const periodMap = useMemo(() => {
    const map = new Map<string, Period>();
    periods.forEach(p => {
      map.set(`${p.year}-Q${p.periodNumber}`, p);
    });
    return map;
  }, [periods]);

  // 4 çeyreği her zaman göster
  const allQuarters = useMemo((): TimelinePeriod[] => {
    return [1, 2, 3, 4].map(q => {
      const key = `${selectedYear}-Q${q}`;
      const existing = periodMap.get(key);

      // Dönem durumunu hesapla
      let status: PeriodStatus = 'past';
      if (selectedYear > currentYear || (selectedYear === currentYear && q > currentQuarter)) {
        status = 'future';
      } else if (selectedYear === currentYear && q === currentQuarter) {
        status = 'current';
      }

      // Backend'den veri varsa kullan
      if (existing) {
        return {
          ...existing,
          status,
          hasData: existing.isActive, // Backend'den gelen isActive = veri var mı
        };
      }

      // Placeholder dönem oluştur
      return {
        id: key,
        code: key,
        label: `Q${q} ${selectedYear}`,
        description: QUARTER_MONTHS[q].full,
        startDate: '',
        endDate: '',
        isActive: false,
        isCurrent: status === 'current',
        year: selectedYear,
        periodType: 'quarter' as const,
        periodNumber: q,
        status,
        hasData: false,
      };
    });
  }, [selectedYear, periodMap, currentYear, currentQuarter]);

  // Dönem seçme handler - TÜM DÖNEMLER SEÇİLEBİLİR (gelecek hariç)
  const handlePeriodClick = (period: TimelinePeriod) => {
    // Gelecek dönemler seçilemez
    if (period.status === 'future') return;

    // Diğer tüm dönemler seçilebilir (veri yüklemek için)
    setSelectedPeriod(period);
  };

  // Mükellef seçilmemişse
  if (!selectedClient) {
    return (
      <div className="flex items-center justify-center py-3 px-4 bg-[#F5F6F8] rounded-xl border border-[#E5E5E5]">
        <Calendar className="w-4 h-4 text-[#5A5A5A] mr-2" />
        <span className="text-sm text-[#5A5A5A]">Önce mükellef seçin</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-sm overflow-hidden">
      {/* Yıl Navigasyonu Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#F5F6F8] border-b border-[#E5E5E5]">
        <button
          onClick={handlePrevYear}
          disabled={selectedYear <= MIN_YEAR}
          className={`
            p-1.5 rounded-lg transition-all
            ${selectedYear <= MIN_YEAR
              ? 'text-[#969696] cursor-not-allowed'
              : 'text-[#5A5A5A] hover:text-[#0049AA] hover:bg-[#E6F9FF]'
            }
          `}
          aria-label="Önceki yıl"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-[#2E2E2E]">{selectedYear}</span>
          {selectedYear === currentYear && (
            <span className="text-[10px] font-medium text-[#0049AA] bg-[#E6F9FF] px-2 py-0.5 rounded-full">
              Güncel Yıl
            </span>
          )}
        </div>

        <button
          onClick={handleNextYear}
          disabled={selectedYear >= maxYear}
          className={`
            p-1.5 rounded-lg transition-all
            ${selectedYear >= maxYear
              ? 'text-[#969696] cursor-not-allowed'
              : 'text-[#5A5A5A] hover:text-[#0049AA] hover:bg-[#E6F9FF]'
            }
          `}
          aria-label="Sonraki yıl"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 4 Çeyrek Kutular Grid */}
      <div className="grid grid-cols-4 gap-2 p-3">
        {allQuarters.map((period) => {
          const isSelected = selectedPeriod?.code === period.code;
          const isCurrent = period.status === 'current';
          const isFuture = period.status === 'future';
          const hasData = period.hasData;

          // Tıklanabilirlik: Gelecek hariç tümü tıklanabilir
          const isClickable = !isFuture;

          return (
            <button
              key={period.id}
              onClick={() => handlePeriodClick(period)}
              disabled={!isClickable}
              className={`
                relative flex flex-col items-center justify-center
                min-h-[72px] p-2 rounded-xl transition-all duration-200
                border-2
                ${isFuture
                  ? 'bg-[#F5F6F8] border-[#E5E5E5] cursor-not-allowed opacity-50'
                  : isSelected
                    ? 'bg-[#0049AA] border-[#0049AA] text-white shadow-lg shadow-[#0049AA]/30'
                    : isCurrent
                      ? 'bg-[#E6F9FF] border-[#0049AA] hover:bg-[#ABEBFF] hover:border-[#0078D0] cursor-pointer'
                      : hasData
                        ? 'bg-white border-[#00A651] hover:border-[#0049AA] hover:bg-[#E6F9FF] cursor-pointer'
                        : 'bg-white border-[#E5E5E5] hover:border-[#0049AA] hover:bg-[#E6F9FF] cursor-pointer'
                }
              `}
              title={`${QUARTER_MONTHS[period.periodNumber].full} ${period.year}${hasData ? ' (Veri mevcut)' : ' (Veri yüklenebilir)'}`}
            >
              {/* Çeyrek İsmi */}
              <span className={`
                text-base font-bold
                ${isSelected ? 'text-white' : isFuture ? 'text-[#969696]' : 'text-[#2E2E2E]'}
              `}>
                {QUARTER_NAMES[period.periodNumber]}
              </span>

              {/* Durum İkonu */}
              <div className={`
                flex items-center gap-1 mt-1
                ${isSelected ? 'text-white/90' : 'text-[#5A5A5A]'}
              `}>
                {isFuture ? (
                  <>
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px]">Yakında</span>
                  </>
                ) : hasData ? (
                  <>
                    <Check className="w-3 h-3 text-[#00A651]" />
                    <span className={`text-[10px] ${isSelected ? 'text-white/90' : 'text-[#00A651]'}`}>
                      Veri
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 text-[#FFB114]" />
                    <span className={`text-[10px] ${isSelected ? 'text-white/90' : 'text-[#FFB114]'}`}>
                      Bekliyor
                    </span>
                  </>
                )}
              </div>

              {/* Ay Aralığı */}
              <span className={`
                text-[9px] mt-1
                ${isSelected ? 'text-white/70' : isFuture ? 'text-[#969696]' : 'text-[#5A5A5A]'}
              `}>
                {QUARTER_MONTHS[period.periodNumber].short}
              </span>

              {/* Güncel Dönem İşareti */}
              {isCurrent && !isSelected && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#0049AA] rounded-full border-2 border-white shadow" />
              )}

              {/* Seçili İşareti */}
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full border-2 border-[#0049AA] shadow flex items-center justify-center">
                  <Check className="w-3 h-3 text-[#0049AA]" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Alt Bilgi - Seçili Dönem */}
      {selectedPeriod && (
        <div className="px-4 py-2 bg-[#F5F6F8] border-t border-[#E5E5E5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#5A5A5A]">Seçili Dönem:</span>
            <span className="text-sm font-semibold text-[#0049AA]">
              {QUARTER_NAMES[selectedPeriod.periodNumber]} {selectedPeriod.year}
            </span>
          </div>
          <span className="text-[10px] text-[#5A5A5A]">
            {QUARTER_MONTHS[selectedPeriod.periodNumber]?.full}
          </span>
        </div>
      )}
    </div>
  );
}

// Export edilecek yardımcı component - LYNTOS Blue ile güncellendi
export function PeriodBadge({ period }: { period: Period | null }) {
  if (!period) return null;

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#E6F9FF] rounded-lg text-[#0049AA] text-sm font-medium border border-[#0078D0]/20">
      <span className="w-1.5 h-1.5 rounded-full bg-[#0049AA]" />
      Q{period.periodNumber} {period.year}
    </span>
  );
}
