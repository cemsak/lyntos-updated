'use client';

import type { AiAnalysis } from './types';
import { getHumanError, getSeverityStyles } from './utils/errorMessages';

// ════════════════════════════════════════════════════════════════════════════
// AI SUGGESTIONS PANEL - Secondary Analysis (IP6)
// Trust Score: Variable (usually 0.0) | Gray/Dashed styling | With disclaimer
// ════════════════════════════════════════════════════════════════════════════

interface AiSuggestionsPanelProps {
  analysis: AiAnalysis | null | undefined;
  title?: string;
  error?: string;
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  const color = confidence >= 0.7 ? 'bg-green-400' :
                confidence >= 0.4 ? 'bg-yellow-400' : 'bg-gray-400';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-500">{percentage}%</span>
    </div>
  );
}

export function AiSuggestionsPanel({ analysis, title = 'AI Onerileri', error }: AiSuggestionsPanelProps) {
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
    <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
            <p className="text-xs text-gray-500">AI tahmini (dogrulanmadi)</p>
          </div>
        </div>
        <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full font-medium">
          {analysis.model || 'AI'}
        </span>
      </div>

      {/* MANDATORY Disclaimer Banner */}
      <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
        <p className="text-xs text-yellow-800 flex items-center gap-1">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">DIKKAT:</span>
          <span>{analysis.disclaimer || 'Bu bir AI tahminidir. Dogrulanmamis bilgi icerebilir.'}</span>
        </p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Confidence Bar */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Guven Skoru</p>
          <ConfidenceBar confidence={analysis.confidence} />
        </div>

        {/* Suggestion */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Oneri</p>
          <p className="text-sm text-gray-600 italic">&ldquo;{analysis.suggestion}&rdquo;</p>
        </div>

        {/* Trust Warning */}
        <div className="bg-gray-50 rounded p-3 border border-gray-200">
          <p className="text-xs text-gray-500">
            <span className="font-medium">Trust Score:</span> {analysis.trust_score} — AI tahmini, resmi kaynak degil
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Kararlarinizi Uzman Analizi&apos;ne dayandirin.
          </p>
        </div>

        {/* Evidence (usually empty for AI) */}
        {analysis.evidence_refs && analysis.evidence_refs.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">Referanslar</p>
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

export default AiSuggestionsPanel;
