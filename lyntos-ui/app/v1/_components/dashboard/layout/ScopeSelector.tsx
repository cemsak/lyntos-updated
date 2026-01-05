'use client';

// ════════════════════════════════════════════════════════════════════════════
// ScopeSelector - SMMM/Mükellef/Dönem dropdowns
// ════════════════════════════════════════════════════════════════════════════

interface ScopeSelectorProps {
  smmms: { id: string; name: string }[];
  clients: { id: string; name: string }[];
  periods: string[];
  selectedSmmm: string;
  selectedClient: string;
  selectedPeriod: string;
  onSmmmChange: (id: string) => void;
  onClientChange: (id: string) => void;
  onPeriodChange: (period: string) => void;
  loading?: boolean;
}

export function ScopeSelector({
  smmms,
  clients,
  periods,
  selectedSmmm,
  selectedClient,
  selectedPeriod,
  onSmmmChange,
  onClientChange,
  onPeriodChange,
  loading = false
}: ScopeSelectorProps) {
  const selectStyles = `
    appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8
    text-sm text-gray-900
    hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:bg-gray-100 disabled:text-gray-500
    cursor-pointer
  `;

  const labelStyles = "text-xs font-medium text-gray-500 uppercase tracking-wide";

  return (
    <div className="flex items-end gap-4">
      {/* SMMM Selector */}
      <div className="flex flex-col gap-1">
        <label className={labelStyles}>SMMM</label>
        <div className="relative">
          <select
            value={selectedSmmm}
            onChange={(e) => onSmmmChange(e.target.value)}
            disabled={loading || smmms.length <= 1}
            className={selectStyles}
          >
            {smmms.map((smmm) => (
              <option key={smmm.id} value={smmm.id}>
                {smmm.name}
              </option>
            ))}
          </select>
          <ChevronDown />
        </div>
      </div>

      {/* Client Selector */}
      <div className="flex flex-col gap-1">
        <label className={labelStyles}>Mukellef</label>
        <div className="relative">
          <select
            value={selectedClient}
            onChange={(e) => onClientChange(e.target.value)}
            disabled={loading}
            className={selectStyles}
          >
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <ChevronDown />
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex flex-col gap-1">
        <label className={labelStyles}>Donem</label>
        <div className="relative">
          <select
            value={selectedPeriod}
            onChange={(e) => onPeriodChange(e.target.value)}
            disabled={loading}
            className={selectStyles}
          >
            {periods.map((period) => (
              <option key={period} value={period}>
                {formatPeriod(period)}
              </option>
            ))}
          </select>
          <ChevronDown />
        </div>
      </div>
    </div>
  );
}

// Helper: Format period for display
function formatPeriod(period: string): string {
  // Convert "2025-Q2" to "2025 Q2" or similar
  const match = period.match(/^(\d{4})-Q(\d)$/);
  if (match) {
    const [, year, quarter] = match;
    const quarterNames = ['', '1. Ceyrek', '2. Ceyrek', '3. Ceyrek', '4. Ceyrek'];
    return `${year} ${quarterNames[parseInt(quarter)]}`;
  }
  return period;
}

// Chevron icon component
function ChevronDown() {
  return (
    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}

export default ScopeSelector;
