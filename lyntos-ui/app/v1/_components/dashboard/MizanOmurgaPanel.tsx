'use client';

import { useState } from 'react';
import type { MizanAnalysisData, ExplainData } from './types';
import { getHumanError, getSeverityStyles } from './utils/errorMessages';

// ════════════════════════════════════════════════════════════════════════════
// MIZAN OMURGA PANEL - VDK-Critical 18 Hesap Analizi (IP9)
// ════════════════════════════════════════════════════════════════════════════

interface MizanOmurgaPanelProps {
  data: MizanAnalysisData | null | undefined;
  error?: string;
  onExplain?: (data: ExplainData) => void;
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || !isFinite(value)) return '—';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'OK':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
          OK
        </span>
      );
    case 'WARN':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
          UYARI
        </span>
      );
    case 'ERROR':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
          HATA
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
          —
        </span>
      );
  }
}

export function MizanOmurgaPanel({ data, error, onExplain }: MizanOmurgaPanelProps) {
  const [showAll, setShowAll] = useState(false);

  if (error) {
    const humanError = getHumanError(error);
    const styles = getSeverityStyles(humanError.severity);
    return (
      <div className={`${styles.bg} border ${styles.border} rounded-lg p-4`}>
        <h3 className={`text-sm font-semibold ${styles.text} mb-2`}>Mizan Omurga</h3>
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

  // Defensive: ensure accounts is always an array
  const rawAccounts = data?.accounts;
  let accounts: Array<{
    hesap_kodu: string;
    hesap_adi: string;
    borc: number;
    alacak: number;
    bakiye: number;
    bakiye_turu: 'B' | 'A';
    status: string;
    anomaly?: string;
  }> = [];

  if (Array.isArray(rawAccounts)) {
    accounts = rawAccounts;
  } else if (rawAccounts && typeof rawAccounts === 'object') {
    const obj = rawAccounts as Record<string, unknown>;
    // Try to extract from common patterns
    if ('items' in obj && Array.isArray(obj.items)) {
      accounts = obj.items as typeof accounts;
    } else if ('data' in obj && Array.isArray(obj.data)) {
      accounts = obj.data as typeof accounts;
    } else {
      // Try to convert object values to array (if keys are numeric)
      const keys = Object.keys(obj);
      if (keys.length > 0 && keys.every(k => !isNaN(Number(k)))) {
        accounts = Object.values(obj) as typeof accounts;
      } else {
        console.warn('MizanOmurgaPanel: accounts is not an array:', typeof rawAccounts, Object.keys(obj));
      }
    }
  }

  const summary = data?.summary;
  const displayAccounts = showAll ? accounts : accounts.slice(0, 10);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Mizan Omurga (18 Hesap Analizi)</h3>
            <p className="text-xs text-gray-500">VDK kritik hesaplar</p>
          </div>
        </div>
        {onExplain && data.analysis?.expert && (
          <button
            onClick={() => {
              const expert = data.analysis.expert;
              onExplain({
                title: 'Mizan Omurga Analizi',
                reason: expert.reason_tr,
                method: expert.method,
                legal_basis: expert.legal_basis_refs?.[0] || 'VDK Genelgesi',
                evidence_refs: expert.evidence_refs,
                trust_score: expert.trust_score
              });
            }}
            className="text-xs text-indigo-600 hover:underline"
          >
            Neden?
          </button>
        )}
      </div>

      {/* Summary Bar */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
        <span className="text-xs text-gray-600">
          Toplam: <span className="font-medium">{summary?.total_accounts || accounts.length}</span> hesap
        </span>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-xs text-gray-600">{summary?.ok || 0} OK</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-yellow-500 rounded-full" />
          <span className="text-xs text-gray-600">{summary?.warn || 0} Uyari</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <span className="text-xs text-gray-600">{summary?.error || 0} Hata</span>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-2 text-left">Hesap</th>
              <th className="px-4 py-2 text-left">Adi</th>
              <th className="px-4 py-2 text-right">Borc</th>
              <th className="px-4 py-2 text-right">Alacak</th>
              <th className="px-4 py-2 text-right">Bakiye</th>
              <th className="px-4 py-2 text-center">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayAccounts.map((acc, i) => (
              <tr key={i} className={`hover:bg-gray-50 ${acc.status === 'ERROR' ? 'bg-red-50' : acc.status === 'WARN' ? 'bg-yellow-50' : ''}`}>
                <td className="px-4 py-2 font-mono text-gray-900">{acc.hesap_kodu}</td>
                <td className="px-4 py-2 text-gray-700">
                  {acc.hesap_adi}
                  {acc.anomaly && (
                    <span className="ml-2 text-xs text-red-600">({acc.anomaly})</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right font-mono text-gray-900">{formatCurrency(acc.borc)}</td>
                <td className="px-4 py-2 text-right font-mono text-gray-900">{formatCurrency(acc.alacak)}</td>
                <td className={`px-4 py-2 text-right font-mono font-medium ${acc.bakiye_turu === 'B' ? 'text-blue-600' : 'text-green-600'}`}>
                  {formatCurrency(acc.bakiye)} {acc.bakiye_turu}
                </td>
                <td className="px-4 py-2 text-center">
                  <StatusBadge status={acc.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Show More/Less */}
      {accounts.length > 10 && (
        <div className="px-4 py-2 text-center border-t border-gray-200">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-indigo-600 hover:underline"
          >
            {showAll ? 'Daha az goster' : `Tumu (${accounts.length} hesap)`}
          </button>
        </div>
      )}

      {/* Totals */}
      {summary && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex justify-between text-xs text-gray-600">
          <span>Toplam Borc: <span className="font-mono font-medium">{formatCurrency(summary.total_borc)}</span></span>
          <span>Toplam Alacak: <span className="font-mono font-medium">{formatCurrency(summary.total_alacak)}</span></span>
        </div>
      )}
    </div>
  );
}

export default MizanOmurgaPanel;
