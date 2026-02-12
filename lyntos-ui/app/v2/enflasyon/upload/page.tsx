'use client';

import React, { useState, useCallback, useRef } from 'react';
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
import { api } from '../../_lib/api/client';
import { API_ENDPOINTS } from '../../_lib/config/api';
import { useToast } from '../../_components/shared/Toast';

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
  const { showToast } = useToast();
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFile>>({});
  const [dragOver, setDragOver] = useState<string | null>(null);
  const abortControllers = useRef<Record<string, AbortController>>({});

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

    const controller = new AbortController();
    abortControllers.current[documentId] = controller;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', documentId);

    // Real API upload via centralized client
    api.post(API_ENDPOINTS.upload, formData, { signal: controller.signal })
      .then(({ ok, error: apiErr }) => {
        if (ok) {
          setUploadedFiles(prev => ({
            ...prev,
            [documentId]: {
              ...prev[documentId],
              status: 'success',
              progress: 100,
            },
          }));
          showToast('success', `${file.name} başarıyla yüklendi`);
        } else {
          setUploadedFiles(prev => ({
            ...prev,
            [documentId]: {
              ...prev[documentId],
              status: 'error',
              progress: 0,
              errorMessage: apiErr || 'Yükleme başarısız',
            },
          }));
          showToast('error', `Yükleme başarısız: ${apiErr}`);
        }
      })
      .catch((error: Error) => {
        if (error.name === 'AbortError') return;
        setUploadedFiles(prev => ({
          ...prev,
          [documentId]: {
            ...prev[documentId],
            status: 'error',
            progress: 0,
            errorMessage: error.message || 'Yükleme başarısız',
          },
        }));
        showToast('error', `Yükleme başarısız: ${error.message}`);
      })
      .finally(() => {
        delete abortControllers.current[documentId];
      });

    // Progress estimation (since fetch doesn't support progress natively)
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 90) {
        clearInterval(interval);
        return;
      }
      setUploadedFiles(prev => {
        const current = prev[documentId];
        if (!current || current.status !== 'uploading') {
          clearInterval(interval);
          return prev;
        }
        return {
          ...prev,
          [documentId]: {
            ...current,
            progress: Math.min(progress, 90),
          },
        };
      });
    }, 300);
  }, [showToast]);

  const handleDrop = useCallback((documentId: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    handleFileSelect(documentId, e.dataTransfer.files);
  }, [handleFileSelect]);

  const removeFile = useCallback((documentId: string) => {
    // Abort in-progress upload if any
    const controller = abortControllers.current[documentId];
    if (controller) {
      controller.abort();
      delete abortControllers.current[documentId];
    }
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
    <div className="min-h-screen bg-[#F5F6F8]">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E5E5] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-[#F5F6F8] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#5A5A5A]" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-[#2E2E2E]">
                Yeniden Değerleme Belge Yükleme
              </h1>
              <p className="text-sm text-[#969696]">
                VUK Mükerrer 298/Ç Sürekli Yeniden Değerleme
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Info Banner */}
        <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#0049AA] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-[#00287F]">Yeniden Değerleme Belge Gereklilikleri</h3>
              <p className="text-sm text-[#0049AA] mt-1">
                VUK Mük. 298/Ç kapsamında sürekli yeniden değerleme uygulaması için
                gerekli belgeleri yükleyin. Sistem, amortismana tabi iktisadi kıymetlerin
                Yİ-ÜFE bazlı yeniden değerleme hesaplamalarını otomatik yapacaktır.
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
                    ? 'border-[#0078D0] ring-2 ring-[#ABEBFF]'
                    : 'border-[#E5E5E5]'
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
                        ? 'bg-[#ECFDF5]'
                        : 'bg-[#F5F6F8]'
                    }`}>
                      {uploaded?.status === 'success' ? (
                        <CheckCircle2 className="w-6 h-6 text-[#00804D]" />
                      ) : (
                        <Icon className="w-6 h-6 text-[#5A5A5A]" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-[#2E2E2E]">{doc.title}</h3>
                        {doc.required ? (
                          <span className="px-1.5 py-0.5 text-xs bg-[#FEF2F2] text-[#BF192B] rounded">
                            Zorunlu
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-xs bg-[#F5F6F8] text-[#5A5A5A] rounded">
                            Opsiyonel
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#969696] mt-1">{doc.description}</p>

                      {uploaded ? (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[#5A5A5A]">{uploaded.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[#969696]">
                                {formatFileSize(uploaded.size)}
                              </span>
                              {uploaded.status === 'success' && (
                                <button
                                  onClick={() => removeFile(doc.id)}
                                  className="p-1 hover:bg-[#F5F6F8] rounded"
                                >
                                  <X className="w-4 h-4 text-[#969696]" />
                                </button>
                              )}
                            </div>
                          </div>
                          {uploaded.status === 'uploading' && (
                            <div className="mt-2">
                              <div className="h-1.5 bg-[#E5E5E5] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#0049AA] rounded-full transition-all duration-300"
                                  style={{ width: `${uploaded.progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-3">
                          <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[#B4B4B4] rounded-lg cursor-pointer hover:border-[#00B4EB] hover:bg-[#E6F9FF] transition-colors">
                            <Upload className="w-5 h-5 text-[#969696]" />
                            <span className="text-sm text-[#5A5A5A]">
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
            className="px-4 py-2 text-sm text-[#5A5A5A] hover:text-[#2E2E2E]"
          >
            Geri Dön
          </button>

          <div className="flex items-center gap-3">
            <span className="text-sm text-[#969696]">
              {Object.values(uploadedFiles).filter(f => f.status === 'success').length} / {REQUIRED_DOCUMENTS.filter(d => d.required).length} zorunlu belge yüklendi
            </span>
            <button
              onClick={handleStartAnalysis}
              disabled={!requiredUploaded}
              className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                requiredUploaded
                  ? 'bg-[#0049AA] text-white hover:bg-[#0049AA]'
                  : 'bg-[#E5E5E5] text-[#969696] cursor-not-allowed'
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
