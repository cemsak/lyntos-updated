'use client';
import React, { useState, useRef } from 'react';
import { X, Upload, CheckCircle, FileText } from 'lucide-react';
import { BELGE_TANIMLARI } from '../donem-verileri/types';
import type { BelgeTipi } from '../donem-verileri/types';
import { useToast } from '../shared/Toast';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  belgeTipi: BelgeTipi | null;
  onSuccess: (belgeTipi: BelgeTipi) => void;
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  if (!isOpen || !belgeTipi) return null;

  const belgeTanimi = BELGE_TANIMLARI[belgeTipi];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setValidationError(null);
    }
  };

  const handleUpload = async () => {
    // Validation: Check if file is selected
    if (!selectedFile) {
      setValidationError('Lütfen bir dosya seçin');
      return;
    }

    setValidationError(null);
    setUploading(true);

    // Simulate upload (in production, this would be actual API call)
    await new Promise(resolve => setTimeout(resolve, 1500));
    setUploading(false);
    setUploaded(true);

    setTimeout(() => {
      onSuccess(belgeTipi);
      showToast('success', `${belgeTanimi?.label_tr || belgeTipi} yüklendi`);
      handleClose();
    }, 1000);
  };

  const handleClose = () => {
    setUploaded(false);
    setUploading(false);
    setSelectedFile(null);
    setValidationError(null);
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
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">
            Belge Yukle: {belgeTanimi?.label_tr || belgeTipi}
          </h3>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        {belgeTanimi?.aciklama_tr && (
          <p className="text-sm text-slate-500 mb-4">{belgeTanimi.aciklama_tr}</p>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.xlsx,.xls,.xml,.zip"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Content */}
        <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
          {uploaded ? (
            <div className="flex flex-col items-center">
              <CheckCircle className="w-12 h-12 text-green-500 mb-2" />
              <p className="text-green-600 font-medium">Yükleme başarılı!</p>
            </div>
          ) : uploading ? (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-slate-600">Yükleniyor...</p>
            </div>
          ) : selectedFile ? (
            <div className="flex flex-col items-center">
              <FileText className="w-12 h-12 text-blue-500 mb-2" />
              <p className="text-slate-700 font-medium mb-1">{selectedFile.name}</p>
              <p className="text-slate-400 text-sm mb-4">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Değiştir
                </button>
                <button
                  onClick={handleUpload}
                  className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Yükle
                </button>
              </div>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-600 mb-4">
                Dosyayı sürükleyin veya seçin
              </p>
              {validationError && (
                <p className="text-red-500 text-sm mb-3">{validationError}</p>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Dosya Seç
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 text-xs text-slate-500">
          Desteklenen formatlar: PDF, XLSX, XML, ZIP
        </div>
      </div>
    </div>
  );
}
