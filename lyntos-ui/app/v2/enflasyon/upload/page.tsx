'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  X,
  FileSpreadsheet,
  Calculator
} from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  errorMessage?: string;
}

const REQUIRED_DOCUMENTS = [
  {
    id: 'bilanço',
    title: 'Bilanço',
    description: 'Dönem sonu bilançosu (Excel/PDF)',
    icon: FileSpreadsheet,
    required: true,
  },
  {
    id: 'gelir_tablosu',
    title: 'Gelir Tablosu',
    description: 'Dönem gelir tablosu',
    icon: FileText,
    required: true,
  },
  {
    id: 'mizan',
    title: 'Mizan',
    description: 'Dönem sonu mizanı',
    icon: Calculator,
    required: true,
  },
  {
    id: 'tufe_verileri',
    title: 'TÜFE Verileri',
    description: 'TÜİK TÜFE endeksleri (opsiyonel - sistem otomatik çeker)',
    icon: FileText,
    required: false,
  },
];

export default function EnflasyonUploadPage() {
  const router = useRouter();
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFile>>({});
  const [dragOver, setDragOver] = useState<string | null>(null);

  const handleFileSelect = useCallback((documentId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileId = `${documentId}-${Date.now()}`;

    setUploadedFiles(prev => ({
      ...prev,
      [documentId]: {
        id: fileId,
        name: file.name,
        size: file.size,
        status: 'uploading',
        progress: 0,
      },
    }));

    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setUploadedFiles(prev => ({
          ...prev,
          [documentId]: {
            ...prev[documentId],
            status: 'success',
            progress: 100,
          },
        }));
      } else {
        setUploadedFiles(prev => ({
          ...prev,
          [documentId]: {
            ...prev[documentId],
            progress: Math.min(progress, 99),
          },
        }));
      }
    }, 200);
  }, []);

  const handleDrop = useCallback((documentId: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    handleFileSelect(documentId, e.dataTransfer.files);
  }, [handleFileSelect]);

  const removeFile = useCallback((documentId: string) => {
    setUploadedFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[documentId];
      return newFiles;
    });
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const requiredUploaded = REQUIRED_DOCUMENTS
    .filter(d => d.required)
    .every(d => uploadedFiles[d.id]?.status === 'success');

  const handleStartAnalysis = () => {
    // Navigate back to enflasyon page with analysis started
    router.push('/v2/enflasyon?analysis=started');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Enflasyon Muhasebesi Belge Yükleme
              </h1>
              <p className="text-sm text-slate-500">
                TMS 29 / VUK Mükerrer 298 Uyumu
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800">Enflasyon Düzeltmesi Gereklilikleri</h3>
              <p className="text-sm text-blue-700 mt-1">
                2024 yılı sonu itibarıyla enflasyon muhasebesi uygulaması zorunludur.
                Sistem, yüklenen belgeleri analiz ederek TMS 29 ve VUK Mükerrer 298
                kapsamında düzeltme önerileri sunacaktır.
              </p>
            </div>
          </div>
        </div>

        {/* Upload Cards */}
        <div className="space-y-4">
          {REQUIRED_DOCUMENTS.map((doc) => {
            const uploaded = uploadedFiles[doc.id];
            const Icon = doc.icon;

            return (
              <div
                key={doc.id}
                className={`bg-white border rounded-lg overflow-hidden transition-all ${
                  dragOver === doc.id
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-slate-200'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(doc.id);
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => handleDrop(doc.id, e)}
              >
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${
                      uploaded?.status === 'success'
                        ? 'bg-green-100'
                        : 'bg-slate-100'
                    }`}>
                      {uploaded?.status === 'success' ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      ) : (
                        <Icon className="w-6 h-6 text-slate-600" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-900">{doc.title}</h3>
                        {doc.required ? (
                          <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                            Zorunlu
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
                            Opsiyonel
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{doc.description}</p>

                      {uploaded ? (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-700">{uploaded.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">
                                {formatFileSize(uploaded.size)}
                              </span>
                              {uploaded.status === 'success' && (
                                <button
                                  onClick={() => removeFile(doc.id)}
                                  className="p-1 hover:bg-slate-100 rounded"
                                >
                                  <X className="w-4 h-4 text-slate-400" />
                                </button>
                              )}
                            </div>
                          </div>
                          {uploaded.status === 'uploading' && (
                            <div className="mt-2">
                              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                                  style={{ width: `${uploaded.progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-3">
                          <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                            <Upload className="w-5 h-5 text-slate-400" />
                            <span className="text-sm text-slate-600">
                              Dosya seçin veya sürükleyip bırakın
                            </span>
                            <input
                              type="file"
                              className="hidden"
                              accept=".xlsx,.xls,.csv,.pdf"
                              onChange={(e) => handleFileSelect(doc.id, e.target.files)}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
          >
            Geri Dön
          </button>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              {Object.values(uploadedFiles).filter(f => f.status === 'success').length} / {REQUIRED_DOCUMENTS.filter(d => d.required).length} zorunlu belge yüklendi
            </span>
            <button
              onClick={handleStartAnalysis}
              disabled={!requiredUploaded}
              className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                requiredUploaded
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              Analizi Başlat
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
