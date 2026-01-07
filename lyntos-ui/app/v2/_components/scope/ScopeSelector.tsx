'use client';
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Building2, Calendar, Check } from 'lucide-react';
import { useDashboardScope } from './ScopeProvider';

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA - Gerçek API entegrasyonunda değiştirilecek
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

const MOCK_SMMMLER: SmmmData[] = [
  { id: 'smmm-001', ad: 'Ahmet Yılmaz', unvan: 'SMMM' },
  { id: 'smmm-002', ad: 'Fatma Demir', unvan: 'SMMM' },
  { id: 'smmm-003', ad: 'Mehmet Kaya', unvan: 'YMM' },
];

const MOCK_MUKELLEFLER: MukellefData[] = [
  { id: 'muk-001', unvan: 'ABC Teknoloji A.Ş.', vkn: '1234567890', smmmId: 'smmm-001' },
  { id: 'muk-002', unvan: 'XYZ Yazılım Ltd.Şti.', vkn: '0987654321', smmmId: 'smmm-001' },
  { id: 'muk-003', unvan: 'Demo Ticaret A.Ş.', vkn: '5555555555', smmmId: 'smmm-001' },
  { id: 'muk-004', unvan: 'Test Holding A.Ş.', vkn: '6666666666', smmmId: 'smmm-002' },
  { id: 'muk-005', unvan: 'Örnek İnşaat Ltd.', vkn: '7777777777', smmmId: 'smmm-002' },
];

const MOCK_DONEMLER: DonemData[] = [
  { id: '2025-Q4', label: '2025 Q4 (Ekim-Aralık)', tip: 'ceyreklik' },
  { id: '2025-Q3', label: '2025 Q3 (Temmuz-Eylül)', tip: 'ceyreklik' },
  { id: '2025-Q2', label: '2025 Q2 (Nisan-Haziran)', tip: 'ceyreklik' },
  { id: '2025-Q1', label: '2025 Q1 (Ocak-Mart)', tip: 'ceyreklik' },
  { id: '2024-Q4', label: '2024 Q4 (Ekim-Aralık)', tip: 'ceyreklik' },
  { id: '2024', label: '2024 Yıllık', tip: 'yillik' },
];

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
      <label className="block text-xs font-medium text-lyntos-text-muted mb-1">
        {label}
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        disabled={disabled}
        className={`
          w-full flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200
          ${disabled
            ? 'bg-lyntos-bg-elevated border-lyntos-border cursor-not-allowed opacity-50'
            : isOpen
              ? 'bg-lyntos-bg-input border-lyntos-accent ring-2 ring-lyntos-accent/20'
              : 'bg-lyntos-bg-input border-lyntos-border hover:border-lyntos-border-light'
          }
        `}
      >
        <span className="text-lyntos-text-muted">{icon}</span>
        <span className={`flex-1 text-left text-sm truncate ${selectedOption ? 'text-lyntos-text-primary' : 'text-lyntos-text-muted'}`}>
          {selectedOption ? getOptionLabel(selectedOption) : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-lyntos-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-lyntos-bg-card border border-lyntos-border rounded-lg shadow-xl animate-slide-down">
          {/* Search Input */}
          <div className="p-2 border-b border-lyntos-border">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ara..."
              className="w-full px-3 py-1.5 text-sm bg-lyntos-bg-input border border-lyntos-border rounded-md
                         text-lyntos-text-primary placeholder-lyntos-text-muted
                         focus:outline-none focus:border-lyntos-accent"
            />
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-lyntos-text-muted text-center">
                Sonuç bulunamadı
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
                        ? 'bg-lyntos-accent/10 text-lyntos-accent'
                        : 'hover:bg-lyntos-bg-elevated text-lyntos-text-primary'
                      }
                    `}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{getOptionLabel(opt)}</div>
                      {getOptionSublabel && (
                        <div className="text-xs text-lyntos-text-muted truncate">
                          {getOptionSublabel(opt)}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-lyntos-accent flex-shrink-0" />}
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

  // Filter mükellefer based on selected SMMM
  const filteredMukellefler = scope.smmm_id
    ? MOCK_MUKELLEFLER.filter(m => m.smmmId === scope.smmm_id)
    : MOCK_MUKELLEFLER;

  // Handle SMMM change - reset dependent fields
  const handleSmmmChange = (smmmId: string) => {
    setScope({
      smmm_id: smmmId,
      client_id: '', // Reset mükellef
      period: '',    // Reset dönem
    });
  };

  // Handle Mükellef change - reset period
  const handleMukellefChange = (mukellefId: string) => {
    setScope({
      client_id: mukellefId,
      period: '', // Reset dönem
    });
  };

  return (
    <div className="flex items-end gap-3">
      {/* SMMM Selector */}
      <div className="w-48">
        <Dropdown
          label="SMMM"
          icon={<User className="w-4 h-4" />}
          value={scope.smmm_id}
          options={MOCK_SMMMLER}
          getOptionId={s => s.id}
          getOptionLabel={s => s.ad}
          getOptionSublabel={s => s.unvan}
          onChange={handleSmmmChange}
          placeholder="SMMM Seçin"
        />
      </div>

      {/* Mükellef Selector */}
      <div className="w-56">
        <Dropdown
          label="Mükellef"
          icon={<Building2 className="w-4 h-4" />}
          value={scope.client_id}
          options={filteredMukellefler}
          getOptionId={m => m.id}
          getOptionLabel={m => m.unvan}
          getOptionSublabel={m => `VKN: ${m.vkn}`}
          onChange={handleMukellefChange}
          placeholder="Mükellef Seçin"
          disabled={!scope.smmm_id}
        />
      </div>

      {/* Dönem Selector */}
      <div className="w-52">
        <Dropdown
          label="Dönem"
          icon={<Calendar className="w-4 h-4" />}
          value={scope.period}
          options={MOCK_DONEMLER}
          getOptionId={d => d.id}
          getOptionLabel={d => d.label}
          onChange={period => setScope({ period })}
          placeholder="Dönem Seçin"
          disabled={!scope.client_id}
        />
      </div>
    </div>
  );
}
