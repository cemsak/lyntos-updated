/**
 * LYNTOS Upload Page v3.0 - BACKEND ONLY
 * =======================================
 *
 * FAZ 3: Frontend Entegrasyonu
 * - useQuarterlyAnalysis KALDIRILDI
 * - localStorage KULLANILMIYOR
 * - Tüm parse işlemi BACKEND'de yapılıyor
 *
 * Veri Akışı:
 * 1. Kullanıcı ZIP seçer
 * 2. POST /api/v2/upload'a gönderilir
 * 3. Backend parse eder, DB'ye yazar
 * 4. Dashboard'a yönlendirilir
 */
'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  FileArchive,
  Files,
  Download,
  FileSpreadsheet,
  FileText,
  Database,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  ArrowRight,
  RefreshCw,
  FileCode,
  Building2,
  Receipt,
  Clock,
} from 'lucide-react';
import { useLayoutContext } from '../_components/layout/useLayoutContext';

// API base URL - ortam değişkeninden veya varsayılan
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type UploadMode = 'zip' | 'multi' | null;
type UploadPhase = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';

interface UploadResult {
  success: boolean;
  donem_id: string;
  period: string;
  client_id: string;
  smmm_id: string;
  files: Array<{
    file: string;
    type: string;
    status: string;
    rows: number;
    message: string;
  }>;
  summary: {
    total_files: number;
    success_files: number;
    total_rows: number;
  };
  uploaded_at: string;
}

// ============================================================================
// DOSYA TIPI -> TÜRKÇE LABEL & İKON
// ============================================================================
const FILE_TYPE_CONFIG: Record<string, { label: string; icon: typeof FileSpreadsheet; color: string }> = {
  'MIZAN': { label: 'Mizan', icon: FileSpreadsheet, color: 'text-emerald-600 bg-emerald-100' },
  'BANKA': { label: 'Banka Ekstresi', icon: Building2, color: 'text-teal-600 bg-teal-100' },
  'BEYANNAME': { label: 'Beyanname', icon: FileText, color: 'text-red-600 bg-red-100' },
  'TAHAKKUK': { label: 'Tahakkuk', icon: FileText, color: 'text-red-600 bg-red-100' },
  'YEVMIYE': { label: 'Yevmiye', icon: FileSpreadsheet, color: 'text-blue-600 bg-blue-100' },
  'KEBIR': { label: 'Kebir', icon: FileSpreadsheet, color: 'text-blue-600 bg-blue-100' },
  'EDEFTER_BERAT': { label: 'E-Defter Beratı', icon: FileCode, color: 'text-cyan-600 bg-cyan-100' },
  'EFATURA_ARSIV': { label: 'E-Fatura/Arşiv', icon: Receipt, color: 'text-orange-600 bg-orange-100' },
  'OTHER': { label: 'Diğer', icon: AlertCircle, color: 'text-amber-600 bg-amber-100' },
};

function getFileTypeConfig(fileType: string) {
  return FILE_TYPE_CONFIG[fileType] || FILE_TYPE_CONFIG['OTHER'];
}

