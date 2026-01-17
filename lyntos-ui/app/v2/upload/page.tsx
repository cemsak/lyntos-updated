'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';

type UploadMode = 'zip' | 'multi' | null;
type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

interface DetectedFile {
  name: string;
  type: string;
  status: 'valid' | 'invalid' | 'warning';
  message?: string;
}

export default function UploadPage() {
  const [mode, setMode] = useState<UploadMode>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [detectedFiles, setDetectedFiles] = useState<DetectedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Sablon indirme fonksiyonu
  const handleDownloadTemplate = (type: 'mizan' | 'banka') => {
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
  };

  const handleModeSelect = (selectedMode: UploadMode) => {
    setMode(selectedMode);
    setStatus('idle');
    setDetectedFiles([]);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const simulateUpload = () => {
    setStatus('uploading');
    setTimeout(() => {
      setStatus('processing');
      setTimeout(() => {
        setStatus('success');
        // Simulated detected files
        setDetectedFiles([
          { name: 'mizan_2026_q1.xlsx', type: 'Mizan', status: 'valid', message: '12.847 satir tespit edildi' },
          { name: 'kdv_beyan_aralik.pdf', type: 'KDV Beyannamesi', status: 'valid' },
          { name: 'banka_akbank_12.csv', type: 'Banka Ekstresi', status: 'warning', message: 'Tarih formatı kontrol edilmeli' },
          { name: 'efatura_liste.xml', type: 'e-Fatura', status: 'valid', message: '234 fatura tespit edildi' },
        ]);
      }, 1500);
    }, 2000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      simulateUpload();
    }
  };

  const handleFileInput = () => {
    simulateUpload();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Upload className="w-7 h-7 text-blue-600" />
            Toplu Veri Yükleme
          </h1>
          <p className="text-slate-600 mt-1">
            Dönem belgelerinizi tek seferde yükleyin, sistem otomatik tanımlasın
          </p>
        </div>
      </div>

      {/* Upload Mode Selection */}
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
              Mizan Sablonu (.csv)
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

      {/* Upload Area - Show when mode selected */}
      {mode && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-xl p-12 text-center transition-all
            ${dragActive
              ? 'border-blue-500 bg-blue-50'
              : status === 'success'
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-slate-300 hover:border-blue-400 bg-white'
            }
          `}
        >
          {status === 'idle' && (
            <>
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">
                {mode === 'zip' ? 'ZIP dosyanızı sürükleyin' : 'Dosyalarınızı sürükleyin'}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                veya dosya seçmek için tıklayın
              </p>
              <input
                type="file"
                multiple={mode === 'multi'}
                accept={mode === 'zip' ? '.zip' : '.xlsx,.xls,.csv,.pdf,.xml'}
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <p className="text-xs text-slate-400">
                {mode === 'zip'
                  ? 'Desteklenen: ZIP (maks. 100MB)'
                  : 'Desteklenen: XLSX, XLS, CSV, PDF, XML (maks. 10MB/dosya)'
                }
              </p>
            </>
          )}

          {status === 'uploading' && (
            <div className="py-8">
              <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">Dosyalar Yükleniyor...</h3>
              <div className="w-64 mx-auto bg-slate-200 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {status === 'processing' && (
            <div className="py-8">
              <Loader2 className="w-12 h-12 text-indigo-500 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">Dosyalar Analiz Ediliyor...</h3>
              <p className="text-sm text-slate-500">Belge türleri otomatik tanımlanıyor</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-emerald-700 mb-2">Yükleme Başarılı!</h3>
              <p className="text-sm text-slate-600">{detectedFiles.length} dosya tespit edildi</p>
            </div>
          )}
        </div>
      )}

      {/* Detected Files - Show after success */}
      {status === 'success' && detectedFiles.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              Sistem Şunları Tespit Etti
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {detectedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 hover:bg-slate-50">
                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center
                  ${file.status === 'valid' ? 'bg-emerald-100' : file.status === 'warning' ? 'bg-amber-100' : 'bg-red-100'}
                `}>
                  {file.status === 'valid' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : file.status === 'warning' ? (
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800 truncate">{file.name}</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                      {file.type}
                    </span>
                  </div>
                  {file.message && (
                    <p className={`text-xs mt-0.5 ${
                      file.status === 'warning' ? 'text-amber-600' : 'text-slate-500'
                    }`}>
                      {file.message}
                    </p>
                  )}
                </div>
                <button className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  Detay
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              <strong className="text-emerald-600">{detectedFiles.filter(f => f.status === 'valid').length}</strong> geçerli,
              <strong className="text-amber-600 ml-1">{detectedFiles.filter(f => f.status === 'warning').length}</strong> uyarı
            </p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
              Analizi Başlat
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Supported File Types Info */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Desteklenen Belge Türleri</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-slate-700">Mizan</p>
              <p className="text-xs text-slate-500">.xlsx, .xls, .csv</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-slate-700">Beyanname</p>
              <p className="text-xs text-slate-500">.pdf, .xml</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <Database className="w-5 h-5 text-indigo-600" />
            <div>
              <p className="text-sm font-medium text-slate-700">Banka Ekstresi</p>
              <p className="text-xs text-slate-500">.csv, .xlsx</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <FileText className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-slate-700">e-Fatura/e-Arşiv</p>
              <p className="text-xs text-slate-500">.xml, .zip</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
          <Info className="w-4 h-4" />
          Hızlı İpuçları
        </h4>
        <ul className="space-y-1 text-sm text-blue-700">
          <li>• ZIP paketinde dosyaları klasörlemeden düz yapıda tutun</li>
          <li>• Dosya isimlerinde Türkçe karakter kullanabilirsiniz</li>
          <li>• Sistem belge türlerini otomatik tanır, manuel eşleştirme gerekmez</li>
          <li>• Aynı türden birden fazla dönem belgesi yükleyebilirsiniz</li>
        </ul>
      </div>
    </div>
  );
}
