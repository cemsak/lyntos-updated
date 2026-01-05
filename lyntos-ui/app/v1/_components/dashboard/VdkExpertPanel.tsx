'use client';

import type { ExpertAnalysis } from './types';
import { getHumanError, getSeverityStyles } from './utils/errorMessages';
import { getTrustLabel, getSourceTitle } from './utils/humanLabels';

// ════════════════════════════════════════════════════════════════════════════
// VDK EXPERT PANEL - Authoritative Analysis (IP6)
// Trust Score: 1.0 | Blue/Solid styling | Primary source
// ════════════════════════════════════════════════════════════════════════════

interface VdkExpertPanelProps {
  analysis: ExpertAnalysis | null | undefined;
  title?: string;
  criteriaScores?: Record<string, number>;
  error?: string;
  onSourceClick?: (sourceId: string) => void;
}

function TrustDisplay({ score }: { score: number }) {
  const label = getTrustLabel(score);
  const percentage = Math.round(score * 100);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm font-medium text-green-700">{label}</span>
      </div>
      <span className="text-xs text-gray-400" title="Ic metrik">{percentage}%</span>
    </div>
  );
}

function SourceLink({ sourceId, onClick }: { sourceId: string; onClick?: (id: string) => void }) {
  const title = getSourceTitle(sourceId);

  return (
    <button
      onClick={() => onClick?.(sourceId)}
      className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 transition"
      title={`Kaynak ID: ${sourceId}`}
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {title}
    </button>
  );
}

export function VdkExpertPanel({ analysis, title = 'VDK Uzman Analizi', criteriaScores, error, onSourceClick }: VdkExpertPanelProps) {
  if (error) {
    const humanError = getHumanError(error);
    const styles = getSeverityStyles(humanError.severity);
    return (
      <div className={`${styles.bg} border ${styles.border} rounded-lg p-4`}>
        <h3 className={`text-sm font-semibold ${styles.text} mb-2`}>{title}</h3>
        <p className={`text-sm ${styles.text} opacity-80`}>{humanError.message}</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-3/4" />
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-blue-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-blue-50 px-4 py-3 flex items-center justify-between border-b border-blue-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-blue-900">{title}</h3>
            <p className="text-xs text-blue-600">Resmi birincil kaynak</p>
          </div>
        </div>
        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
          v1.0
        </span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Trust Display */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Guven Duzeyi</p>
          <TrustDisplay score={analysis.trust_score} />
        </div>

        {/* Criteria Grid (if available) */}
        {criteriaScores && Object.keys(criteriaScores).length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">VDK 13 Kriter</p>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(criteriaScores).slice(0, 6).map(([key, value]) => (
                <div
                  key={key}
                  className={`text-center p-2 rounded text-xs ${
                    value >= 80 ? 'bg-green-50 text-green-700' :
                    value >= 50 ? 'bg-yellow-50 text-yellow-700' :
                    'bg-red-50 text-red-700'
                  }`}
                >
                  <p className="font-medium">{value}</p>
                  <p className="text-[10px] truncate">{key.replace(/_/g, ' ')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analysis Text */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Analiz</p>
          <p className="text-sm text-gray-800">{analysis.reason_tr}</p>
        </div>

        {/* Method */}
        {analysis.method && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Yontem</p>
            <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{analysis.method}</p>
          </div>
        )}

        {/* Legal Basis References */}
        {analysis.legal_basis_refs && analysis.legal_basis_refs.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">Yasal Dayanak</p>
            <div className="flex flex-wrap gap-2">
              {analysis.legal_basis_refs.map(ref => (
                <SourceLink key={ref} sourceId={ref} onClick={onSourceClick} />
              ))}
            </div>
          </div>
        )}

        {/* Evidence References */}
        {analysis.evidence_refs && analysis.evidence_refs.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">Kanit Belgeleri</p>
            <div className="flex flex-wrap gap-2">
              {analysis.evidence_refs.map(ref => (
                <span key={ref} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  {ref}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs text-gray-400 text-right">
          {analysis.computed_at ? new Date(analysis.computed_at).toLocaleString('tr-TR') : '—'}
        </p>
      </div>
    </div>
  );
}

export default VdkExpertPanel;
