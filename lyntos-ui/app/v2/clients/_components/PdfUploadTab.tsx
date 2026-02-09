import React, { useState, useCallback } from 'react';
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { VergiLevhasiData } from '../_types/client';

interface PdfUploadTabProps {
  pdfFiles: File[];
  pdfLoading: boolean;
  parsedPdfData: VergiLevhasiData[];
  onPdfFiles: (files: File[]) => void;
}

export function PdfUploadTab({
  pdfFiles,
  pdfLoading,
  parsedPdfData,
  onPdfFiles,
}: PdfUploadTabProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handlePdfFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onPdfFiles(files);
  }, [onPdfFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    onPdfFiles(files);
  }, [onPdfFiles]);

  return (
    <div className="space-y-4">
      <div className="bg-[#ECFDF5] border border-[#AAE8B8] rounded-lg p-3">
        <p className="text-sm text-[#00804D]">
          Vergi Levhası PDF dosyalarını sürükleyip bırakın veya seçin. Sistem otomatik olarak VKN, Unvan ve diğer bilgileri okuyacak.
        </p>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging
            ? 'border-[#0078D0] bg-[#E6F9FF] scale-[1.02]'
            : 'border-[#B4B4B4] hover:border-[#00B4EB]'
        }`}
      >
        <input
          type="file"
          accept=".pdf"
          multiple
          onChange={handlePdfFileChange}
          className="hidden"
          id="pdf-file-input"
        />
        <label
          htmlFor="pdf-file-input"
          className="cursor-pointer flex flex-col items-center"
        >
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
            isDragging ? 'bg-[#E6F9FF]' : 'bg-[#F5F6F8]'
          }`}>
            <Upload className={`w-8 h-8 ${isDragging ? 'text-[#0078D0]' : 'text-[#969696]'}`} />
          </div>
          <span className="text-sm font-medium text-[#5A5A5A]">
            {pdfFiles.length > 0
              ? `${pdfFiles.length} dosya seçildi`
              : isDragging
              ? 'Dosyaları buraya bırakın'
              : 'PDF dosyalarını sürükleyin veya tıklayın'}
          </span>
          <span className="text-xs text-[#969696] mt-1">
            Tek veya çoklu Vergi Levhası PDF yükleyebilirsiniz
          </span>
        </label>
      </div>

      {pdfLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-[#0078D0]" />
          <span className="ml-2 text-sm text-[#5A5A5A]">PDF&apos;ler okunuyor...</span>
        </div>
      )}

      {parsedPdfData.length > 0 && !pdfLoading && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-[#F5F6F8] px-3 py-2 border-b">
            <span className="text-sm font-medium text-[#5A5A5A]">
              Okunan Vergi Levhaları ({parsedPdfData.filter(p => p.valid).length} geçerli / {parsedPdfData.length} toplam)
            </span>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {parsedPdfData.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between px-3 py-2 border-b last:border-0 ${
                  item.valid ? 'bg-white' : 'bg-[#FFFBEB]'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#2E2E2E] truncate">
                    {item.unvan}
                  </p>
                  <p className="text-xs text-[#969696]">
                    {item.vkn ? `VKN: ${item.vkn}` : 'VKN okunamadı'}
                    {item.vergiDairesi && ` • ${item.vergiDairesi}`}
                    {item.faaliyet && ` • ${item.faaliyet}`}
                  </p>
                </div>
                {item.valid ? (
                  <CheckCircle2 className="w-4 h-4 text-[#00A651] flex-shrink-0" />
                ) : (
                  <div className="flex items-center gap-1 text-[#FFB114]">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs">{item.error}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {parsedPdfData.length === 0 && !pdfLoading && (
        <div className="bg-[#F5F6F8] rounded-lg p-4">
          <p className="text-xs font-medium text-[#5A5A5A] mb-2">Desteklenen Format:</p>
          <ul className="text-xs text-[#969696] space-y-1">
            <li>• GİB (Gelir İdaresi Başkanlığı) Vergi Levhası PDF</li>
            <li>• Dijital imzalı veya e-imzalı PDF dosyaları</li>
            <li>• Taranmış PDF&apos;ler için metin tabanlı olmalı (görüntü değil)</li>
          </ul>
        </div>
      )}
    </div>
  );
}
