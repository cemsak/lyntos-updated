import React from 'react';
import { Upload, CheckCircle, FileText, AlertCircle, Loader2 } from 'lucide-react';
import type { PipelinePhase, IngestResult } from './uploadModalTypes';

interface UploadContentProps {
  uploaded: boolean;
  uploading: boolean;
  selectedFile: File | null;
  validationError: string | null;
  uploadError: string | null;
  ingestResult: IngestResult | null;
  pipelinePhase: PipelinePhase;
  onFileSelect: () => void;
  onUpload: () => void;
}

export function UploadContent({
  uploaded,
  uploading,
  selectedFile,
  validationError,
  uploadError,
  ingestResult,
  pipelinePhase,
  onFileSelect,
  onUpload,
}: UploadContentProps) {
  return (
    <div className="border-2 border-dashed border-[#E5E5E5] rounded-lg p-8 text-center">
      {uploaded ? (
        <div className="flex flex-col items-center">
          <CheckCircle className="w-12 h-12 text-[#00A651] mb-2" />
          <p className="text-[#00804D] font-medium">Dosya yüklendi!</p>
          {ingestResult && (
            <p className="text-sm text-[#969696] mt-1">
              {ingestResult.statistics.new_files ?? ingestResult.statistics.processable_files ?? 0} dosya işlendi
              {(ingestResult.statistics.total_parsed_rows ?? 0) > 0 &&
                ` • ${(ingestResult.statistics.total_parsed_rows ?? 0).toLocaleString('tr-TR')} satır`}
            </p>
          )}
        </div>
      ) : uploading ? (
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-[#0078D0] animate-spin mb-2" />
          <p className="text-[#5A5A5A]">
            {pipelinePhase === 'uploading' ? 'ZIP yükleniyor...' : 'Parse ediliyor ve analiz ediliyor...'}
          </p>
          <p className="text-xs text-[#969696] mt-1">Duplicate kontrolü yapılıyor</p>
        </div>
      ) : selectedFile ? (
        <div className="flex flex-col items-center">
          <FileText className="w-12 h-12 text-[#0078D0] mb-2" />
          <p className="text-[#5A5A5A] font-medium mb-1">{selectedFile.name}</p>
          <p className="text-[#969696] text-sm mb-4">
            {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
          </p>
          <div className="flex gap-2">
            <button
              onClick={onFileSelect}
              className="px-3 py-1.5 text-sm border border-[#B4B4B4] text-[#5A5A5A] rounded-lg hover:bg-[#F5F6F8] transition-colors"
            >
              Değiştir
            </button>
            <button
              onClick={onUpload}
              className="px-4 py-1.5 text-sm bg-[#0049AA] text-white rounded-lg hover:bg-[#0049AA] transition-colors"
            >
              Yükle
            </button>
          </div>
        </div>
      ) : (
        <>
          <Upload className="w-12 h-12 text-[#969696] mx-auto mb-2" />
          <p className="text-[#5A5A5A] mb-4">
            Dosyayı sürükleyin veya seçin
          </p>
          {validationError && (
            <p className="text-[#F0282D] text-sm mb-3">{validationError}</p>
          )}
          {uploadError && (
            <div className="flex items-center gap-2 text-[#F0282D] text-sm mb-3 justify-center">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
          <button
            onClick={onFileSelect}
            className="px-4 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#0049AA] transition-colors"
          >
            Dosya Seç
          </button>
        </>
      )}
    </div>
  );
}
