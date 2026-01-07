'use client';

/**
 * LYNTOS Period Selector Component
 * Sprint 7.3 - Stripe Dashboard Shell
 * Period dropdown with active/current indicators
 */
import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { useLayoutContext } from './useLayoutContext';

export function PeriodSelector() {
  const { periods, selectedPeriod, setSelectedPeriod } = useLayoutContext();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
          ${isOpen
            ? 'border-[#635bff] bg-[#635bff]/5'
            : 'border-[#e3e8ee] dark:border-[#2d3343] hover:border-[#635bff]'
          }
          bg-white dark:bg-[#1a1f2e]
          min-w-[160px]
        `}
      >
        <Calendar className="w-4 h-4 text-[#697386]" />
        <span className="flex-1 text-left text-[14px] text-[#1a1f36] dark:text-white">
          {selectedPeriod ? selectedPeriod.label : 'Dönem Seçin'}
        </span>
        <ChevronDown className={`w-4 h-4 text-[#697386] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-[240px] bg-white dark:bg-[#1a1f2e] border border-[#e3e8ee] dark:border-[#2d3343] rounded-lg shadow-lg z-50 py-1">
          {periods.map(period => (
            <button
              key={period.id}
              onClick={() => {
                setSelectedPeriod(period);
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#f6f9fc] dark:hover:bg-[#0a0d14] transition-colors
                ${selectedPeriod?.id === period.id ? 'bg-[#635bff]/5' : ''}
              `}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-[#1a1f36] dark:text-white">
                    {period.label}
                  </span>
                  {period.isCurrent && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-[#0caf60]/10 text-[#0caf60] rounded font-medium">
                      Güncel
                    </span>
                  )}
                  {period.isActive && !period.isCurrent && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-[#635bff]/10 text-[#635bff] rounded font-medium">
                      Aktif
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-[#697386]">
                  {period.description}
                </div>
              </div>

              {selectedPeriod?.id === period.id && (
                <Check className="w-4 h-4 text-[#635bff]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
