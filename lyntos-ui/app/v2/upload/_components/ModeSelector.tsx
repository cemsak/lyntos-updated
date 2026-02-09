'use client';

import React from 'react';
import {
  FileArchive,
  Files,
  CheckCircle2,
} from 'lucide-react';
import type { UploadMode } from '../types';

interface ModeSelectorProps {
  mode: UploadMode;
  onModeSelect: (mode: UploadMode) => void;
}

export function ModeSelector({ mode, onModeSelect }: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button
        onClick={() => onModeSelect('zip')}
        className={`
          relative p-6 rounded-xl border-2 transition-all text-left
          ${mode === 'zip'
            ? 'border-[#0078D0] bg-[#E6F9FF] ring-2 ring-[#ABEBFF]'
            : 'border-[#E5E5E5] bg-white hover:border-[#5ED6FF] hover:shadow-md'
          }
        `}
      >
        {mode === 'zip' && (
          <div className="absolute top-3 right-3">
            <CheckCircle2 className="w-5 h-5 text-[#0049AA]" />
          </div>
        )}
        <div className="w-12 h-12 rounded-xl bg-[#E6F9FF] flex items-center justify-center mb-4">
          <FileArchive className="w-6 h-6 text-[#0049AA]" />
        </div>
        <h3 className="font-semibold text-[#2E2E2E] mb-1">Toplu Paket (ZIP)</h3>
        <p className="text-sm text-[#969696]">
          Tüm dönem belgelerini tek dosyada yükleyin. En hızlı yöntem.
        </p>
        <div className="mt-3 flex items-center gap-1 text-xs text-[#0049AA]">
          <span className="font-medium">Önerilen</span>
          <span className="px-1.5 py-0.5 bg-[#E6F9FF] rounded">En Hızlı</span>
        </div>
      </button>

      <button
        onClick={() => onModeSelect('multi')}
        className={`
          relative p-6 rounded-xl border-2 transition-all text-left
          ${mode === 'multi'
            ? 'border-[#0078D0] bg-[#E6F9FF] ring-2 ring-[#ABEBFF]'
            : 'border-[#E5E5E5] bg-white hover:border-[#5ED6FF] hover:shadow-md'
          }
        `}
      >
        {mode === 'multi' && (
          <div className="absolute top-3 right-3">
            <CheckCircle2 className="w-5 h-5 text-[#0049AA]" />
          </div>
        )}
        <div className="w-12 h-12 rounded-xl bg-[#E6F9FF] flex items-center justify-center mb-4">
          <Files className="w-6 h-6 text-[#0049AA]" />
        </div>
        <h3 className="font-semibold text-[#2E2E2E] mb-1">Çoklu Dosya</h3>
        <p className="text-sm text-[#969696]">
          Belgeleri tek tek sürükle-bırak ile yükleyin.
        </p>
        <div className="mt-3 flex items-center gap-1 text-xs text-[#969696]">
          <span>Birden fazla dosya destekli</span>
        </div>
      </button>
    </div>
  );
}
