import React from 'react';
import { Search, Filter } from 'lucide-react';
import type { ViewMode, DikeyFilter } from './yatayDikeyTypes';

interface AnalysisSearchBarProps {
  viewMode: ViewMode;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  showOnlyMaterial?: boolean;
  onToggleMaterial?: () => void;
  dikeyFilter?: DikeyFilter;
  onDikeyFilterChange?: (filter: DikeyFilter) => void;
}

const DIKEY_FILTERS: DikeyFilter[] = ['tumu', 'aktif', 'pasif', 'gelir', 'gider'];

export function AnalysisSearchBar({
  viewMode,
  searchTerm,
  onSearchChange,
  showOnlyMaterial,
  onToggleMaterial,
  dikeyFilter,
  onDikeyFilterChange,
}: AnalysisSearchBarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#969696]" />
        <input
          type="text"
          placeholder="Hesap kodu veya adı ara..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`w-full pl-9 pr-3 py-2 text-sm border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 ${
            viewMode === 'yatay' ? 'focus:ring-[#0049AA]' : 'focus:ring-[#00A651]'
          }`}
        />
      </div>
      {viewMode === 'yatay' && onToggleMaterial && (
        <button
          onClick={onToggleMaterial}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
            showOnlyMaterial
              ? 'bg-[#FA841E] text-white'
              : 'bg-[#F5F6F8] text-[#5A5A5A] hover:bg-[#E5E5E5]'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Material
        </button>
      )}
      {viewMode === 'dikey' && onDikeyFilterChange && (
        <div className="flex gap-1">
          {DIKEY_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => onDikeyFilterChange(f)}
              className={`px-2 py-1.5 text-[10px] font-medium rounded transition-colors ${
                dikeyFilter === f
                  ? 'bg-[#2E2E2E] text-white'
                  : 'bg-[#F5F6F8] text-[#5A5A5A] hover:bg-[#E5E5E5]'
              }`}
            >
              {f === 'tumu' ? 'Tümü' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
