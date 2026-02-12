'use client';
import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { BELGE_TANIMLARI } from '../donem-verileri/types';
import { useToast } from '../shared/Toast';
import { useDashboardScope } from '../scope/useDashboardScope';
import { API_ENDPOINTS } from '../../_lib/config/api';
import { api } from '../../_lib/api/client';
import { PIPELINE_COMPLETE_EVENT } from '../donem-verileri/useDonemVerileriV2';

import type { IngestResult, PipelineStatus, PipelinePhase, UploadModalProps } from './uploadModalTypes';
import { PipelineProgress } from './PipelineProgress';
import { IngestStatisticsView } from './IngestStatisticsView';
import { UploadContent } from './UploadContent';

/**
 * UploadModal v2.2 - DEDUPE + PIPELINE PROGRESS
 *
 * Akış:
 * 1. ZIP upload → /api/v2/ingest (senkron: dedupe + parse)
 * 2. Pipeline arka planda başlar (cross-check + risk analizi)
 * 3. Frontend 3sn arayla pipeline status poll eder
 * 4. Tamamlandığında Toast + auto-refetch
 *
 * API: POST /api/v2/ingest
 * API: GET /api/v2/ingest/pipeline-status/{session_id}
 */
export function UploadModal({
  isOpen,
  onClose,
  belgeTipi,
  onSuccess,
}: UploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [ingestResult, setIngestResult] = useState<IngestResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // Pipeline progress state
  const [pipelinePhase, setPipelinePhase] = useState<PipelinePhase>('uploading');
  const [pipelineDetail, setPipelineDetail] = useState('');
  const [pipelineCrossCheckCount, setPipelineCrossCheckCount] = useState(0);
  const [pipelineAnalysisCount, setPipelineAnalysisCount] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Dashboard scope - client ve period bilgisi
  const { scope } = useDashboardScope();

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  if (!isOpen || !belgeTipi) return null;

  const belgeTanimi = BELGE_TANIMLARI[belgeTipi];

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const startPipelinePolling = (sessionId: string) => {
    sessionIdRef.current = sessionId;

    const poll = async () => {
      try {
        const url = API_ENDPOINTS.ingest.pipelineStatus(sessionId);
        const { data, error: apiError } = await api.get<PipelineStatus>(url);
        if (apiError || !data) return;

        const status = data.pipeline_status as PipelinePhase;
        setPipelinePhase(status);
        setPipelineDetail(data.pipeline_detail || '');
        setPipelineCrossCheckCount(data.cross_check_count || 0);
        setPipelineAnalysisCount(data.analysis_findings_count || 0);

        if (status === 'completed' || status === 'error') {
          stopPolling();

          if (status === 'completed') {
            const ccMsg = data.cross_check_count > 0
              ? `${data.cross_check_count} çapraz kontrol`
              : '';
            const aMsg = data.analysis_findings_count > 0
              ? `${data.analysis_findings_count} risk bulgusu`
              : '';
            const parts = [ccMsg, aMsg].filter(Boolean).join(', ');
            if (parts) {
              showToast('info', `Analiz tamamlandı: ${parts}`);
            }
            // Dönem verileri panelini otomatik güncelle
            window.dispatchEvent(new Event(PIPELINE_COMPLETE_EVENT));
          }
        }
      } catch {
        // Polling hatası sessizce geç
      }
    };

    // İlk poll hemen
    poll();
    // Sonra 3sn arayla
    pollingRef.current = setInterval(poll, 3000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setValidationError(null);
      setUploadError(null);
      setIngestResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setValidationError('Lütfen bir dosya seçin');
      return;
    }

    setValidationError(null);
    setUploadError(null);
    setIngestResult(null);
    setUploading(true);
    setPipelinePhase('uploading');
    setPipelineDetail('');
    setPipelineCrossCheckCount(0);
    setPipelineAnalysisCount(0);

    try {
      if (!scope.client_id) {
        setValidationError('Lütfen önce bir mükellef seçin');
        setUploading(false);
        return;
      }
      if (!scope.period) {
        setValidationError('Lütfen önce bir dönem seçin');
        setUploading(false);
        return;
      }
      const clientId = scope.client_id;
      const period = scope.period;

      // FormData oluştur
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('client_id', clientId);
      formData.append('period', period);
      formData.append('smmm_id', scope.smmm_id || '');

      setPipelinePhase('parsing');

      // Backend'e gönder (FormData — api.post handles auth automatically)
      const { data: result, error: uploadApiError, status: uploadStatus } = await api.post<IngestResult>(
        API_ENDPOINTS.ingest.upload,
        formData,
        { timeout: 120_000 }
      );

      if (uploadApiError || !result) {
        // Try to parse structured error from api client error message
        if (uploadStatus === 400 && uploadApiError) {
          try {
            const errorData = JSON.parse(uploadApiError);
            if (errorData.period_errors) {
              const periodFiles = (errorData.period_errors as Array<{filename: string; detected_period: string}>)
                .map((pe: {filename: string; detected_period: string}) => `${pe.filename} → ${pe.detected_period}`)
                .join(', ');
              throw new Error(
                `Dönem uyuşmazlığı: ${errorData.message || ''} [${periodFiles}]`
              );
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message.startsWith('Dönem')) throw parseErr;
          }
        }
        throw new Error(uploadApiError || `Sunucu hatası: ${uploadStatus}`);
      }

      setIngestResult(result);
      setUploading(false);
      setUploaded(true);

      // Parse tamamlandı, pipeline arka planda devam ediyor
      setPipelinePhase('cross_checking');

      // Success toast with dedupe info
      const stats = result.statistics;
      const newFiles = stats.new_files ?? stats.processable_files ?? 0;
      const dupFiles = stats.duplicate_files ?? stats.duplicate_blobs ?? 0;
      const parsedRows = stats.total_parsed_rows ?? 0;
      const parts: string[] = [];
      if (newFiles > 0) parts.push(`${newFiles} yeni dosya`);
      if (dupFiles > 0) parts.push(`${dupFiles} duplicate`);
      if (parsedRows > 0) parts.push(`${parsedRows.toLocaleString('tr-TR')} satır parse edildi`);
      showToast('success', parts.join(', ') || 'Dosyalar işlendi');

      // Pipeline polling başlat
      if (result.session_id) {
        startPipelinePolling(result.session_id);
      }

      // onSuccess'i hemen çağır (modal açık kalabilir, kullanıcı pipeline'ı izler)
      setTimeout(() => {
        onSuccess(belgeTipi);
      }, 2000);

    } catch (error) {
      console.error('[UploadModal] Ingest error:', error);
      setUploadError(error instanceof Error ? error.message : 'Bilinmeyen hata');
      setUploading(false);
      setPipelinePhase('error');
    }
  };

  const handleClose = () => {
    stopPolling();
    setUploaded(false);
    setUploading(false);
    setSelectedFile(null);
    setValidationError(null);
    setUploadError(null);
    setIngestResult(null);
    setPipelinePhase('uploading');
    setPipelineDetail('');
    setPipelineCrossCheckCount(0);
    setPipelineAnalysisCount(0);
    sessionIdRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-modal-title"
        className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
        onKeyDown={(e) => e.key === 'Escape' && handleClose()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 id="upload-modal-title" className="text-lg font-semibold text-[#2E2E2E]">
            Belge Yükle: {belgeTanimi?.label_tr || belgeTipi}
          </h3>
          <button onClick={handleClose} className="text-[#969696] hover:text-[#5A5A5A]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        {belgeTanimi?.aciklama_tr && (
          <p className="text-sm text-[#969696] mb-4">{belgeTanimi.aciklama_tr}</p>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.xlsx,.xls,.xml,.zip,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Content */}
        <UploadContent
          uploaded={uploaded}
          uploading={uploading}
          selectedFile={selectedFile}
          validationError={validationError}
          uploadError={uploadError}
          ingestResult={ingestResult}
          pipelinePhase={pipelinePhase}
          onFileSelect={() => fileInputRef.current?.click()}
          onUpload={handleUpload}
        />

        {/* Pipeline Progress */}
        <PipelineProgress
          uploaded={uploaded}
          uploading={uploading}
          pipelinePhase={pipelinePhase}
          pipelineCrossCheckCount={pipelineCrossCheckCount}
          pipelineAnalysisCount={pipelineAnalysisCount}
        />

        {/* Dedupe Statistics */}
        {uploaded && <IngestStatisticsView ingestResult={ingestResult} />}

        {/* Footer */}
        <div className="mt-4 text-xs text-[#969696] flex items-center justify-between">
          <span>Desteklenen formatlar: PDF, XLSX, CSV, XML, ZIP</span>
          <span className="text-[#0078D0]">v2.2 Pipeline</span>
        </div>
      </div>
    </div>
  );
}
