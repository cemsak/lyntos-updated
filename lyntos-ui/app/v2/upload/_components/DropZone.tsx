'use client';

import React, { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import type { UploadMode } from '../types';

interface DropZoneProps {
  mode: UploadMode;
  onFileSelect: (file: File) => void;
}

export function DropZone({ mode, onFileSelect }: DropZoneProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-xl p-12 text-center transition-all
        ${dragActive
          ? 'border-[#0078D0] bg-[#E6F9FF]'
          : 'border-[#B4B4B4] hover:border-[#00B4EB] bg-white'
        }
      `}
    >
      <Upload className="w-12 h-12 text-[#969696] mx-auto mb-4" />
      <h3 className="text-lg font-medium text-[#5A5A5A] mb-2">
        {mode === 'zip' ? 'ZIP dosyan\u0131z\u0131 s\u00FCr\u00FCkleyin' : 'Dosyalar\u0131n\u0131z\u0131 s\u00FCr\u00FCkleyin'}
      </h3>
      <p className="text-sm text-[#969696] mb-4">
        veya dosya se&#231;mek i&#231;in t&#305;klay&#305;n
      </p>
      <input
        type="file"
        accept={mode === 'zip' ? '.zip' : '.xlsx,.xls,.csv,.pdf,.xml,.zip,.txt,.json'}
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <p className="text-xs text-[#969696]">
        {mode === 'zip'
          ? 'Desteklenen: ZIP (maks. 200MB)'
          : 'Desteklenen: XLSX, XLS, CSV, PDF, XML, TXT, JSON (maks. 50MB/dosya)'
        }
      </p>
    </div>
  );
}
