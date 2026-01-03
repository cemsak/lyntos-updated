'use client';

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
}

export default function ExplainModal({
  title,
  score,
  reason,
  legal_basis,
  legal_basis_refs,
  evidence_refs,
  trust_score,
  onClose
}: ExplainModalProps) {
  // Determine if we have refs or legacy string
  const hasRefs = legal_basis_refs && legal_basis_refs.length > 0;

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
