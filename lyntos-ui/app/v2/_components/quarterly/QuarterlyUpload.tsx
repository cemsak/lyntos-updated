/**
 * LYNTOS Quarterly Upload Component
 * Surukle-birak ZIP upload
 */

'use client';

import React, { useCallback, useState } from 'react';
import { Upload, FileArchive, AlertCircle, CheckCircle2 } from 'lucide-react';

interface QuarterlyUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  isComplete: boolean;
}

export function QuarterlyUpload({ onFileSelect, isProcessing, isComplete }: QuarterlyUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    // Check if ZIP
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Sadece ZIP dosyasi kabul edilir.');
      return false;
    }

    // Check size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      setError('Dosya boyutu 100MB\'dan kucuk olmalidir.');
      return false;
    }

    setError(null);
    return true;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  if (isComplete) {
    return (
      <div className="border-2 border-green-500 border-dashed rounded-xl p-8 text-center bg-green-50">
        <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
        <h3 className="text-xl font-semibold text-green-700 mb-2">
          Analiz Tamamlandi
        </h3>
        <p className="text-green-600">
          Sonuclari asagida gorebilirsiniz.
        </p>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="border-2 border-blue-500 border-dashed rounded-xl p-8 text-center bg-blue-50">
        <div className="w-16 h-16 mx-auto mb-4 relative">
          <div className="absolute inset-0 border-4 border-blue-200 rounded-full" />
          <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin" />
        </div>
        <h3 className="text-xl font-semibold text-blue-700 mb-2">
          Analiz Yapiliyor...
        </h3>
        <p className="text-blue-600">
          Lutfen bekleyiniz.
        </p>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
        ${isDragging
          ? 'border-blue-500 bg-blue-50 scale-[1.02]'
          : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }
        ${error ? 'border-red-400 bg-red-50' : ''}
      `}
    >
      <input
        type="file"
        accept=".zip"
        onChange={handleFileInput}
        className="hidden"
        id="zip-upload"
      />

      <label htmlFor="zip-upload" className="cursor-pointer block">
        {error ? (
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
        ) : isDragging ? (
          <Upload className="w-16 h-16 mx-auto text-blue-500 mb-4 animate-bounce" />
        ) : (
          <FileArchive className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        )}

        <h3 className={`text-xl font-semibold mb-2 ${error ? 'text-red-700' : 'text-gray-700'}`}>
          {error ? 'Hata' : isDragging ? 'Birakin!' : 'Donem ZIP Dosyasini Yukleyin'}
        </h3>

        <p className={`mb-4 ${error ? 'text-red-600' : 'text-gray-500'}`}>
          {error || 'Q1.zip, Q2.zip, Q3.zip veya Q4.zip dosyasini buraya surukleyin'}
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Upload className="w-4 h-4" />
          <span>Dosya Sec</span>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Desteklenen: Mizan, Yevmiye, Kebir, e-Defter, KDV/Muhtasar/Gecici Vergi Beyannameleri, Banka Ekstreleri
        </p>
      </label>
    </div>
  );
}
