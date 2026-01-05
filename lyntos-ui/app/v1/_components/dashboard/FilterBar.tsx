'use client';

import { useDashboardScope } from './hooks/useDashboardScope';

// ════════════════════════════════════════════════════════════════════════════
// FilterBar - Mükellef + Dönem Seçimi (Merkezi scope kullanır)
// ════════════════════════════════════════════════════════════════════════════

interface FilterBarProps {
  smmm: string;
}

export function FilterBar({ smmm }: FilterBarProps) {
  const {
    scope,
    isReady,
    taxpayers,
    periods,
    loadingTaxpayers,
    loadingPeriods,
    setClient,
    setPeriod,
  } = useDashboardScope(smmm);

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center gap-6 flex-wrap">
        {/* Mükellef */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Mukellef
          </label>
          <select
            value={scope.client}
            onChange={(e) => setClient(e.target.value)}
            disabled={loadingTaxpayers}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm min-w-[240px] bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">
              {loadingTaxpayers ? 'Yukleniyor...' : 'Mukellef secin...'}
            </option>
            {taxpayers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dönem */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Donem
          </label>
          <select
            value={scope.period}
            onChange={(e) => setPeriod(e.target.value)}
            disabled={!scope.client || loadingPeriods}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm min-w-[180px] bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            <option value="">
              {loadingPeriods ? 'Yukleniyor...' : 'Donem secin...'}
            </option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status indicator */}
        {isReady && (
          <div className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 px-3 py-1 rounded-full ml-auto">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Veri hazir</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default FilterBar;
