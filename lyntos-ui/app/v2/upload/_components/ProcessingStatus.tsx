'use client';

import React from 'react';
import { Loader2, Clock } from 'lucide-react';
import type { UploadPhase } from '../types';

interface ProcessingStatusProps {
  phase: UploadPhase;
  progress: number;
  currentFile: string;
}

export function ProcessingStatus({ phase, progress, currentFile }: ProcessingStatusProps) {
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-xl p-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-[#E6F9FF] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#0078D0] animate-spin" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[#2E2E2E]">
            {phase === 'uploading' && 'Dosya Yükleniyor...'}
            {phase === 'processing' && 'Belgeler İşleniyor...'}
          </h3>
          <p className="text-sm text-[#969696]">{currentFile}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[#5A5A5A]">\u0130lerleme</span>
          <span className="font-medium text-[#2E2E2E]">%{Math.round(progress)}</span>
        </div>
        <div className="w-full bg-[#E5E5E5] rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#0078D0] to-[#0049AA] h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 text-sm text-[#5A5A5A]">
        <Clock className="w-4 h-4 inline mr-1" />
        Belgeler sınıflandırılıyor ve veritabanına kaydediliyor...
      </div>
    </div>
  );
}
