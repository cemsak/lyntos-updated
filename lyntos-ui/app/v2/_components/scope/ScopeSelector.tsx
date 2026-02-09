'use client';
/**
 * LYNTOS Scope Selector Component
 * Sprint MOCK-006: Mock data removed, uses only API data from useLayoutContext
 */
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Building2, Calendar, Check, Loader2, AlertCircle } from 'lucide-react';
import { useDashboardScope } from './ScopeProvider';
import { useLayoutContext } from '../layout/useLayoutContext';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface SmmmData {
  id: string;
  ad: string;
  unvan: string;
}

interface MukellefData {
  id: string;
  unvan: string;
  vkn: string;
  smmmId: string;
}

interface DonemData {
  id: string;
  label: string;
  tip: 'aylik' | 'ceyreklik' | 'yillik';
}

// ═══════════════════════════════════════════════════════════════════════════
// DROPDOWN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface DropdownProps<T> {
  label: string;
  icon: React.ReactNode;
  value: string;
  options: T[];
  getOptionId: (opt: T) => string;
  getOptionLabel: (opt: T) => string;
  getOptionSublabel?: (opt: T) => string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
}

function Dropdown<T>({
  label,
  icon,
  value,
  options,
  getOptionId,
  getOptionLabel,
  getOptionSublabel,
  onChange,
  placeholder = 'Seçiniz...',
  disabled = false,
  loading = false,
  error = null,
  emptyMessage = 'Kayıt bulunamadı',
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const selectedOption = options.find(opt => getOptionId(opt) === value);
  const filteredOptions = search
    ? options.filter(opt =>
        getOptionLabel(opt).toLowerCase().includes(search.toLowerCase()) ||
        (getOptionSublabel && getOptionSublabel(opt).toLowerCase().includes(search.toLowerCase()))
      )
    : options;

  return (
    <div ref={containerRef} className="relative">
      {/* Label */}
      <label className="block text-xs font-medium text-[#969696] mb-1">
        {label}
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          if (!disabled && !loading) {
            setIsOpen(!isOpen);
            if (!isOpen) setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        disabled={disabled || loading}
        className={`
          w-full flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200
          ${disabled || loading
            ? 'bg-[#F5F6F8] border-[#E5E5E5] cursor-not-allowed opacity-50'
            : isOpen
              ? 'bg-[#F5F6F8] border-[#0078D0] ring-2 ring-[#0078D0]/20'
              : error
                ? 'bg-[#F5F6F8] border-[#FF9196] hover:border-[#FF555F]'
                : 'bg-[#F5F6F8] border-[#E5E5E5] hover:border-[#E5E5E5]-light'
          }
        `}
      >
        <span className="text-[#969696]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : error ? <AlertCircle className="w-4 h-4 text-[#F0282D]" /> : icon}
        </span>
        <span className={`flex-1 text-left text-sm truncate ${selectedOption ? 'text-[#2E2E2E]' : error ? 'text-[#F0282D]' : 'text-[#969696]'}`}>
          {loading ? 'Yükleniyor...' : error ? 'Yüklenemedi' : (selectedOption ? getOptionLabel(selectedOption) : placeholder)}
        </span>
        <ChevronDown className={`w-4 h-4 text-[#969696] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[#F5F6F8]-card border border-[#E5E5E5] rounded-lg shadow-xl animate-slide-down">
          {/* Search Input */}
          <div className="p-2 border-b border-[#E5E5E5]">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ara..."
              className="w-full px-3 py-1.5 text-sm bg-[#F5F6F8] border border-[#E5E5E5] rounded-md
                         text-[#2E2E2E] placeholder-[#969696]
                         focus:outline-none focus:border-[#0078D0]"
            />
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-[#969696] text-center">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map(opt => {
                const optId = getOptionId(opt);
                const isSelected = optId === value;
                return (
                  <button
                    key={optId}
                    type="button"
                    onClick={() => {
                      onChange(optId);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 text-left transition-colors
                      ${isSelected
                        ? 'bg-[#0078D0]/10 text-[#0078D0]'
                        : 'hover:bg-[#F5F6F8] text-[#2E2E2E]'
                      }
                    `}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{getOptionLabel(opt)}</div>
                      {getOptionSublabel && (
                        <div className="text-xs text-[#969696] truncate">
                          {getOptionSublabel(opt)}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#0078D0] flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCOPE SELECTOR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ScopeSelector() {
  const { scope, setScope } = useDashboardScope();
  const { user, clients, periods, loading, error, refreshPeriods } = useLayoutContext();

  // Convert layout data to dropdown format - NO fallback to mock data
  const smmmList: SmmmData[] = user
    ? [{ id: user.id, ad: user.name, unvan: user.title }]
    : [];

  const mukellefList: MukellefData[] = clients.map(c => ({
    id: c.id,
    unvan: c.name,
    vkn: c.vkn,
    smmmId: user?.id || '',
  }));

  // KRITIK: Backend feed API'si period_code formatını bekliyor ("2025-Q2")
  // periods.id = "OZKAN_KIRTASIYE_2025-Q2" formatında, bu yanlış
  // Scope için period_code (label) kullanılmalı
  const donemList: DonemData[] = periods.map(p => ({
    id: p.code || p.label,  // Backend'in beklediği format: "2025-Q2"
    label: p.description || p.label,
    tip: 'ceyreklik' as const,
  }));

  // Auto-select SMMM if only one option and not already selected
  useEffect(() => {
    if (smmmList.length === 1 && !scope.smmm_id) {
      setScope({ smmm_id: smmmList[0].id });
    }
  }, [smmmList, scope.smmm_id, setScope]);

  // Auto-select first mukellef if only one option and not already selected
  useEffect(() => {
    if (scope.smmm_id && mukellefList.length === 1 && !scope.client_id) {
      handleMukellefChange(mukellefList[0].id);
    }
  }, [scope.smmm_id, mukellefList, scope.client_id]);

  // SMMM GÜVENİ: Auto-select KALDILDI
  // Dönem otomatik seçilmemeli - kullanıcı bilinçli olarak seçmeli
  // Bu sayede yanlış dönem verisi gösterme riski ortadan kalkar
  // useEffect(() => {
  //   if (scope.client_id && donemList.length > 0 && !scope.period) {
  //     setScope({ period: donemList[0].id });
  //   }
  // }, [scope.client_id, donemList, scope.period, setScope]);

  // Handle SMMM change - reset dependent fields
  const handleSmmmChange = (smmmId: string) => {
    setScope({
      smmm_id: smmmId,
      client_id: '', // Reset mukellef
      period: '',    // Reset donem
    });
  };

  // Handle Mukellef change - reset period and fetch new periods
  const handleMukellefChange = async (mukellefId: string) => {
    setScope({
      client_id: mukellefId,
      period: '', // Reset donem
    });

    // Fetch periods for the selected client
    await refreshPeriods(mukellefId);
  };

  // Determine loading states for each dropdown
  const smmmLoading = loading && !user;
  const mukellefLoading = loading && clients.length === 0 && !!scope.smmm_id;
  const donemLoading = loading && periods.length === 0 && !!scope.client_id;

  return (
    <div className="flex items-end gap-3">
      {/* SMMM Selector */}
      <div className="w-48">
        <Dropdown
          label="SMMM"
          icon={<User className="w-4 h-4" />}
          value={scope.smmm_id}
          options={smmmList}
          getOptionId={s => s.id}
          getOptionLabel={s => s.ad}
          getOptionSublabel={s => s.unvan}
          onChange={handleSmmmChange}
          placeholder="SMMM Seçin"
          loading={smmmLoading}
          error={error && !user ? error : null}
          emptyMessage="SMMM bulunamadı"
          disabled={smmmList.length <= 1}
        />
      </div>

      {/* Mükellef Selector */}
      <div className="w-56">
        <Dropdown
          label="Mükellef"
          icon={<Building2 className="w-4 h-4" />}
          value={scope.client_id}
          options={mukellefList}
          getOptionId={m => m.id}
          getOptionLabel={m => m.unvan}
          getOptionSublabel={m => `VKN: ${m.vkn}`}
          onChange={handleMukellefChange}
          placeholder="Mükellef Seçin"
          loading={mukellefLoading}
          error={error && clients.length === 0 && scope.smmm_id ? error : null}
          emptyMessage="Mükellef bulunamadı"
          disabled={!scope.smmm_id}
        />
      </div>

      {/* Dönem Selector */}
      <div className="w-52">
        <Dropdown
          label="Dönem"
          icon={<Calendar className="w-4 h-4" />}
          value={scope.period}
          options={donemList}
          getOptionId={d => d.id}
          getOptionLabel={d => d.label}
          onChange={period => {
            setScope({ period });
          }}
          placeholder="Dönem Seçin"
          loading={donemLoading}
          error={error && periods.length === 0 && scope.client_id ? error : null}
          emptyMessage="Dönem bulunamadı"
          disabled={!scope.client_id}
        />
      </div>
    </div>
  );
}
