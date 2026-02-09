'use client';

import type { CrossCheckData, ExplainData, OpeningBalanceStatus } from './types';
import { getHumanError, getSeverityStyles } from './utils/errorMessages';

// ════════════════════════════════════════════════════════════════════════════
// CROSS-CHECK PANEL - Capraz Kontrol Ozeti
// ════════════════════════════════════════════════════════════════════════════

interface CrossCheckPanelProps {
  data: CrossCheckData | null | undefined;
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

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'ok':
      return (
        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      );
    case 'warning':
      return (
        <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
      );
    case 'error':
      return (
        <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      );
    case 'skipped':
      return (
        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      );
    default:
      return null;
  }
}

export function CrossCheckPanel({ data, error, onExplain }: CrossCheckPanelProps) {
  if (error) {
    const humanError = getHumanError(error);
    const styles = getSeverityStyles(humanError.severity);
    return (
      <div className={`${styles.bg} border ${styles.border} rounded-lg p-4`}>
        <h3 className={`text-sm font-semibold ${styles.text} mb-2`}>Capraz Kontrol</h3>
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

  const summary = data.summary;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Capraz Kontrol Ozeti</h3>
            <p className="text-xs text-gray-500">{summary?.total_checks || 0} kontrol</p>
          </div>
        </div>
        {onExplain && data.analysis?.expert && (
          <button
            onClick={() => {
              const expert = data.analysis.expert;
              onExplain({
                title: 'Capraz Kontrol',
                reason: expert.reason_tr,
                method: expert.method,
                legal_basis: expert.legal_basis_refs?.[0] || 'VUK',
                evidence_refs: expert.evidence_refs,
                trust_score: expert.trust_score
              });
            }}
            className="text-xs text-blue-600 hover:underline"
          >
            Neden?
          </button>
        )}
      </div>

      {/* TD-002: Açılış Bakiyesi Durumu */}
      <OpeningBalanceBar openingBalance={data.opening_balance} />

      {/* Summary Bar */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <span className="text-xs text-gray-600">{summary?.ok || 0} OK</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-500 rounded-full" />
          <span className="text-xs text-gray-600">{summary?.warnings || 0} Uyari</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded-full" />
          <span className="text-xs text-gray-600">{summary?.errors || 0} Hata</span>
        </div>
        {(summary?.skipped || 0) > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-400 rounded-full" />
            <span className="text-xs text-gray-600">{summary.skipped} Atlanmis</span>
          </div>
        )}
      </div>

      {/* Check List */}
      <div className="divide-y divide-gray-100">
        {data.checks?.map((check, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition">
            <StatusIcon status={check.status} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{check.name || check.type}</p>
              <p className="text-xs text-gray-500 truncate">{check.reason}</p>
            </div>
            <div className="text-right">
              {check.difference !== 0 && check.difference !== undefined && (
                <p className={`text-sm font-mono ${check.difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {check.difference > 0 ? '+' : ''}{formatCurrency(check.difference)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Overall Status */}
      <div className={`px-4 py-2 text-center text-sm font-medium ${
        summary?.overall_status === 'OK' ? 'bg-green-50 text-green-800' :
        summary?.overall_status === 'WARNING' ? 'bg-yellow-50 text-yellow-800' :
        'bg-red-50 text-red-800'
      }`}>
        Genel Durum: {summary?.overall_status || '—'}
      </div>
    </div>
  );
}

// TD-002: Açılış Bakiyesi Durum Çubuğu
function OpeningBalanceBar({ openingBalance }: { openingBalance?: OpeningBalanceStatus }) {
  // Renk ve ikon belirleme
  const getConfig = () => {
    if (!openingBalance || !openingBalance.has_data) {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        iconBg: 'bg-red-100',
        icon: (
          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        ),
        message: 'Açılış bakiyesi yüklenmedi - Kebir-Mizan kontrolü eksik olabilir',
        showWarning: true
      };
    }

    switch (openingBalance.status_color) {
      case 'green':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-700',
          iconBg: 'bg-green-100',
          icon: (
            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ),
          message: openingBalance.status_text,
          showWarning: false
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-700',
          iconBg: 'bg-yellow-100',
          icon: (
            <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ),
          message: openingBalance.status_text,
          showWarning: true
        };
      default:
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          iconBg: 'bg-red-100',
          icon: (
            <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          ),
          message: openingBalance?.status_text || 'Açılış bakiyesi hatası',
          showWarning: true
        };
    }
  };

  const config = getConfig();

  return (
    <div className={`px-4 py-3 ${config.bg} border-b ${config.border} flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 ${config.iconBg} rounded-full flex items-center justify-center`}>
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">Açılış Bakiyesi</span>
            <div className={`w-5 h-5 ${config.iconBg} rounded-full flex items-center justify-center`}>
              {config.icon}
            </div>
          </div>
          <p className={`text-xs ${config.text}`}>{config.message}</p>
        </div>
      </div>

      {openingBalance?.has_data && (
        <div className="text-right">
          <p className="text-xs text-gray-500">
            {openingBalance.hesap_sayisi} hesap • {formatCurrency(openingBalance.toplam_borc)} TL
          </p>
          {openingBalance.source_type && (
            <p className="text-xs text-gray-400">
              Kaynak: {openingBalance.source_type === 'acilis_fisi' ? 'Açılış Fişi' :
                       openingBalance.source_type === 'acilis_mizani' ? 'Açılış Mizanı' : 'Manuel'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default CrossCheckPanel;
