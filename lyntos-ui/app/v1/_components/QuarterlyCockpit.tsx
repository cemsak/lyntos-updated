'use client';

import { useState, useEffect, useCallback } from 'react';
import UploadCard from './UploadCard';
import MigrationReviewQueue from './MigrationReviewQueue';

interface QuarterlyCockpitProps {
  smmmId: string;
  clientId: string;
  periodId: string;
}

interface DocumentInfo {
  id: string;
  doc_type: string;
  original_filename: string;
  parse_status: string;
  time_shield_status: string;
  received_at: string;
  classification_confidence: number;
}

interface CompletenessData {
  required: string[];
  optional: string[];
  present: string[];
  missing_required: string[];
  missing_optional: string[];
  is_complete: boolean;
  reason: string;
  actions: { code: string; label: string; risk: string }[];
}

const DOC_TYPES = [
  { id: 'MIZAN', label: 'Mizan', required: true, icon: '📊' },
  { id: 'BANKA', label: 'Banka Ekstresi', required: true, icon: '🏦' },
  { id: 'BEYANNAME', label: 'Beyanname', required: false, icon: '📋' },
  { id: 'TAHAKKUK', label: 'Tahakkuk', required: false, icon: '📑' },
  { id: 'EDEFTER_BERAT', label: 'E-Defter Berat', required: false, icon: '📜' },
  { id: 'EFATURA_ARSIV', label: 'E-Fatura Arsiv', required: false, icon: '🧾' },
];

export default function QuarterlyCockpit({ smmmId, clientId, periodId }: QuarterlyCockpitProps) {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [completeness, setCompleteness] = useState<CompletenessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = { 'Authorization': `DEV_${smmmId}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/documents/list?client_id=${clientId}&period_id=${periodId}`,
        { headers: authHeaders }
      );

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      setDocuments(data.data?.documents || []);
      setCompleteness(data.data?.completeness || null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Veri yüklenemedi');
    }

    setLoading(false);
  }, [clientId, periodId, smmmId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUploadSuccess = () => {
    fetchData();
  };

  const getDocumentForType = (docType: string): DocumentInfo | undefined => {
    return documents.find(d => d.doc_type === docType);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-40 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Quarterly Data Cockpit</h1>
          <p className="text-gray-600">
            {clientId} - {periodId}
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Completeness Status */}
        {completeness && (
          <div className={`mb-6 rounded-lg p-4 border ${
            completeness.is_complete
              ? 'bg-green-50 border-green-200'
              : 'bg-orange-50 border-orange-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`font-semibold ${
                  completeness.is_complete ? 'text-green-800' : 'text-orange-800'
                }`}>
                  {completeness.is_complete ? 'Tum Zorunlu Dokumanlar Yuklu' : 'Eksik Dokumanlar Var'}
                </h2>
                <p className={`text-sm ${
                  completeness.is_complete ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {completeness.reason}
                </p>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-bold ${
                  completeness.is_complete ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {completeness.present.length} / {completeness.required.length + completeness.optional.length}
                </span>
                <p className="text-sm text-gray-500">dokuman yuklu</p>
              </div>
            </div>

            {/* Missing Actions */}
            {completeness.actions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-orange-200">
                <p className="text-sm font-medium text-orange-800 mb-2">Gerekli Aksiyonlar:</p>
                <div className="flex flex-wrap gap-2">
                  {completeness.actions.map((action, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                    >
                      {action.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Document Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {DOC_TYPES.map(docType => (
            <UploadCard
              key={docType.id}
              docType={docType.id}
              label={docType.label}
              icon={docType.icon}
              required={docType.required}
              document={getDocumentForType(docType.id)}
              smmmId={smmmId}
              clientId={clientId}
              periodId={periodId}
              onUploadSuccess={handleUploadSuccess}
            />
          ))}
        </div>

        {/* Migration Review Queue */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Migration Review</h2>
          <MigrationReviewQueue
            tenantId={smmmId}
            onResolve={handleUploadSuccess}
          />
        </div>
      </div>
    </div>
  );
}
