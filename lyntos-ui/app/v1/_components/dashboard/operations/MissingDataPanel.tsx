'use client';

// ════════════════════════════════════════════════════════════════════════════
// MissingDataPanel - Shows which required documents are missing
// ════════════════════════════════════════════════════════════════════════════

import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { StateWrapper } from '../shared/StateWrapper';
import { Button } from '../shared/Button';
import { REQUIRED_DOCS } from '../constants';

export interface DocumentStatus {
  key: string;
  label: string;
  uploaded: boolean;
  uploadedAt?: string;
  sourceId?: string;
}

interface MissingDataPanelProps {
  documents: DocumentStatus[];
  loading?: boolean;
  error?: string | null;
  onUpload?: () => void;
  onRetry?: () => void;
  advancedMode?: boolean;
}

export function MissingDataPanel({
  documents,
  loading = false,
  error = null,
  onUpload,
  onRetry,
  advancedMode = false
}: MissingDataPanelProps) {
  const missingCount = documents.filter(d => !d.uploaded).length;
  const allComplete = missingCount === 0;

  return (
    <Card
      title="Eksik Belgeler"
      headerColor={allComplete ? 'green' : missingCount > 3 ? 'red' : 'amber'}
      headerRight={
        <Badge variant={allComplete ? 'success' : missingCount > 3 ? 'error' : 'warning'}>
          {allComplete ? 'Tamam' : `${missingCount} eksik`}
        </Badge>
      }
    >
      <StateWrapper loading={loading} error={error} onRetry={onRetry}>
        {allComplete ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">Tum belgeler yuklendi</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.key}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  doc.uploaded ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {doc.uploaded ? (
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                  <span className={`text-sm ${doc.uploaded ? 'text-green-700' : 'text-red-700'}`}>
                    {doc.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {doc.uploaded && doc.uploadedAt && (
                    <span className="text-xs text-gray-500">{doc.uploadedAt}</span>
                  )}
                  {advancedMode && doc.sourceId && (
                    <span className="text-[10px] font-mono text-gray-400">{doc.sourceId}</span>
                  )}
                </div>
              </div>
            ))}

            {/* Upload button */}
            {onUpload && missingCount > 0 && (
              <div className="pt-2">
                <Button onClick={onUpload} className="w-full">
                  Belge Yukle
                </Button>
              </div>
            )}
          </div>
        )}
      </StateWrapper>
    </Card>
  );
}

export default MissingDataPanel;
