'use client';

import { useState } from 'react';
import SourceLink from './SourceLink';

// Expert analysis structure
interface ExpertAnalysis {
  score?: number;
  reason_tr?: string;
  method: string;
  legal_basis_refs: string[];
  evidence_refs: string[];
  trust_score: number;
  computed_at: string;
}

// AI analysis structure
interface AIAnalysis {
  confidence: number;
  suggestion: string;
  disclaimer: string;
  evidence_refs: string[];
  trust_score: number;
  model: string;
  computed_at: string;
}

// New analysis structure
interface Analysis {
  expert: ExpertAnalysis;
  ai?: AIAnalysis;
}

interface ExplainModalProps {
  title: string;
  // NEW: Unified analysis object
  analysis?: Analysis;
  // LEGACY: Individual fields (backward compatibility)
  score?: number;
  reason?: string;
  legal_basis?: string;
  legal_basis_refs?: string[];
  evidence_refs?: string[];
  trust_score?: number;
  // Common
  onClose: () => void;
  ruleId?: string;
  smmm: string;
  client: string;
  period: string;
}

export default function ExplainModal({
  title,
  analysis,
  score,
  reason,
  legal_basis,
  legal_basis_refs,
  evidence_refs,
  trust_score,
  onClose,
  ruleId,
  smmm,
  client,
  period
}: ExplainModalProps) {
  const [downloading, setDownloading] = useState(false);

  // Use new analysis structure if available, otherwise fall back to legacy
  const hasNewAnalysis = analysis?.expert !== undefined;

  const expert = hasNewAnalysis ? analysis!.expert : {
    score: score,
    reason_tr: reason,
    method: reason || '',
    legal_basis_refs: legal_basis_refs || [],
    evidence_refs: evidence_refs || [],
    trust_score: trust_score || 1.0,
    computed_at: new Date().toISOString()
  };

  const ai = hasNewAnalysis ? analysis?.ai : undefined;

  // Evidence download handler
  async function handleDownloadEvidence() {
    if (!ruleId) {
      alert('Rule ID belirtilmemis');
      return;
    }

    setDownloading(true);

    try {
      const url = `/api/v1/evidence/bundle/${ruleId}?smmm_id=${encodeURIComponent(smmm)}&client_id=${encodeURIComponent(client)}&period=${encodeURIComponent(period)}`;

      const res = await fetch(url, { headers: { "Authorization": "DEV_" + smmm } });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Bilinmeyen hata' }));
        throw new Error(error.detail || 'Download failed');
      }

      const blob = await res.blob();

      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(blob);
      a.download = `${ruleId}_evidence_${client}_${period}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      window.URL.revokeObjectURL(a.href);
    } catch (error) {
      console.error('Evidence download error:', error);
      alert(`Kanit indirme hatasi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            x
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* UZMAN ANALIZ KARTI (Primary - Blue) */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <div className="border-2 border-blue-600 bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-blue-900">UZMAN ANALIZ</h3>
              <span className="text-xs bg-blue-200 text-blue-900 px-2 py-1 rounded font-semibold">
                Deterministik
              </span>
            </div>

            <div className="space-y-3">
              {/* Skor (if present) */}
              {expert.score !== undefined && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Skor</p>
                  <p className="text-4xl font-mono font-bold text-gray-900">{expert.score}</p>
                </div>
              )}

              {/* Reason (if present) */}
              {expert.reason_tr && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Aciklama</p>
                  <p className="text-sm text-gray-900">{expert.reason_tr}</p>
                </div>
              )}

              {/* Metod */}
              {expert.method && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Metod</p>
                  <p className="text-sm text-gray-900 font-mono bg-white p-2 rounded border border-blue-200">
                    {expert.method}
                  </p>
                </div>
              )}

              {/* Yasal Dayanak */}
              {expert.legal_basis_refs && expert.legal_basis_refs.length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Yasal Dayanak</p>
                  <SourceLink refs={expert.legal_basis_refs} smmm={smmm} />
                </div>
              )}

              {/* Legacy yasal dayanak (string format) */}
              {!hasNewAnalysis && legal_basis && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Yasal Dayanak</p>
                  <p className="text-sm text-gray-900 font-mono bg-white p-2 rounded border border-blue-200">
                    {legal_basis}
                  </p>
                </div>
              )}

              {/* Kanitlar */}
              {expert.evidence_refs && expert.evidence_refs.length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Kanitlar ({expert.evidence_refs.length})</p>
                  <ul className="text-xs space-y-1">
                    {expert.evidence_refs.map((ref, i) => (
                      <li key={i} className="font-mono text-gray-700 bg-white px-2 py-1 rounded border border-blue-100">
                        {ref}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Guvenilirlik */}
              <div className="pt-3 border-t border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-600">Guvenilirlik:</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${expert.trust_score * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{expert.trust_score.toFixed(1)}</span>
                </div>
                <p className="text-xs text-gray-600">
                  {expert.trust_score === 1.0 ? 'Resmi birincil kaynak' :
                   expert.trust_score >= 0.9 ? 'Resmi ikincil kaynak' :
                   'Uzman yorumu'}
                </p>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* AI ONERI KARTI (Secondary - Gray) */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {ai && (
            <div className="border border-gray-300 bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-700">AI Oneri (Yardimci)</h3>
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                  Confidence: {(ai.confidence * 100).toFixed(0)}%
                </span>
              </div>

              <div className="space-y-3">
                {/* Oneri */}
                <p className="text-sm text-gray-700">{ai.suggestion}</p>

                {/* Disclaimer (WARNING) */}
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                  <p className="text-xs text-yellow-800 font-medium">
                    {ai.disclaimer}
                  </p>
                </div>

                {/* Model info */}
                <p className="text-xs text-gray-500">
                  Model: {ai.model} | Hesaplama: {new Date(ai.computed_at).toLocaleString('tr-TR')}
                </p>

                {/* Guvenilirlik (Low) */}
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-600">Guvenilirlik:</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{ width: `${ai.confidence * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-gray-700">{ai.confidence.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-600">AI tahmini (dogrulanmadi)</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          {ruleId && expert.evidence_refs && expert.evidence_refs.length > 0 && (
            <button
              onClick={handleDownloadEvidence}
              disabled={downloading}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {downloading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Indiriliyor...
                </>
              ) : (
                'Kanitlari Indir (ZIP)'
              )}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