// ============================================================================
// ANA COMPONENT
// ============================================================================
export default function UploadPage() {
  const router = useRouter();
  const [mode, setMode] = useState<UploadMode>(null);
  const [dragActive, setDragActive] = useState(false);
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  // Layout context - seçili müşteri ve dönem
  const { selectedClient, selectedPeriod } = useLayoutContext();

  // Şablon indirme
  const handleDownloadTemplate = useCallback((type: 'mizan' | 'banka') => {
    const link = document.createElement('a');
    if (type === 'mizan') {
      link.href = '/templates/mizan_sablonu.csv';
      link.download = 'mizan_sablonu.csv';
    } else {
      link.href = '/templates/banka_ekstresi.csv';
      link.download = 'banka_ekstresi.csv';
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleModeSelect = useCallback((selectedMode: UploadMode) => {
    setMode(selectedMode);
    // Reset state
    setPhase('idle');
    setProgress(0);
    setError(null);
    setResult(null);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // BACKEND UPLOAD - Tüm işlem backend'de yapılıyor
  const handleBackendUpload = useCallback(async (file: File) => {
    setPhase('uploading');
    setProgress(10);
    setCurrentFile(file.name);
    setError(null);

    try {
      // Dönem bilgilerini hazırla
      const year = selectedPeriod?.year || new Date().getFullYear();
      const quarter = selectedPeriod?.periodNumber || 1;
      const period = `${year}-Q${quarter}`;
      const clientId = selectedClient?.id || 'DEFAULT_CLIENT';

      console.log('[Upload] Backend upload başlıyor:', {
        file: file.name,
        size: file.size,
        clientId,
        period
      });

      setProgress(30);

      // FormData oluştur
      const formData = new FormData();
      formData.append('file', file);
      formData.append('client_id', clientId);
      formData.append('period', period);
      formData.append('smmm_id', 'HKOZKAN'); // TODO: Auth'dan al

      setPhase('processing');
      setProgress(50);

      // Backend'e gönder
      const response = await fetch(`${API_BASE}/api/v2/upload`, {
        method: 'POST',
        body: formData,
      });

      setProgress(80);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Sunucu hatası: ${response.status}`);
      }

      const data: UploadResult = await response.json();

      console.log('[Upload] Backend upload başarılı:', data);

      setProgress(100);
      setResult(data);
      setPhase('complete');

    } catch (err) {
      console.error('[Upload] Backend upload hatası:', err);
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
      setPhase('error');
    }
  }, [selectedClient, selectedPeriod]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleBackendUpload(files[0]);
    }
  }, [handleBackendUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleBackendUpload(files[0]);
    }
  }, [handleBackendUpload]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Upload className="w-7 h-7 text-blue-600" />
            Dönem Verisi Yükleme
          </h1>
          <p className="text-slate-600 mt-1">
            Dönem belgelerinizi yükleyin - Backend otomatik işler
          </p>
        </div>
        {(isComplete || isError) && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Yeni Yükleme
          </button>
        )}
      </div>

      {/* Seçili Dönem Bilgisi */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Seçili Dönem:</span>{' '}
              {selectedPeriod?.year || new Date().getFullYear()}-Q{selectedPeriod?.periodNumber || 1}
            </p>
            <p className="text-sm text-blue-700">
              <span className="font-semibold">Mükellef:</span>{' '}
              {selectedClient?.name || 'Varsayılan'}
            </p>
          </div>
        </div>
      </div>

      {/* Upload Mode Selection */}
      {!isProcessing && !isComplete && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ZIP Package */}
          <button
            onClick={() => handleModeSelect('zip')}
            className={`
              relative p-6 rounded-xl border-2 transition-all text-left
              ${mode === 'zip'
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'
              }
            `}
          >
            {mode === 'zip' && (
              <div className="absolute top-3 right-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
            )}
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
              <FileArchive className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Toplu Paket (ZIP)</h3>
            <p className="text-sm text-slate-500">
              Tüm dönem belgelerini tek ZIP dosyasında yükleyin
            </p>
            <div className="mt-3 flex items-center gap-1 text-xs text-blue-600">
              <span className="font-medium">Önerilen</span>
              <span className="px-1.5 py-0.5 bg-blue-100 rounded">En Hızlı</span>
            </div>
          </button>

          {/* Multi File */}
          <button
            onClick={() => handleModeSelect('multi')}
            className={`
              relative p-6 rounded-xl border-2 transition-all text-left
              ${mode === 'multi'
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'
              }
            `}
          >
            {mode === 'multi' && (
              <div className="absolute top-3 right-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
            )}
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mb-4">
              <Files className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Çoklu Dosya</h3>
            <p className="text-sm text-slate-500">
              Birden fazla dosyayı sürükle-bırak ile yükleyin
            </p>
            <div className="mt-3 flex items-center gap-1 text-xs text-slate-500">
              <span>Drag & Drop destekli</span>
            </div>
          </button>

          {/* Template Download */}
          <div className="p-6 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
            <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center mb-4">
              <Download className="w-6 h-6 text-slate-500" />
            </div>
            <h3 className="font-semibold text-slate-700 mb-1">Şablon İndir</h3>
            <p className="text-sm text-slate-500 mb-3">
              Standart format şablonlarını indirin
            </p>
            <div className="space-y-1.5">
              <button
                onClick={() => handleDownloadTemplate('mizan')}
                className="w-full text-left text-xs text-blue-600 hover:text-blue-800 flex items-center gap-2 p-1.5 rounded hover:bg-white transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Mizan Şablonu (.csv)
              </button>
              <button
                onClick={() => handleDownloadTemplate('banka')}
                className="w-full text-left text-xs text-blue-600 hover:text-blue-800 flex items-center gap-2 p-1.5 rounded hover:bg-white transition-colors"
              >
                <Database className="w-3.5 h-3.5" />
                Banka Ekstresi (.csv)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      {mode && !isProcessing && !isComplete && !isError && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-xl p-12 text-center transition-all
            ${dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 hover:border-blue-400 bg-white'
            }
          `}
        >
          <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">
            {mode === 'zip' ? 'ZIP dosyanızı sürükleyin' : 'Dosyalarınızı sürükleyin'}
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            veya dosya seçmek için tıklayın
          </p>
          <input
            type="file"
            accept={mode === 'zip' ? '.zip' : '.xlsx,.xls,.csv,.pdf,.xml,.zip,.txt,.json'}
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <p className="text-xs text-slate-400">
            {mode === 'zip'
              ? 'Desteklenen: ZIP (maks. 200MB)'
              : 'Desteklenen: XLSX, XLS, CSV, PDF, XML, TXT, JSON (maks. 50MB/dosya)'
            }
          </p>
        </div>
      )}

      {/* Processing Status */}
      {isProcessing && (
        <div className="bg-white border border-slate-200 rounded-xl p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                {phase === 'uploading' && 'Dosya Yükleniyor...'}
                {phase === 'processing' && 'Backend İşliyor...'}
              </h3>
              <p className="text-sm text-slate-500">{currentFile}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">İlerleme</span>
              <span className="font-medium text-slate-800">%{Math.round(progress)}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-4 text-sm text-slate-600">
            <Clock className="w-4 h-4 inline mr-1" />
            Parse işlemi backend&apos;de yapılıyor...
          </div>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-700 mb-1">Yükleme Hatası</h3>
              <p className="text-sm text-red-600 mb-4">{error}</p>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
              >
                Tekrar Dene
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success - Backend Sonuçları */}
      {isComplete && result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-emerald-700 text-lg">Yükleme Tamamlandı!</h3>
                <p className="text-sm text-emerald-600">
                  {result.summary.total_files} dosya işlendi, {result.summary.total_rows} kayıt veritabanına yazıldı
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-emerald-500">Dönem</p>
                <p className="font-medium text-emerald-700">{result.period}</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-sm text-slate-500">Toplam Dosya</p>
              <p className="text-2xl font-bold text-slate-800">{result.summary.total_files}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-sm text-slate-500">Başarılı</p>
              <p className="text-2xl font-bold text-emerald-600">{result.summary.success_files}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-sm text-slate-500">Toplam Kayıt</p>
              <p className="text-2xl font-bold text-blue-600">{result.summary.total_rows}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-sm text-slate-500">Dönem ID</p>
              <p className="text-sm font-mono font-bold text-slate-600 truncate">{result.donem_id}</p>
            </div>
          </div>

          {/* Files List */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                İşlenen Dosyalar ({result.files.length})
              </h2>
            </div>

            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {result.files.map((file, index) => {
                const config = getFileTypeConfig(file.type);
                const IconComponent = config.icon;
                const isSuccess = file.status === 'success';

                return (
                  <div key={index} className="flex items-center gap-3 p-4 hover:bg-slate-50">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color.split(' ')[1]}`}>
                      <IconComponent className={`w-5 h-5 ${config.color.split(' ')[0]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{file.file}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`px-1.5 py-0.5 text-xs rounded ${config.color}`}>
                          {config.label}
                        </span>
                        {file.rows > 0 && (
                          <span className="text-xs text-slate-500">
                            {file.rows} satır
                          </span>
                        )}
                        {file.message && (
                          <span className="text-xs text-slate-400">
                            {file.message}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {isSuccess ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : file.status === 'pending' ? (
                        <Clock className="w-5 h-5 text-amber-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                <strong className="text-emerald-600">{result.summary.success_files}</strong> dosya başarıyla işlendi
              </p>
              <button
                onClick={handleGoToDashboard}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                Dashboard&apos;a Git
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supported File Types Info */}
      {!isProcessing && !isComplete && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Desteklenen Belge Türleri</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[
              { icon: FileSpreadsheet, label: 'Mizan', color: 'text-emerald-600 bg-emerald-50' },
              { icon: FileSpreadsheet, label: 'Yevmiye', color: 'text-blue-600 bg-blue-50' },
              { icon: FileSpreadsheet, label: 'Kebir', color: 'text-blue-600 bg-blue-50' },
              { icon: FileCode, label: 'E-Defter', color: 'text-cyan-600 bg-cyan-50' },
              { icon: Receipt, label: 'E-Fatura', color: 'text-orange-600 bg-orange-50' },
              { icon: Building2, label: 'Banka Ekstresi', color: 'text-teal-600 bg-teal-50' },
              { icon: FileText, label: 'KDV Beyan', color: 'text-red-600 bg-red-50' },
              { icon: FileText, label: 'Muhtasar', color: 'text-red-600 bg-red-50' },
              { icon: FileText, label: 'Geçici Vergi', color: 'text-red-600 bg-red-50' },
              { icon: FileText, label: 'Vergi Levhası', color: 'text-amber-600 bg-amber-50' },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-2 p-2.5 rounded-lg ${item.color.split(' ')[1]}`}>
                <item.icon className={`w-4 h-4 ${item.color.split(' ')[0]}`} />
                <span className="text-xs font-medium text-slate-700">{item.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Formatlar: XLSX, XLS, CSV, XML, PDF (maks. 200MB)
          </p>
        </div>
      )}
    </div>
  );
}
