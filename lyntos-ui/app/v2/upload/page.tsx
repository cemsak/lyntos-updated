/**
 * LYNTOS Upload Page v2.0
 * =======================
 * GERCEK PARSING - SIFIR MOCK DATA
 *
 * useQuarterlyAnalysis hook'u ile entegre
 * donemStore'a otomatik kayit
 * 40+ belge tipi destegi
 */
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
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
import { useQuarterlyAnalysis } from '../_hooks/useQuarterlyAnalysis';
import { useDonemStore } from '../_lib/stores/donemStore';

type UploadMode = 'zip' | 'multi' | null;

// ============================================================================
// DOSYA TIPI -> TURKCE LABEL & IKON
// ============================================================================
const FILE_TYPE_CONFIG: Record<string, { label: string; icon: typeof FileSpreadsheet; color: string }> = {
  // Muhasebe
  'MIZAN_EXCEL': { label: 'Mizan', icon: FileSpreadsheet, color: 'text-emerald-600 bg-emerald-100' },
  'MIZAN_CSV': { label: 'Mizan (CSV)', icon: FileSpreadsheet, color: 'text-emerald-600 bg-emerald-100' },
  'YEVMIYE_EXCEL': { label: 'Yevmiye Defteri', icon: FileSpreadsheet, color: 'text-blue-600 bg-blue-100' },
  'KEBIR_EXCEL': { label: 'Defteri Kebir', icon: FileSpreadsheet, color: 'text-blue-600 bg-blue-100' },
  'HESAP_PLANI_EXCEL': { label: 'Hesap Plani', icon: FileSpreadsheet, color: 'text-purple-600 bg-purple-100' },
  'HESAP_PLANI_CSV': { label: 'Hesap Plani (CSV)', icon: FileSpreadsheet, color: 'text-purple-600 bg-purple-100' },
  'HESAP_PLANI_XML': { label: 'Hesap Plani (XML)', icon: FileCode, color: 'text-purple-600 bg-purple-100' },
  'BILANCO_EXCEL': { label: 'Bilanco', icon: FileSpreadsheet, color: 'text-indigo-600 bg-indigo-100' },
  'GELIR_TABLOSU_EXCEL': { label: 'Gelir Tablosu', icon: FileSpreadsheet, color: 'text-indigo-600 bg-indigo-100' },
  'MUHASEBE_FISI_EXCEL': { label: 'Muhasebe Fisi', icon: FileSpreadsheet, color: 'text-gray-600 bg-gray-100' },
  'MUHASEBE_FISI_CSV': { label: 'Muhasebe Fisi (CSV)', icon: FileText, color: 'text-gray-600 bg-gray-100' },
  'MUHASEBE_FISI_XML': { label: 'Muhasebe Fisi (XML)', icon: FileCode, color: 'text-gray-600 bg-gray-100' },

  // E-Defter
  'E_DEFTER_YEVMIYE_XML': { label: 'E-Defter Yevmiye', icon: FileCode, color: 'text-cyan-600 bg-cyan-100' },
  'E_DEFTER_KEBIR_XML': { label: 'E-Defter Kebir', icon: FileCode, color: 'text-cyan-600 bg-cyan-100' },
  'E_DEFTER_BERAT_XML': { label: 'E-Defter Berati', icon: FileCode, color: 'text-cyan-600 bg-cyan-100' },
  'E_DEFTER_RAPOR_XML': { label: 'E-Defter Raporu', icon: FileCode, color: 'text-cyan-600 bg-cyan-100' },

  // E-Belgeler
  'E_FATURA_XML': { label: 'E-Fatura', icon: Receipt, color: 'text-orange-600 bg-orange-100' },
  'E_ARSIV_XML': { label: 'E-Arsiv Fatura', icon: Receipt, color: 'text-orange-600 bg-orange-100' },
  'E_IRSALIYE_XML': { label: 'E-Irsaliye', icon: Receipt, color: 'text-orange-600 bg-orange-100' },
  'E_FATURA_PDF': { label: 'E-Fatura (PDF)', icon: FileText, color: 'text-orange-600 bg-orange-100' },
  'E_ARSIV_PDF': { label: 'E-Arsiv (PDF)', icon: FileText, color: 'text-orange-600 bg-orange-100' },

  // Banka
  'BANKA_EKSTRE_CSV': { label: 'Banka Ekstresi', icon: Building2, color: 'text-teal-600 bg-teal-100' },
  'BANKA_EKSTRE_EXCEL': { label: 'Banka Ekstresi (Excel)', icon: Building2, color: 'text-teal-600 bg-teal-100' },
  'BANKA_EKSTRE_PDF': { label: 'Banka Ekstresi (PDF)', icon: Building2, color: 'text-teal-600 bg-teal-100' },
  'BANKA_EKSTRE_HTML': { label: 'Banka Ekstresi (HTML)', icon: Building2, color: 'text-teal-600 bg-teal-100' },
  'MT940_TXT': { label: 'MT940 Ekstre', icon: Building2, color: 'text-teal-600 bg-teal-100' },

  // Beyannameler
  'KDV_BEYANNAME_PDF': { label: 'KDV Beyannamesi', icon: FileText, color: 'text-red-600 bg-red-100' },
  'KDV_TAHAKKUK_PDF': { label: 'KDV Tahakkuku', icon: FileText, color: 'text-red-600 bg-red-100' },
  'MUHTASAR_BEYANNAME_PDF': { label: 'Muhtasar Beyanname', icon: FileText, color: 'text-red-600 bg-red-100' },
  'MUHTASAR_TAHAKKUK_PDF': { label: 'Muhtasar Tahakkuk', icon: FileText, color: 'text-red-600 bg-red-100' },
  'GECICI_VERGI_BEYANNAME_PDF': { label: 'Gecici Vergi Beyanname', icon: FileText, color: 'text-red-600 bg-red-100' },
  'GECICI_VERGI_TAHAKKUK_PDF': { label: 'Gecici Vergi Tahakkuk', icon: FileText, color: 'text-red-600 bg-red-100' },
  'KURUMLAR_VERGISI_PDF': { label: 'Kurumlar Vergisi', icon: FileText, color: 'text-red-600 bg-red-100' },
  'GELIR_VERGISI_PDF': { label: 'Gelir Vergisi', icon: FileText, color: 'text-red-600 bg-red-100' },
  'DAMGA_VERGISI_PDF': { label: 'Damga Vergisi', icon: FileText, color: 'text-red-600 bg-red-100' },
  'VERGI_LEVHASI_PDF': { label: 'Vergi Levhasi', icon: FileText, color: 'text-amber-600 bg-amber-100' },
  'VERGI_LEVHASI_IMAGE': { label: 'Vergi Levhasi (Goruntu)', icon: FileText, color: 'text-amber-600 bg-amber-100' },

  // SGK
  'SGK_APHB_PDF': { label: 'APHB', icon: FileText, color: 'text-sky-600 bg-sky-100' },
  'SGK_APHB_EXCEL': { label: 'APHB (Excel)', icon: FileSpreadsheet, color: 'text-sky-600 bg-sky-100' },
  'SGK_EKSIK_GUN_PDF': { label: 'Eksik Gun', icon: FileText, color: 'text-sky-600 bg-sky-100' },
  'SGK_EKSIK_GUN_EXCEL': { label: 'Eksik Gun (Excel)', icon: FileSpreadsheet, color: 'text-sky-600 bg-sky-100' },

  // Diger
  'CARI_EKSTRE_EXCEL': { label: 'Cari Hesap Ekstresi', icon: FileSpreadsheet, color: 'text-slate-600 bg-slate-100' },
  'STOK_RAPOR_EXCEL': { label: 'Stok Raporu', icon: FileSpreadsheet, color: 'text-slate-600 bg-slate-100' },
  'DEMIRBAS_LISTE_EXCEL': { label: 'Demirbas Listesi', icon: FileSpreadsheet, color: 'text-slate-600 bg-slate-100' },
  'PERSONEL_LISTE_EXCEL': { label: 'Personel Listesi', icon: FileSpreadsheet, color: 'text-slate-600 bg-slate-100' },
  'YAS_ANALIZI_EXCEL': { label: 'Yas Analizi', icon: FileSpreadsheet, color: 'text-slate-600 bg-slate-100' },
  'SOZLESME_PDF': { label: 'Sozlesme', icon: FileText, color: 'text-slate-600 bg-slate-100' },
  'FATURA_PDF': { label: 'Fatura (PDF)', icon: Receipt, color: 'text-slate-600 bg-slate-100' },
  'FATURA_IMAGE': { label: 'Fatura (Goruntu)', icon: Receipt, color: 'text-slate-600 bg-slate-100' },
  'FIS_IMAGE': { label: 'Fis (Goruntu)', icon: Receipt, color: 'text-slate-600 bg-slate-100' },

  // Arsiv
  'ARCHIVE_ZIP': { label: 'ZIP Arsivi', icon: FileArchive, color: 'text-slate-600 bg-slate-100' },
  'ARCHIVE_OTHER': { label: 'Arsiv Dosyasi', icon: FileArchive, color: 'text-slate-600 bg-slate-100' },

  // Bilinmeyen
  'UNKNOWN': { label: 'Tanimlanamadi', icon: AlertCircle, color: 'text-amber-600 bg-amber-100' },
  'UNKNOWN_EXCEL': { label: 'Excel (Tip Belirsiz)', icon: FileSpreadsheet, color: 'text-amber-600 bg-amber-100' },
  'UNKNOWN_CSV': { label: 'CSV (Tip Belirsiz)', icon: FileText, color: 'text-amber-600 bg-amber-100' },
  'UNKNOWN_XML': { label: 'XML (Tip Belirsiz)', icon: FileCode, color: 'text-amber-600 bg-amber-100' },
  'UNKNOWN_PDF': { label: 'PDF (Tip Belirsiz)', icon: FileText, color: 'text-amber-600 bg-amber-100' },
  'UNKNOWN_TXT': { label: 'Metin Dosyasi', icon: FileText, color: 'text-amber-600 bg-amber-100' },
  'UNKNOWN_JSON': { label: 'JSON Dosyasi', icon: FileCode, color: 'text-amber-600 bg-amber-100' },
  'UNKNOWN_HTML': { label: 'HTML Dosyasi', icon: FileCode, color: 'text-amber-600 bg-amber-100' },
  'UNKNOWN_IMAGE': { label: 'Goruntu Dosyasi', icon: FileText, color: 'text-amber-600 bg-amber-100' },
};

