'use client';
import React, { useState } from 'react';
import { useDashboardScope } from '../scope/ScopeProvider';

type ExportStatus = 'idle' | 'preparing' | 'generating' | 'ready' | 'error';

export function PdfExportButton() {
  const { scope } = useDashboardScope();
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    if (!scope.smmm_id || !scope.client_id || !scope.period) {
      setError('Lütfen önce SMMM, Mükellef ve Dönem seçin.');
      setStatus('error');
      return;
    }

    setStatus('preparing');
    setError(null);
    setProgress(10);

    try {
      const token = localStorage.getItem('lyntos_token');
      if (!token) {
        setError('PDF oluşturmak için önce veri yükleyin.');
        setStatus('error');
        return;
      }

      setStatus('generating');
      setProgress(30);

      const params = new URLSearchParams({
        smmm_id: scope.smmm_id,
        client_id: scope.client_id,
        period: scope.period,
      });

      const response = await fetch(`/api/v1/contracts/export-pdf?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': token,
        },
      });

      setProgress(70);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('PDF oluşturma servisi bulunamadı. Lütfen daha sonra tekrar deneyin.');
        }
        throw new Error(`PDF oluşturulamadı: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/pdf')) {
        setProgress(90);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `LYNTOS_${scope.client_id}_${scope.period}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setStatus('ready');
        setProgress(100);

        setTimeout(() => {
          setStatus('idle');
          setProgress(0);
        }, 3000);
      } else {
        const data = await response.json();
        if (data.url || data.download_url) {
          window.open(data.url || data.download_url, '_blank');
          setStatus('ready');
          setTimeout(() => {
            setStatus('idle');
            setProgress(0);
          }, 3000);
        } else if (data.job_id) {
          setError('PDF hazırlanıyor, lütfen bekleyin...');
          setStatus('idle');
        } else {
          throw new Error(data.message || 'Bilinmeyen hata');
        }
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'PDF oluşturulurken hata oluştu');
      setProgress(0);
    }
  };

  const getButtonContent = () => {
    switch (status) {
      case 'preparing':
        return (
          <>
            <span className="animate-spin">...</span>
            <span>Hazırlanıyor</span>
          </>
        );
      case 'generating':
        return (
          <>
            <span className="animate-pulse">PDF</span>
            <span>%{progress}</span>
          </>
        );
      case 'ready':
        return (
          <>
            <span>OK</span>
            <span>İndirildi!</span>
          </>
        );
      case 'error':
        return (
          <>
            <span>!</span>
            <span>Tekrar Dene</span>
          </>
        );
      default:
        return (
          <>
            <span>PDF</span>
            <span>İndir</span>
          </>
        );
    }
  };

  const isDisabled = status === 'preparing' || status === 'generating';

  return (
    <div className="relative">
      <button
        onClick={handleExport}
        disabled={isDisabled}
        className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
          status === 'ready'
            ? 'bg-green-600 text-white'
            : status === 'error'
            ? 'bg-red-600 text-white hover:bg-red-700'
            : isDisabled
            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {getButtonContent()}
      </button>

      {error && status === 'error' && (
        <div className="absolute top-full right-0 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg z-10 w-64">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
