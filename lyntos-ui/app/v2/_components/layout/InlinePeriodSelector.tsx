'use client';

/**
 * Inline Period Selector - KOMPAKT HEADER TASARIMI
 * LYNTOS Kokpit Premium UI
 *
 * Tek satırda: Yıl navigasyonu + 4 çeyrek pill'leri
 * Minimum alan kaplar, her zaman görünür
 */

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, Clock, AlertCircle } from 'lucide-react';
import { useLayoutContext } from './useLayoutContext';
import type { Period } from './types';

const MIN_YEAR = 2025;

type PeriodStatus = 'past' | 'current' | 'future';

interface TimelinePeriod extends Period {
  status: PeriodStatus;
  hasData: boolean;
}

const QUARTER_MONTHS: Record<number, { short: string; full: string }> = {
  1: { short: 'Oca-Mar', full: 'Ocak - Mart' },
  2: { short: 'Nis-Haz', full: 'Nisan - Haziran' },
  3: { short: 'Tem-Eyl', full: 'Temmuz - Eylül' },
  4: { short: 'Eki-Ara', full: 'Ekim - Aralık' },
};

export function InlinePeriodSelector() {
  const { periods, selectedPeriod, setSelectedPeriod, selectedClient } = useLayoutContext();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  const maxYear = currentYear + 1;

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    if (selectedPeriod) return selectedPeriod.year;
    if (periods.length > 0) {
      const activeYears = periods.filter(p => p.isActive).map(p => p.year);
      if (activeYears.length > 0) return Math.max(...activeYears);
      const allYears = [...new Set(periods.map(p => p.year))];
      if (allYears.length > 0) return Math.max(...allYears);
    }
    return currentYear;
  });

  useEffect(() => {
    if (selectedPeriod) {
      setSelectedYear(selectedPeriod.year);
      return;
    }
    if (periods.length > 0) {
      const activeYears = periods.filter(p => p.isActive).map(p => p.year);
      if (activeYears.length > 0) {
        const latestActiveYear = Math.max(...activeYears);
        setSelectedYear(prev => {
          const currentYearHasData = activeYears.includes(prev);
          if (!currentYearHasData) return latestActiveYear;
          return prev;
        });
      }
    }
  }, [periods, selectedPeriod]);

  const handlePrevYear = useCallback(() => {
    setSelectedYear(prev => Math.max(MIN_YEAR, prev - 1));
  }, []);

  const handleNextYear = useCallback(() => {
    setSelectedYear(prev => Math.min(maxYear, prev + 1));
  }, [maxYear]);

  const periodMap = useMemo(() => {
    const map = new Map<string, Period>();
    periods.forEach(p => map.set(`${p.year}-Q${p.periodNumber}`, p));
    return map;
  }, [periods]);

  const allQuarters = useMemo((): TimelinePeriod[] => {
    return [1, 2, 3, 4].map(q => {
      const key = `${selectedYear}-Q${q}`;
      const existing = periodMap.get(key);

      let status: PeriodStatus = 'past';
      if (selectedYear > currentYear || (selectedYear === currentYear && q > currentQuarter)) {
        status = 'future';
      } else if (selectedYear === currentYear && q === currentQuarter) {
        status = 'current';
      }

      if (existing) {
        return { ...existing, status, hasData: existing.isActive };
      }

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

  const handlePeriodClick = (period: TimelinePeriod) => {
    if (period.status === 'future') return;
    setSelectedPeriod(period);
  };

  if (!selectedClient) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Yıl Navigasyonu - Kompakt */}
      <div className="flex items-center gap-1 bg-white/10 rounded-lg px-1">
        <button
          onClick={handlePrevYear}
          disabled={selectedYear <= MIN_YEAR}
          className={`p-1 rounded transition-all ${
            selectedYear <= MIN_YEAR
              ? 'text-white/30 cursor-not-allowed'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
          aria-label="Önceki yıl"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-sm font-bold text-white min-w-[40px] text-center">
          {selectedYear}
        </span>

        <button
          onClick={handleNextYear}
          disabled={selectedYear >= maxYear}
          className={`p-1 rounded transition-all ${
            selectedYear >= maxYear
              ? 'text-white/30 cursor-not-allowed'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
          aria-label="Sonraki yıl"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Çeyrek Pills - Inline */}
      <div className="flex items-center gap-1">
        {allQuarters.map((period) => {
          const isSelected = selectedPeriod?.code === period.code;
          const isCurrent = period.status === 'current';
          const isFuture = period.status === 'future';
          const hasData = period.hasData;

          return (
            <button
              key={period.id}
              onClick={() => handlePeriodClick(period)}
              disabled={isFuture}
              className={`
                relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                transition-all duration-200
                ${isFuture
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : isSelected
                    ? 'bg-white text-[#0049AA] shadow-lg'
                    : isCurrent
                      ? 'bg-white/20 text-white border border-white/40 hover:bg-white/30'
                      : hasData
                        ? 'bg-[#00A651]/20 text-white border border-[#00A651]/50 hover:bg-[#00A651]/30'
                        : 'bg-white/10 text-white/80 hover:bg-white/20'
                }
              `}
              title={`${QUARTER_MONTHS[period.periodNumber].full} ${period.year}${hasData ? ' (Veri mevcut)' : ''}`}
            >
              {/* Çeyrek İsmi */}
              <span className="font-bold">Q{period.periodNumber}</span>

              {/* Durum İkonu - Mini */}
              {isFuture ? (
                <Clock className="w-3 h-3 opacity-50" />
              ) : hasData ? (
                <Check className={`w-3 h-3 ${isSelected ? 'text-[#00A651]' : 'text-[#6BDB83]'}`} />
              ) : !isSelected ? (
                <AlertCircle className="w-3 h-3 text-[#FFB114]" />
              ) : null}

              {/* Seçili indicator */}
              {isSelected && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#0049AA] rounded-full border border-white" />
              )}

              {/* Current period indicator */}
              {isCurrent && !isSelected && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