function getFileTypeConfig(fileType: string) {
  return FILE_TYPE_CONFIG[fileType] || FILE_TYPE_CONFIG['UNKNOWN'];
}

// ============================================================================
// ANA COMPONENT
// ============================================================================
export default function UploadPage() {
  const [mode, setMode] = useState<UploadMode>(null);
  const [dragActive, setDragActive] = useState(false);

  // GERCEK PARSING HOOK
  const analysis = useQuarterlyAnalysis();

  // MERKEZI STORE
  const setDonemData = useDonemStore(s => s.setDonemData);
  const clearDonemData = useDonemStore(s => s.clearDonemData);

  // Parse tamamlandiginda store'a kaydet
  useEffect(() => {
    if (analysis.isComplete && analysis.parsedData && analysis.detectedFiles.length > 0) {
      // Dosya adindan ceyrek tespit et
      const currentFile = analysis.currentFile || 'upload.zip';
      let quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' = 'Q1';
      const quarterMatch = currentFile.match(/Q([1-4])/i);
      if (quarterMatch) {
        quarter = `Q${quarterMatch[1]}` as 'Q1' | 'Q2' | 'Q3' | 'Q4';
      }

      const year = new Date().getFullYear();

      setDonemData(
        {
          clientId: 'current',
          clientName: 'Mukellef',
          period: `${year}-${quarter}`,
          quarter,
          year,
          uploadedAt: new Date().toISOString(),
          sourceFile: currentFile,
        },
        analysis.detectedFiles,
        analysis.parsedData,
        analysis.fileStats
      );
    }
  }, [analysis.isComplete, analysis.parsedData, analysis.detectedFiles, analysis.fileStats, analysis.currentFile, setDonemData]);

  // Sablon indirme
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
    if (analysis.isComplete || analysis.isError) {
      analysis.reset();
    }
  }, [analysis]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // GERCEK UPLOAD - MOCK YOK
  const handleRealUpload = useCallback(async (file: File) => {
    await analysis.analyzeZip(file);
  }, [analysis]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleRealUpload(files[0]);
    }
  }, [handleRealUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleRealUpload(files[0]);
    }
  }, [handleRealUpload]);

  const handleReset = useCallback(() => {
    analysis.reset();
    clearDonemData();
    setMode(null);
  }, [analysis, clearDonemData]);

  // GERCEK dosyalardan liste olustur
  const recognizedFiles = analysis.detectedFiles.filter(f => !f.fileType.startsWith('UNKNOWN'));
  const unknownFiles = analysis.detectedFiles.filter(f => f.fileType.startsWith('UNKNOWN'));

  // Kategori bazli gruplama
  const groupedFiles = useMemo(() => {
    const groups: Record<string, typeof recognizedFiles> = {
      'Muhasebe': [],
      'E-Defter': [],
      'E-Belgeler': [],
      'Banka': [],
      'Beyanname': [],
      'SGK': [],
      'Diger': [],
    };

    for (const file of recognizedFiles) {
      const type = file.fileType;
      if (type.includes('MIZAN') || type.includes('YEVMIYE') || type.includes('KEBIR') ||
          type.includes('HESAP_PLANI') || type.includes('BILANCO') || type.includes('GELIR_TABLOSU') ||
          type.includes('MUHASEBE_FISI')) {
        groups['Muhasebe'].push(file);
      } else if (type.includes('E_DEFTER')) {
        groups['E-Defter'].push(file);
      } else if (type.includes('E_FATURA') || type.includes('E_ARSIV') || type.includes('E_IRSALIYE')) {
        groups['E-Belgeler'].push(file);
      } else if (type.includes('BANKA') || type.includes('MT940')) {
        groups['Banka'].push(file);
      } else if (type.includes('KDV') || type.includes('MUHTASAR') || type.includes('GECICI') ||
                 type.includes('KURUMLAR') || type.includes('GELIR_VERGISI') || type.includes('DAMGA') ||
                 type.includes('VERGI_LEVHASI')) {
        groups['Beyanname'].push(file);
      } else if (type.includes('APHB') || type.includes('SGK') || type.includes('EKSIK_GUN')) {
        groups['SGK'].push(file);
      } else {
        groups['Diger'].push(file);
      }
    }

    return groups;
  }, [recognizedFiles]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Upload className="w-7 h-7 text-blue-600" />
            Donem Verisi Yukleme
          </h1>
          <p className="text-slate-600 mt-1">
            Donem belgelerinizi yukleyin - 40+ belge tipi otomatik taninir
          </p>
        </div>
        {(analysis.isComplete || analysis.isError) && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Yeni Yukleme
          </button>
        )}
      </div>

      {/* Upload Mode Selection */}
      {!analysis.isProcessing && !analysis.isComplete && (
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
              Tum donem belgelerini tek ZIP dosyasinda yukleyin
            </p>
            <div className="mt-3 flex items-center gap-1 text-xs text-blue-600">
              <span className="font-medium">Onerilen</span>
              <span className="px-1.5 py-0.5 bg-blue-100 rounded">En Hizli</span>
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
            <h3 className="font-semibold text-slate-900 mb-1">Coklu Dosya</h3>
            <p className="text-sm text-slate-500">
              Birden fazla dosyayi surukle-birak ile yukleyin
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
            <h3 className="font-semibold text-slate-700 mb-1">Sablon Indir</h3>
            <p className="text-sm text-slate-500 mb-3">
              Standart format sablonlarini indirin
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
      )}

      {/* Upload Area */}
      {mode && !analysis.isProcessing && !analysis.isComplete && !analysis.isError && (
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
            {mode === 'zip' ? 'ZIP dosyanizi surukleyin' : 'Dosyalarinizi surukleyin'}
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            veya dosya secmek icin tiklayin
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
      {analysis.isProcessing && (
        <div className="bg-white border border-slate-200 rounded-xl p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                {analysis.phase === 'extracting' && 'ZIP Aciliyor...'}
                {analysis.phase === 'detecting' && 'Dosyalar Tanimlaniyor...'}
                {analysis.phase === 'parsing' && 'Veriler Okunuyor...'}
                {analysis.phase === 'checking' && 'Capraz Kontroller Yapiliyor...'}
              </h3>
              <p className="text-sm text-slate-500">{analysis.currentFile}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Ilerleme</span>
              <span className="font-medium text-slate-800">%{Math.round(analysis.progress)}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${analysis.progress}%` }}
              />
            </div>
          </div>

          {analysis.fileStats.total > 0 && (
            <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {analysis.fileStats.detected} / {analysis.fileStats.total} dosya islendi
              </span>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {analysis.isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-700 mb-1">Yukleme Hatasi</h3>
              <p className="text-sm text-red-600 mb-4">{analysis.error}</p>
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

      {/* Success - GERCEK DOSYALAR */}
      {analysis.isComplete && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-emerald-700 text-lg">Yukleme Tamamlandi!</h3>
                <p className="text-sm text-emerald-600">
                  {analysis.fileStats.total} dosya islendi, {analysis.fileStats.parsed} dosya basariyla okundu
                </p>
              </div>
              {analysis.duration && (
                <div className="text-right">
                  <p className="text-xs text-emerald-500">Islem suresi</p>
                  <p className="font-medium text-emerald-700">{(analysis.duration / 1000).toFixed(1)}s</p>
                </div>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-sm text-slate-500">Toplam Dosya</p>
              <p className="text-2xl font-bold text-slate-800">{analysis.fileStats.total}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-sm text-slate-500">Taninan</p>
              <p className="text-2xl font-bold text-emerald-600">{analysis.fileStats.detected}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-sm text-slate-500">Ayristirilan</p>
              <p className="text-2xl font-bold text-blue-600">{analysis.fileStats.parsed}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-sm text-slate-500">Taninamayan</p>
              <p className="text-2xl font-bold text-amber-600">{analysis.fileStats.failed}</p>
            </div>
          </div>

          {/* Grouped Files List */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Tanimlanan Dosyalar ({recognizedFiles.length})
              </h2>
            </div>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {Object.entries(groupedFiles).map(([category, files]) => {
                if (files.length === 0) return null;

                return (
                  <div key={category} className="p-4">
                    <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      {category} ({files.length})
                    </h3>
                    <div className="space-y-2">
                      {files.map((file) => {
                        const config = getFileTypeConfig(file.fileType);
                        const IconComponent = config.icon;

                        return (
                          <div key={file.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color.split(' ')[1]}`}>
                              <IconComponent className={`w-4 h-4 ${config.color.split(' ')[0]}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{file.fileName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`px-1.5 py-0.5 text-xs rounded ${config.color}`}>
                                  {config.label}
                                </span>
                                <span className="text-xs text-slate-400">
                                  %{file.confidence} guven
                                </span>
                                {file.metadata?.banka && (
                                  <span className="text-xs text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
                                    {file.metadata.banka}
                                  </span>
                                )}
                                {file.metadata?.ay && (
                                  <span className="text-xs text-slate-500">
                                    {file.metadata.ay}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-slate-400">
                              {(file.fileSize / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Unknown files */}
            {unknownFiles.length > 0 && (
              <>
                <div className="p-3 bg-amber-50 border-t border-amber-200">
                  <p className="text-sm text-amber-700 font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Taninamayan Dosyalar ({unknownFiles.length})
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {unknownFiles.slice(0, 10).map((file) => (
                    <div key={file.id} className="flex items-center gap-3 p-3 bg-amber-50/50">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{file.fileName}</p>
                        <p className="text-xs text-slate-500">{file.fileExtension.toUpperCase()} dosyasi</p>
                      </div>
                      <span className="text-xs text-slate-400">{(file.fileSize / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                  {unknownFiles.length > 10 && (
                    <div className="p-3 text-center text-sm text-slate-500 bg-amber-50/50">
                      +{unknownFiles.length - 10} dosya daha
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                <strong className="text-emerald-600">{analysis.fileStats.parsed}</strong> basarili,
                <strong className="text-amber-600 ml-1">{unknownFiles.length}</strong> taninamadi
              </p>
              <Link
                href="/v2"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                Analize Git
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Supported File Types Info */}
      {!analysis.isProcessing && !analysis.isComplete && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Desteklenen Belge Turleri (40+)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[
              { icon: FileSpreadsheet, label: 'Mizan', color: 'text-emerald-600 bg-emerald-50' },
              { icon: FileSpreadsheet, label: 'Yevmiye', color: 'text-blue-600 bg-blue-50' },
              { icon: FileSpreadsheet, label: 'Kebir', color: 'text-blue-600 bg-blue-50' },
              { icon: FileCode, label: 'E-Defter', color: 'text-cyan-600 bg-cyan-50' },
              { icon: Receipt, label: 'E-Fatura', color: 'text-orange-600 bg-orange-50' },
              { icon: Receipt, label: 'E-Arsiv', color: 'text-orange-600 bg-orange-50' },
              { icon: Building2, label: 'Banka (25+ banka)', color: 'text-teal-600 bg-teal-50' },
              { icon: Building2, label: 'MT940 Ekstre', color: 'text-teal-600 bg-teal-50' },
              { icon: FileText, label: 'KDV Beyan', color: 'text-red-600 bg-red-50' },
              { icon: FileText, label: 'Muhtasar', color: 'text-red-600 bg-red-50' },
              { icon: FileText, label: 'Gecici Vergi', color: 'text-red-600 bg-red-50' },
              { icon: FileText, label: 'APHB/SGK', color: 'text-sky-600 bg-sky-50' },
              { icon: FileText, label: 'Vergi Levhasi', color: 'text-amber-600 bg-amber-50' },
              { icon: FileSpreadsheet, label: 'Hesap Plani', color: 'text-purple-600 bg-purple-50' },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-2 p-2.5 rounded-lg ${item.color.split(' ')[1]}`}>
                <item.icon className={`w-4 h-4 ${item.color.split(' ')[0]}`} />
                <span className="text-xs font-medium text-slate-700">{item.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Formatlar: XLSX, XLS, CSV, XML (UBL-TR, XBRL-GL), PDF, MT940 (SWIFT), JSON, HTML, TXT, Goruntu
          </p>
        </div>
      )}
    </div>
  );
}
