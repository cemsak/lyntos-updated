'use client';

/**
 * Document Checklist Hook
 * Sprint 8.2 - LYNTOS V2
 *
 * Handles document checklist API calls and state management
 */

import { useState, useCallback } from 'react';
import { api } from '../../_lib/api/client';
import { getAuthToken } from '../../_lib/auth';
import type { ChecklistResponse } from './types';

interface UseDocumentChecklistOptions {
  clientId: string;
  period: string;
}

export function useDocumentChecklist({
  clientId,
  period,
}: UseDocumentChecklistOptions) {
  const [checklist, setChecklist] = useState<ChecklistResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>(
    {}
  );
  const [error, setError] = useState<string | null>(null);

  const loadChecklist = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.get<ChecklistResponse>(
        `/api/v1/documents/checklist/${clientId}`,
        { params: { period } }
      );

      if (!res.ok) {
        throw new Error(res.error || 'Kontrol listesi yuklenemedi');
      }

      setChecklist(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata olustu');
    } finally {
      setIsLoading(false);
    }
  }, [clientId, period]);

  const uploadDocument = useCallback(
    async (
      documentId: string,
      ruleId: string,
      file: File,
      notes?: string
    ): Promise<boolean> => {
      setUploadProgress((prev) => ({ ...prev, [documentId]: true }));

      try {
        const formData = new FormData();
        formData.append('client_id', clientId);
        formData.append('period', period);
        formData.append('document_id', documentId);
        formData.append('rule_id', ruleId);
        formData.append('file', file);
        if (notes) formData.append('notes', notes);

        const res = await api.post('/api/v1/documents/upload', formData);

        if (!res.ok) {
          throw new Error(res.error || 'Yukleme basarisiz');
        }

        // Reload checklist
        await loadChecklist();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Yukleme basarisiz');
        return false;
      } finally {
        setUploadProgress((prev) => ({ ...prev, [documentId]: false }));
      }
    },
    [clientId, period, loadChecklist]
  );

  const deleteDocument = useCallback(
    async (documentId: string): Promise<boolean> => {
      try {
        const res = await api.delete(
          `/api/v1/documents/${documentId}`,
          { params: { client_id: clientId } }
        );

        if (!res.ok) {
          throw new Error(res.error || 'Silme basarisiz');
        }

        await loadChecklist();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Silme basarisiz');
        return false;
      }
    },
    [clientId, loadChecklist]
  );

  const downloadBundle = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(
        `/api/v1/documents/evidence-bundle/${clientId}?period=${period}`,
        {
          method: 'POST',
          headers: {
            Authorization: getAuthToken() || '',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Kanit dosyasi olusturulamadi');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VDK_Kanit_Dosyasi_${period.replace('/', '_')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Indirme basarisiz');
      return false;
    }
  }, [clientId, period]);

  return {
    checklist,
    isLoading,
    uploadProgress,
    error,
    loadChecklist,
    uploadDocument,
    deleteDocument,
    downloadBundle,
  };
}
