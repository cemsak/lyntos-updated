'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, FileText, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useDashboardScope } from '../scope/useDashboardScope';
import { API_ENDPOINTS } from '../../_lib/config/api';
import { api } from '../../_lib/api/client';
import { useToast } from '../shared/Toast';
import { PIPELINE_COMPLETE_EVENT } from './useDonemVerileriV2';

interface UploadedFile {
  id: string;
  filename: string;
  doc_type: string;
  file_size: number;
  parsed_row_count: number;
  upload_date: string;
  is_duplicate: boolean;
  can_delete: boolean;
  period_validation_status?: string;
}

interface UploadedFilesResponse {
  files: UploadedFile[];
  summary: {
    total_files: number;
    unique_files: number;
    duplicate_files: number;
    total_rows_parsed: number;
  };
}

interface UploadedFilesListProps {
  filterDocType?: string;
  onFileDeleted?: () => void;
}

export function UploadedFilesList({ filterDocType, onFileDeleted }: UploadedFilesListProps) {
  const { scope } = useDashboardScope();
  const { showToast } = useToast();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [summary, setSummary] = useState<UploadedFilesResponse['summary'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    if (!scope.client_id || !scope.period) return;

    setLoading(true);
    setError(null);

    try {
      const url = API_ENDPOINTS.ingest.files(scope.client_id, scope.period);
      const { data, error: apiError } = await api.get<UploadedFilesResponse>(url);

      if (apiError || !data) {
        throw new Error(apiError || 'Dosya listesi alınamadı');
      }

      setFiles(data.files || []);
      setSummary(data.summary || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  }, [scope.client_id, scope.period]);

  // İlk yükleme ve pipeline tamamlanınca otomatik güncelleme
  useEffect(() => {
    fetchFiles();

    const handlePipelineComplete = () => fetchFiles();
    window.addEventListener(PIPELINE_COMPLETE_EVENT, handlePipelineComplete);
    return () => window.removeEventListener(PIPELINE_COMPLETE_EVENT, handlePipelineComplete);
  }, [fetchFiles]);

  const handleDelete = async (fileId: string, filename: string) => {
    setDeletingId(fileId);
    setConfirmDeleteId(null);

    try {
      const url = API_ENDPOINTS.ingest.deleteFile(fileId);
      const { error: apiError } = await api.delete(url);

      if (apiError) {
        throw new Error(apiError);
      }

      showToast('success', `${filename} silindi`);
      await fetchFiles();
      onFileDeleted?.();

      // Dönem verileri panelini güncelle
      window.dispatchEvent(new Event(PIPELINE_COMPLETE_EVENT));
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Silme hatası');
    } finally {
      setDeletingId(null);
    }
  };

  // Filtreleme (belge tipine göre)
  const displayFiles = filterDocType
    ? files.filter((f) => f.doc_type === filterDocType)
    : files;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  if (loading && files.length === 0) {
    return (
      <div className="flex items-center justify-center py-4 text-sm text-[#969696]">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Dosyalar yükleniyor...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-[#F0282D]">
        <AlertCircle className="w-4 h-4" />
        <span>{error}</span>
        <button onClick={fetchFiles} className="ml-auto text-[#0078D0] hover:underline text-xs">
          Tekrar dene
        </button>
      </div>
    );
  }

  if (displayFiles.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-[#969696]">
        {filterDocType ? 'Bu tipte yüklenmiş dosya yok' : 'Henüz dosya yüklenmemiş'}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Özet */}
      {!filterDocType && summary && (
        <div className="flex items-center justify-between text-xs text-[#969696] mb-2 px-1">
          <span>
            {summary.unique_files} dosya • {summary.total_rows_parsed.toLocaleString('tr-TR')} satır
          </span>
          <button
            onClick={fetchFiles}
            className="flex items-center gap-1 text-[#0078D0] hover:underline"
            disabled={loading}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>
      )}

      {/* Dosya listesi */}
      {displayFiles.map((file) => (
        <div
          key={file.id}
          className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs group hover:bg-[#F5F6F8] transition-colors ${
            file.is_duplicate ? 'opacity-50' : ''
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-[#969696] flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="truncate text-[#5A5A5A]" title={file.filename}>
              {file.filename}
            </div>
            <div className="text-[#B4B4B4] flex items-center gap-2">
              <span>{file.doc_type}</span>
              <span>•</span>
              <span>{formatFileSize(file.file_size)}</span>
              {file.parsed_row_count > 0 && (
                <>
                  <span>•</span>
                  <span className="text-[#0049AA]">{file.parsed_row_count} satır</span>
                </>
              )}
              <span>•</span>
              <span>{formatDate(file.upload_date)}</span>
            </div>
          </div>

          {/* Status badges */}
          {file.is_duplicate && (
            <span className="text-[10px] text-[#FA841E] bg-[#FFF7ED] px-1.5 py-0.5 rounded flex-shrink-0">
              DUP
            </span>
          )}

          {/* Delete button */}
          {file.can_delete && !file.is_duplicate && (
            <>
              {confirmDeleteId === file.id ? (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleDelete(file.id, file.filename)}
                    disabled={deletingId === file.id}
                    className="text-[10px] text-white bg-[#DC2626] px-2 py-0.5 rounded hover:bg-[#B91C1C]"
                  >
                    {deletingId === file.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Sil'
                    )}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-[10px] text-[#969696] px-1 hover:text-[#5A5A5A]"
                  >
                    İptal
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(file.id)}
                  className="opacity-0 group-hover:opacity-100 text-[#969696] hover:text-[#DC2626] transition-all flex-shrink-0"
                  title="Dosyayı sil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
