import React from 'react';
import { Search, Filter } from 'lucide-react';
import { TYPE_COLORS } from './regwatch-types';
import type { Statistics } from './regwatch-types';

export function SearchBox({
  query,
  onQueryChange,
  onSearch,
  showFilters,
  onToggleFilters,
  selectedTypes,
  selectedKurumlar,
  onToggleType,
  onToggleKurum,
  onClearFilters,
  typeLabels,
  kurumLabels,
  statistics
}: {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  selectedTypes: string[];
  selectedKurumlar: string[];
  onToggleType: (type: string) => void;
  onToggleKurum: (kurum: string) => void;
  onClearFilters: () => void;
  typeLabels: Record<string, string>;
  kurumLabels: Record<string, string>;
  statistics: Statistics | null;
}) {
  return (
    <div className="bg-white dark:bg-[#2E2E2E] rounded-xl border border-[#E5E5E5] dark:border-[#5A5A5A] p-4">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#969696]" />
            <input
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Mevzuat ara... (örn: KDV istisna, transfer fiyatlandırması, e-fatura tebliği, SGK prim)"
              className="w-full pl-10 pr-4 py-3 border border-[#B4B4B4] dark:border-[#5A5A5A] rounded-lg bg-white dark:bg-[#2E2E2E] text-[#2E2E2E] dark:text-white placeholder-[#969696] focus:ring-2 focus:ring-[#0078D0] focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            />
          </div>
          <button
            onClick={onToggleFilters}
            className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
              showFilters || selectedTypes.length > 0 || selectedKurumlar.length > 0
                ? 'bg-[#E6F9FF] border-[#5ED6FF] text-[#0049AA] dark:bg-[#00287F]/30 dark:border-[#0049AA] dark:text-[#5ED6FF]'
                : 'border-[#B4B4B4] dark:border-[#5A5A5A] text-[#5A5A5A] dark:text-[#B4B4B4] hover:bg-[#F5F6F8] dark:hover:bg-[#5A5A5A]'
            }`}
          >
            <Filter className="h-5 w-5" />
            Filtreler
            {(selectedTypes.length > 0 || selectedKurumlar.length > 0) && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-[#0049AA] text-white rounded-full">
                {selectedTypes.length + selectedKurumlar.length}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="p-4 bg-[#F5F6F8] dark:bg-[#2E2E2E]/50 rounded-lg space-y-4">
            <div>
              <div className="text-sm font-medium text-[#5A5A5A] dark:text-[#B4B4B4] mb-2">
                Mevzuat Türü
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(typeLabels).map(([type, label]) => (
                  <button
                    key={type}
                    onClick={() => onToggleType(type)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      selectedTypes.includes(type)
                        ? TYPE_COLORS[type]
                        : 'bg-white dark:bg-[#5A5A5A] text-[#5A5A5A] dark:text-[#B4B4B4] border border-[#B4B4B4] dark:border-[#5A5A5A] hover:bg-[#F5F6F8] dark:hover:bg-[#5A5A5A]'
                    }`}
                  >
                    {label}
                    {statistics?.by_type[type] && (
                      <span className="ml-1 text-xs opacity-70">
                        ({statistics.by_type[type]})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-[#5A5A5A] dark:text-[#B4B4B4] mb-2">
                Kurum
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(kurumLabels).map(([kurum, label]) => (
                  <button
                    key={kurum}
                    onClick={() => onToggleKurum(kurum)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      selectedKurumlar.includes(kurum)
                        ? 'bg-[#E6F9FF] text-[#00287F] dark:bg-[#00287F]/30 dark:text-[#5ED6FF]'
                        : 'bg-white dark:bg-[#5A5A5A] text-[#5A5A5A] dark:text-[#B4B4B4] border border-[#B4B4B4] dark:border-[#5A5A5A] hover:bg-[#F5F6F8] dark:hover:bg-[#5A5A5A]'
                    }`}
                  >
                    {label}
                    {statistics?.by_kurum[kurum] && (
                      <span className="ml-1 text-xs opacity-70">
                        ({statistics.by_kurum[kurum]})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {(selectedTypes.length > 0 || selectedKurumlar.length > 0) && (
              <button
                onClick={onClearFilters}
                className="text-sm text-[#BF192B] dark:text-[#FF555F] hover:underline"
              >
                Filtreleri Temizle
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
