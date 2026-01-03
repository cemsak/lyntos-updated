'use client';

import { useState } from 'react';
import SourceLink from './SourceLink';

interface ExplainModalProps {
  title: string;
  score?: number;
  reason: string;
  legal_basis?: string;           // Legacy: string format
  legal_basis_refs?: string[];    // New: ID array format
  evidence_refs: string[];
  trust_score: number;
  onClose: () => void;
  // Evidence bundle download
  ruleId?: string;
  smmm?: string;
  client?: string;
  period?: string;
}

export default function ExplainModal({
  title,
  score,
  reason,
  legal_basis,
  legal_basis_refs,
  evidence_refs,
  trust_score,
  onClose,
  ruleId,
  smmm = 'HKOZKAN',
  client = 'OZKAN_KIRTASIYE',
  period = '2025-Q2'
}: ExplainModalProps) {
  // Determine if we have refs or legacy string
  const hasRefs = legal_basis_refs && legal_basis_refs.length > 0;

  // Download state
  const [downloading, setDownloading] = useState(false);

  // Evidence bundle download handler
  async function handleDownloadEvidence() {
    if (!ruleId) {
      alert('Rule ID belirtilmemis');
      return;
    }

    setDownloading(true);

    try {
      const url = `/api/v1/evidence/bundle/${ruleId}?smmm_id=${encodeURIComponent(smmm)}&client_id=${encodeURIComponent(client)}&period=${encodeURIComponent(period)}`;

      const res = await fetch(url);
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
          <h2 className="text-lg font-bold text-gray-900">{title} Aciklamasi</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            x
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Score */}
          {score !== undefined && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Skor</p>
              <p className="text-4xl font-mono font-bold text-gray-900">{score}</p>
            </div>
          )}

          {/* Reason */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Aciklama</p>
            <p className="text-sm text-gray-900">{reason}</p>
          </div>

          {/* Legal Basis - New format with SourceLink */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Yasal Dayanak</p>
            {hasRefs ? (
              <SourceLink refs={legal_basis_refs!} />
            ) : legal_basis ? (
              <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
                {legal_basis}
              </p>
            ) : (
              <p className="text-sm text-gray-500">Yasal dayanak belirtilmemis</p>
            )}
          </div>

          {/* Evidence */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              Kanitlar ({evidence_refs.length})
            </p>
            {evidence_refs.length > 0 ? (
              <ul className="space-y-1">
                {evidence_refs.map((ref, i) => (
                  <li key={i} className="text-sm text-gray-700 font-mono bg-gray-50 px-2 py-1 rounded">
                    - {ref}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Kanit referansi yok</p>
            )}
          </div>

          {/* Trust Score */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Guvenilirlik Skoru</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${trust_score * 100}%` }}
                ></div>
              </div>
              <span className="text-sm font-mono font-bold text-gray-900">
                {trust_score.toFixed(1)}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {trust_score === 1.0 ? 'Resmi birincil kaynak' :
               trust_score >= 0.9 ? 'Resmi ikincil kaynak' :
               'Uzman yorumu'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          {ruleId && evidence_refs.length > 0 && (
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
