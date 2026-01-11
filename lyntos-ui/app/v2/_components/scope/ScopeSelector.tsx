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
  placeholder = 'Seciniz...',
  disabled = false,
  loading = false,
  error = null,
  emptyMessage = 'Kayit bulunamadi',
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
      <label className="block text-xs font-medium text-slate-400 mb-1">
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
            ? 'bg-slate-100 border-slate-200 cursor-not-allowed opacity-50'
            : isOpen
              ? 'bg-slate-50 border-blue-500 ring-2 ring-blue-500/20'
              : error
                ? 'bg-slate-50 border-red-300 hover:border-red-400'
                : 'bg-slate-50 border-slate-200 hover:border-slate-200-light'
          }
        `}
      >
        <span className="text-slate-400">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : error ? <AlertCircle className="w-4 h-4 text-red-500" /> : icon}
        </span>
        <span className={`flex-1 text-left text-sm truncate ${selectedOption ? 'text-slate-900' : error ? 'text-red-500' : 'text-slate-400'}`}>
          {loading ? 'Yukleniyor...' : error ? 'Yuklenemedi' : (selectedOption ? getOptionLabel(selectedOption) : placeholder)}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-slate-50-card border border-slate-200 rounded-lg shadow-xl animate-slide-down">
          {/* Search Input */}
          <div className="p-2 border-b border-slate-200">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ara..."
              className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-md
                         text-slate-900 placeholder-slate-400
                         focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate-400 text-center">
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
                        ? 'bg-blue-500/10 text-blue-500'
                        : 'hover:bg-slate-100 text-slate-900'
                      }
                    `}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{getOptionLabel(opt)}</div>
                      {getOptionSublabel && (
                        <div className="text-xs text-slate-400 truncate">
                          {getOptionSublabel(opt)}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />}
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

  const donemList: DonemData[] = periods.map(p => ({
    id: p.id,
    label: p.description || p.label,
    tip: 'ceyreklik' as const,
  }));

  // Auto-select SMMM if only one option and not already selected
  useEffect(() => {
    if (smmmList.length === 1 && !scope.smmm_id) {
      setScope({ smmm_id: smmmList[0].id });
    }
  }, [smmmList, scope.smmm_id, setScope]);

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
          placeholder="SMMM Secin"
          loading={smmmLoading}
          error={error && !user ? error : null}
          emptyMessage="SMMM bulunamadi"
          disabled={smmmList.length <= 1}
        />
      </div>

      {/* Mukellef Selector */}
      <div className="w-56">
        <Dropdown
          label="Mukellef"
          icon={<Building2 className="w-4 h-4" />}
          value={scope.client_id}
          options={mukellefList}
          getOptionId={m => m.id}
          getOptionLabel={m => m.unvan}
          getOptionSublabel={m => `VKN: ${m.vkn}`}
          onChange={handleMukellefChange}
          placeholder="Mukellef Secin"
          loading={mukellefLoading}
          error={error && clients.length === 0 && scope.smmm_id ? error : null}
          emptyMessage="Mukellef bulunamadi"
          disabled={!scope.smmm_id}
        />
      </div>

      {/* Donem Selector */}
      <div className="w-52">
        <Dropdown
          label="Donem"
          icon={<Calendar className="w-4 h-4" />}
          value={scope.period}
          options={donemList}
          getOptionId={d => d.id}
          getOptionLabel={d => d.label}
          onChange={period => setScope({ period })}
          placeholder="Donem Secin"
          loading={donemLoading}
          error={error && periods.length === 0 && scope.client_id ? error : null}
          emptyMessage="Donem bulunamadi"
          disabled={!scope.client_id}
        />
      </div>
    </div>
  );
}
