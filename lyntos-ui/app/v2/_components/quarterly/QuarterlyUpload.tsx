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
      <div className="border-2 border-[#00A651] border-dashed rounded-xl p-8 text-center bg-[#ECFDF5]">
        <CheckCircle2 className="w-16 h-16 mx-auto text-[#00A651] mb-4" />
        <h3 className="text-xl font-semibold text-[#00804D] mb-2">
          Analiz Tamamlandi
        </h3>
        <p className="text-[#00804D]">
          Sonuclari asagida gorebilirsiniz.
        </p>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="border-2 border-[#0078D0] border-dashed rounded-xl p-8 text-center bg-[#E6F9FF]">
        <div className="w-16 h-16 mx-auto mb-4 relative">
          <div className="absolute inset-0 border-4 border-[#ABEBFF] rounded-full" />
          <div className="absolute inset-0 border-4 border-[#0078D0] rounded-full border-t-transparent animate-spin" />
        </div>
        <h3 className="text-xl font-semibold text-[#0049AA] mb-2">
          Analiz Yapiliyor...
        </h3>
        <p className="text-[#0049AA]">
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
          ? 'border-[#0078D0] bg-[#E6F9FF] scale-[1.02]'
          : 'border-[#B4B4B4] hover:border-[#00B4EB] hover:bg-[#F5F6F8]'
        }
        ${error ? 'border-[#FF555F] bg-[#FEF2F2]' : ''}
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
          <AlertCircle className="w-16 h-16 mx-auto text-[#F0282D] mb-4" />
        ) : isDragging ? (
          <Upload className="w-16 h-16 mx-auto text-[#0078D0] mb-4 animate-bounce" />
        ) : (
          <FileArchive className="w-16 h-16 mx-auto text-[#969696] mb-4" />
        )}

        <h3 className={`text-xl font-semibold mb-2 ${error ? 'text-[#BF192B]' : 'text-[#5A5A5A]'}`}>
          {error ? 'Hata' : isDragging ? 'Birakin!' : 'Donem ZIP Dosyasini Yukleyin'}
        </h3>

        <p className={`mb-4 ${error ? 'text-[#BF192B]' : 'text-[#969696]'}`}>
          {error || 'Q1.zip, Q2.zip, Q3.zip veya Q4.zip dosyasini buraya surukleyin'}
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#0049AA] transition-colors">
          <Upload className="w-4 h-4" />
          <span>Dosya Sec</span>
        </div>

        <p className="mt-4 text-xs text-[#969696]">
          Desteklenen: Mizan, Yevmiye, Kebir, e-Defter, KDV/Muhtasar/Gecici Vergi Beyannameleri, Banka Ekstreleri
        </p>
      </label>
    </div>
  );
}
