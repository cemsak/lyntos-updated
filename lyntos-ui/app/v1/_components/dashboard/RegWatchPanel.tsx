'use client';

import type { RegWatchData } from './types';
import { getHumanError, getSeverityStyles } from './utils/errorMessages';
import { getRegWatchStatusLabel, getChangesLabel, getScraperMessage, getStatusBadgeVariant } from './utils/humanLabels';

// ════════════════════════════════════════════════════════════════════════════
// REGWATCH PANEL - Mevzuat Takibi (IP5)
// ════════════════════════════════════════════════════════════════════════════

interface RegWatchPanelProps {
  data: RegWatchData | null | undefined;
  error?: string;
}

export function RegWatchPanel({ data, error }: RegWatchPanelProps) {
  if (error) {
    const humanError = getHumanError(error);
    const styles = getSeverityStyles(humanError.severity);
    return (
      <div className={`${styles.bg} border ${styles.border} rounded-lg p-4`}>
        <h3 className={`text-sm font-semibold ${styles.text} mb-2`}>Mevzuat Takibi</h3>
        <p className={`text-sm ${styles.text} opacity-80`}>{humanError.message}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    );
  }

  const last7 = data.last_7_days;
  const last30 = data.last_30_days;
  const sources = data.sources || [];

  const statusLabel = getRegWatchStatusLabel(last7?.status);
  const scraperMessage = getScraperMessage(last7?.status);
  const changes7Label = getChangesLabel(last7?.changes);
  const changes30Label = getChangesLabel(last30?.changes);

  // Badge colors based on status
  const badgeColors = {
    success: 'bg-green-600',
    warning: 'bg-yellow-500',
    error: 'bg-red-600',
    default: 'bg-teal-600',
  };
  const badgeVariant = getStatusBadgeVariant(last7?.status || '');

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-teal-50 px-4 py-3 flex items-center justify-between border-b border-teal-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-teal-900">Mevzuat Takibi</h3>
            <p className="text-xs text-teal-600">Aktif izleme</p>
          </div>
        </div>
        <span className={`${badgeColors[badgeVariant]} text-white text-xs px-2 py-0.5 rounded-full`}>
          {statusLabel}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 p-4">
        <div className="text-center p-3 bg-gray-50 rounded">
          <p className="text-xs text-gray-500 mb-1">Son 7 Gun</p>
          <p className="text-sm font-medium text-gray-900">
            {changes7Label}
          </p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded">
          <p className="text-xs text-gray-500 mb-1">Son 30 Gun</p>
          <p className="text-sm font-medium text-gray-900">
            {changes30Label}
          </p>
        </div>
      </div>

      {/* Scraper Message (if BOOTSTRAP/NOT_STARTED) */}
      {scraperMessage && (
        <div className="px-4 py-3 bg-blue-50 border-t border-blue-200">
          <p className="text-sm text-blue-800">{scraperMessage}</p>
          <button className="mt-2 text-sm font-medium text-blue-600 hover:underline">
            Takibi Baslat →
          </button>
        </div>
      )}

      {/* Last Check */}
      {last7?.last_check && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Son kontrol: {new Date(last7.last_check).toLocaleString('tr-TR')}
          </p>
        </div>
      )}

      {/* Message if any */}
      {last7?.message && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
          <p className="text-xs text-blue-700">{last7.message}</p>
        </div>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Izlenen Kaynaklar</p>
          <div className="flex flex-wrap gap-2">
            {sources.map((src) => (
              <a
                key={src.id}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded hover:bg-teal-100 transition"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                {src.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default RegWatchPanel;
