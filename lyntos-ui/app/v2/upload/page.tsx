'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Info, RefreshCw } from 'lucide-react';
import { useDashboardScope } from '../_components/scope/ScopeProvider';
import { ScopeGuide } from '../_components/shared/ScopeGuide';
import { API_ENDPOINTS } from '../_lib/config/api';
import { api } from '../_lib/api/client';
import { formatPeriod } from '../_lib/format';
import type { UploadMode, UploadPhase, UploadResult } from './types';
import { validateFile } from './constants';
import { ModeSelector } from './_components/ModeSelector';
import { DropZone } from './_components/DropZone';
import { ProcessingStatus } from './_components/ProcessingStatus';
import { ErrorState } from './_components/ErrorState';
import { UploadSuccess } from './_components/UploadSuccess';
import { SupportedFileTypes } from './_components/SupportedFileTypes';

export default function UploadPage() {
  const router = useRouter();
  const [mode, setMode] = useState<UploadMode>(null);
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const { selectedClient, selectedPeriod, scope } = useDashboardScope();
  const isScopeComplete = Boolean(selectedClient?.id && selectedPeriod);

  const handleModeSelect = useCallback((selectedMode: UploadMode) => {
    setMode(selectedMode);
    setPhase('idle');
    setProgress(0);
    setError(null);
    setResult(null);
  }, []);

  const handleBackendUpload = useCallback(async (file: File) => {
    const validation = validateFile(file, mode === 'zip');
    if (!validation.valid) {
      setError(validation.error || 'Ge\u00E7ersiz dosya');
      setPhase('error');
      return;
    }

    setPhase('uploading');
    setProgress(10);
    setCurrentFile(file.name);
    setError(null);

    try {
      const year = selectedPeriod?.year || new Date().getFullYear();
      const quarter = selectedPeriod?.periodNumber || 1;
      const period = `${year}-Q${quarter}`;
      if (!selectedClient?.id) {
        setError('L\u00FCtfen \u00F6nce bir m\u00FCkellef se\u00E7in');
        setPhase('error');
        return;
      }
      const clientId = selectedClient.id;

      setProgress(30);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('client_id', clientId);
      formData.append('period', period);
      // NOT: smmm_id artık backend'de JWT token'dan alınıyor (güvenlik)

      setPhase('processing');
      setProgress(50);

      const res = await api.post<UploadResult>(API_ENDPOINTS.ingest.upload, formData);

      setProgress(80);

      if (!res.ok || !res.data) {
        throw new Error(res.error || 'Sunucu hatası');
      }

      const data: UploadResult = res.data;

      setProgress(100);
      setResult(data);
      setPhase('complete');

    } catch (err) {
      console.error('[Upload] Backend upload hatas\u0131:', err);
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
      setPhase('error');
    }
  }, [mode, selectedClient, selectedPeriod]);

  const handleReset = useCallback(() => {
    setPhase('idle');
    setProgress(0);
    setCurrentFile('');
    setError(null);
    setResult(null);
    setMode(null);
  }, []);

  const handleGoToDashboard = useCallback(() => {
    router.push('/v2');
  }, [router]);

  const isProcessing = phase === 'uploading' || phase === 'processing';
  const isComplete = phase === 'complete';
  const isError = phase === 'error';

  // ── Scope koruması: Mükellef/dönem seçilmeden yükleme engelle ──
  if (!isScopeComplete) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2E2E2E] flex items-center gap-3">
            <Upload className="w-7 h-7 text-[#0049AA]" />
            Dönem Verisi Yükleme
          </h1>
          <p className="text-[#5A5A5A] mt-1">
            Mükellefinizin dönem belgelerini yükleyin. Sistem otomatik sınıflandırır ve analiz eder.
          </p>
        </div>
        <ScopeGuide
          variant="banner"
          description="Veri yüklemek için üstteki menülerden bir mükellef ve dönem seçin."
        />
        <SupportedFileTypes />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2E2E2E] flex items-center gap-3">
            <Upload className="w-7 h-7 text-[#0049AA]" />
            Dönem Verisi Yükleme
          </h1>
          <p className="text-[#5A5A5A] mt-1">
            Mükellefinizin dönem belgelerini yükleyin. Sistem otomatik sınıflandırır ve analiz eder.
          </p>
        </div>
        {(isComplete || isError) && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[#5A5A5A] hover:text-[#2E2E2E] hover:bg-[#F5F6F8] rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Yeni Yükleme
          </button>
        )}
      </div>

      <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-[#0049AA]" />
          <div>
            <p className="text-sm text-[#00287F] font-semibold">
              {selectedClient?.name}
            </p>
            <p className="text-sm text-[#0049AA]">
              {formatPeriod(scope.period)} dönemi için veri yükleme
            </p>
          </div>
        </div>
      </div>

      {!isProcessing && !isComplete && (
        <ModeSelector
          mode={mode}
          onModeSelect={handleModeSelect}
        />
      )}

      {mode && !isProcessing && !isComplete && !isError && (
        <DropZone mode={mode} onFileSelect={handleBackendUpload} />
      )}

      {isProcessing && (
        <ProcessingStatus phase={phase} progress={progress} currentFile={currentFile} />
      )}

      {isError && (
        <ErrorState error={error} onReset={handleReset} />
      )}

      {isComplete && result && (
        <UploadSuccess result={result} onGoToDashboard={handleGoToDashboard} />
      )}

      {!isProcessing && !isComplete && (
        <SupportedFileTypes />
      )}
    </div>
  );
}
