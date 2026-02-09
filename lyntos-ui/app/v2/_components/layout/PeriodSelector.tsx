'use client';

/**
 * LYNTOS Period Selector Component
 * Sprint 7.3 - Stripe Dashboard Shell
 * Sprint 8 - Enhanced Year + Quarter/Month selection
 *
 * Yıl bazlı gruplandırılmış dönem seçici
 * 2025'ten başlayarak çeyreklik dönemler gösterir
 */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { useLayoutContext } from './useLayoutContext';
import { QUARTERS_TR } from './types';
import type { Period } from './types';

export function PeriodSelector() {
  const { periods, selectedPeriod, setSelectedPeriod, selectedClient } = useLayoutContext();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Dönemleri yıla göre grupla
  const periodsByYear = useMemo(() => {
    const grouped: Record<number, Period[]> = {};

    periods.forEach(period => {
      const year = period.year || parseInt(period.startDate?.substring(0, 4) || '2025');
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(period);
    });

    // Her yıl içinde dönemleri sırala (Q1 -> Q4)
    Object.keys(grouped).forEach(year => {
      grouped[parseInt(year)].sort((a, b) => (a.periodNumber || 1) - (b.periodNumber || 1));
    });

    return grouped;
  }, [periods]);

  // Yılları sırala (en yeni üstte)
  const sortedYears = useMemo(() => {
    return Object.keys(periodsByYear)
      .map(Number)
      .sort((a, b) => b - a);
  }, [periodsByYear]);

  // Mevcut yılı otomatik genişlet
  useEffect(() => {
    if (selectedPeriod) {
      const year = selectedPeriod.year || parseInt(selectedPeriod.startDate?.substring(0, 4) || '2025');
      setExpandedYear(year);
    } else if (sortedYears.length > 0) {
      setExpandedYear(sortedYears[0]); // En son yılı genişlet
    }
  }, [selectedPeriod, sortedYears]);

  // Dışarı tıklama
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mükellef seçili değilse
  if (!selectedClient) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E5E5] bg-[#F5F6F8] text-[#969696] min-w-[160px]">
        <Calendar className="w-4 h-4" />
        <span className="text-[14px]">Önce mükellef seçin</span>
      </div>
    );
  }

  // Dönemler yükleniyorsa
  if (periods.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E5E5] bg-[#F5F6F8] min-w-[160px]">
        <Calendar className="w-4 h-4 text-[#5A5A5A]" />
        <span className="text-[14px] text-[#5A5A5A]">Dönem yükleniyor...</span>
      </div>
    );
  }

  const toggleYear = (year: number) => {
    setExpandedYear(expandedYear === year ? null : year);
  };

  // Çeyrek ismini al
  const getQuarterName = (periodNumber: number): string => {
    return QUARTERS_TR?.[periodNumber] || `Q${periodNumber}`;
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
          ${isOpen
            ? 'border-[#0049AA] bg-[#0049AA]/5'
            : 'border-[#E5E5E5] hover:border-[#0049AA]'
          }
          bg-white
          min-w-[180px]
        `}
      >
        <Calendar className="w-4 h-4 text-[#5A5A5A]" />
        <span className="flex-1 text-left text-[14px] text-[#2E2E2E]">
          {selectedPeriod ? selectedPeriod.label : 'Dönem Seçin'}
        </span>
        <ChevronDown className={`w-4 h-4 text-[#5A5A5A] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-[280px] bg-white border border-[#E5E5E5] rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto">
          {/* Header */}
          <div className="px-3 py-2 border-b border-[#E5E5E5] bg-[#F5F6F8]">
            <div className="text-[12px] font-medium text-[#5A5A5A] uppercase tracking-wide">
              Dönem Seçin
            </div>
          </div>

          {/* Years */}
          {sortedYears.map(year => (
            <div key={year} className="border-b border-[#E5E5E5] last:border-b-0">
              {/* Year Header */}
              <button
                onClick={() => toggleYear(year)}
                className={`
                  w-full flex items-center justify-between px-3 py-2.5
                  hover:bg-[#F5F6F8] transition-colors
                  ${expandedYear === year ? 'bg-[#F5F6F8]' : ''}
                `}
              >
                <div className="flex items-center gap-2">
                  <ChevronRight
                    className={`w-4 h-4 text-[#5A5A5A] transition-transform ${
                      expandedYear === year ? 'rotate-90' : ''
                    }`}
                  />
                  <span className="text-[15px] font-semibold text-[#2E2E2E]">
                    {year}
                  </span>
                </div>
                <span className="text-[12px] text-[#5A5A5A]">
                  {periodsByYear[year]?.length || 0} dönem
                </span>
              </button>

              {/* Quarters */}
              {expandedYear === year && periodsByYear[year] && (
                <div className="pl-2 pr-1 pb-1">
                  {periodsByYear[year].map(period => (
                    <button
                      key={period.id}
                      onClick={() => {
                        setSelectedPeriod(period);
                        setIsOpen(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-md text-left
                        hover:bg-[#F5F6F8] transition-colors
                        ${selectedPeriod?.id === period.id ? 'bg-[#0049AA]/10' : ''}
                      `}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-medium text-[#2E2E2E]">
                            {getQuarterName(period.periodNumber || 1)}
                          </span>
                          {period.isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-[#00A651]/10 text-[#00A651] rounded font-medium">
                              Güncel
                            </span>
                          )}
                          {period.isActive && !period.isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-[#0049AA]/10 text-[#0049AA] rounded font-medium">
                              Aktif
                            </span>
                          )}
                        </div>
                        <div className="text-[12px] text-[#5A5A5A]">
                          {period.description}
                        </div>
                      </div>

                      {selectedPeriod?.id === period.id && (
                        <Check className="w-4 h-4 text-[#0049AA]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Empty State */}
          {sortedYears.length === 0 && (
            <div className="px-4 py-8 text-center">
              <Calendar className="w-8 h-8 mx-auto text-[#5A5A5A] mb-2" />
              <div className="text-[14px] text-[#5A5A5A]">
                Dönem bulunamadı
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
