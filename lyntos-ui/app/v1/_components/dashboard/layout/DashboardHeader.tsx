'use client';

// ════════════════════════════════════════════════════════════════════════════
// DashboardHeader - Layer 1: Sticky header with brand, scope controls, actions
// ════════════════════════════════════════════════════════════════════════════

import { AdvancedToggle } from '../shared/AdvancedToggle';

interface DashboardHeaderProps {
  smmmName: string;
  clientName: string;
  period: string;
  advancedMode: boolean;
  onAdvancedToggle: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function DashboardHeader({
  smmmName,
  clientName,
  period,
  advancedMode,
  onAdvancedToggle,
  onRefresh,
  refreshing = false
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-[1440px] mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Brand + Context */}
          <div className="flex items-center gap-6">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">L</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">Lyntos</span>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-200" />

            {/* Context breadcrumb */}
            <nav className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">{smmmName}</span>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-medium text-gray-900">{clientName}</span>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-gray-600">{period}</span>
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            {/* Advanced Toggle */}
            <AdvancedToggle
              checked={advancedMode}
              onChange={onAdvancedToggle}
              label="Gelismis"
            />

            {/* Refresh Button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Verileri yenile"
              >
                <svg
                  className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}

            {/* Help */}
            <button
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Yardim"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default DashboardHeader;
