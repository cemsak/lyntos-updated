import React from 'react';
import { BarChart3 } from 'lucide-react';
import type { BundleSection } from './types';

interface ProgressSectionProps {
  sections: BundleSection[];
  totalFiles: number;
  hasData: boolean;
  progress: number;
}

export function ProgressSection({ sections, totalFiles, hasData, progress }: ProgressSectionProps) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#2E2E2E] flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#0049AA]" />
          Tamamlanma Durumu
        </h2>
        <span className="text-sm text-[#969696]">
          {hasData ? `%${Math.round(progress)} tamamlandı` : 'Veri bekleniyor'}
        </span>
      </div>
      <div className="w-full h-3 bg-[#F5F6F8] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#0078D0] to-[#00A651] rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid grid-cols-4 gap-4 mt-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-[#00804D]">
            {sections.filter(s => s.status === 'complete').length}
          </p>
          <p className="text-xs text-[#969696]">Tamamlanan Bölüm</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-[#FA841E]">
            {sections.filter(s => s.status === 'partial').length}
          </p>
          <p className="text-xs text-[#969696]">Eksik Bölüm</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-[#969696]">
            {sections.filter(s => s.status === 'pending').length}
          </p>
          <p className="text-xs text-[#969696]">Bekleyen Bölüm</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-[#0049AA]">{totalFiles}</p>
          <p className="text-xs text-[#969696]">Toplam Dosya</p>
        </div>
      </div>
    </div>
  );
}
