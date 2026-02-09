'use client';

import React from 'react';
import { BookOpen, Zap, ClipboardList } from 'lucide-react';
import type { EnrichedCrossCheck } from '../_types/crossCheck';
import { ROOT_CAUSE_CONFIG } from '../_types/crossCheck';

interface ActionTabProps {
  check: EnrichedCrossCheck;
}

const ROOT_CAUSE_GUIDANCE: Record<string, string> = {
  UYUMLU: 'Kontrol basarili - ek aksiyon gerekmez.',
  VERI_EKSIK: 'Eksik veriyi yukleyerek kontrolu tekrar calistirin.',
  YAPISAL_FARK: 'Yapisal fark tespit edildi. Mizan ve beyanname kayitlarini detayli karsilastirin.',
  ZAMANLAMA_FARKI: 'Donem sonu kayit tarihlerini kontrol edin. Cut-off farki olabilir.',
  HESAPLAMA_HATASI: 'Hesaplama veya yuvarlama hatasi olabilir. Kaynak belgeleri dogrulayin.',
  BILINMEYEN: 'Otomatik tespit yapilamadi. Kanit ve kaynak belgeleri inceleyerek manuel degerlendirme yapin.',
};

export function ActionTab({ check }: ActionTabProps) {
  return (
    <div className="space-y-6">
      {/* Recommendation from backend */}
      {check.recommendation ? (
        <div>
          <h4 className="text-xs font-semibold text-[#969696] uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            Sistem Onerisi
          </h4>
          <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-3 text-sm text-[#0049AA]">
            {check.recommendation}
          </div>
        </div>
      ) : (
        <div className="bg-[#F5F6F8] rounded-lg p-4 text-center">
          <BookOpen className="w-6 h-6 text-[#969696] mx-auto mb-2" />
          <p className="text-sm text-[#969696]">Bu kontrol icin otomatik oneri bulunmuyor.</p>
        </div>
      )}

      {/* Root cause-based guidance */}
      <div>
        <h4 className="text-xs font-semibold text-[#969696] uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" />
          Neden Bazli Yonlendirme
        </h4>
        <div className="bg-[#F5F6F8] rounded-lg p-3 text-sm text-[#5A5A5A]">
          <div className="flex items-start gap-2">
            <span className="px-2 py-0.5 bg-white rounded text-xs font-medium text-[#0049AA]">
              {ROOT_CAUSE_CONFIG[check.rootCause.neden].label}
            </span>
          </div>
          <p className="mt-2">{ROOT_CAUSE_GUIDANCE[check.rootCause.neden]}</p>
        </div>
      </div>

      {/* System message */}
      {check.message && (
        <div>
          <h4 className="text-xs font-semibold text-[#969696] uppercase tracking-wide mb-2">Sistem Mesaji</h4>
          <p className="text-sm text-[#5A5A5A] bg-[#F5F6F8] rounded-lg p-3">{check.message}</p>
        </div>
      )}

      {/* Create Task placeholder */}
      <div className="border-t border-[#E5E5E5] pt-4">
        <h4 className="text-xs font-semibold text-[#969696] uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <ClipboardList className="w-3.5 h-3.5" />
          Gorev Olustur
        </h4>
        <div className="bg-[#F5F6F8] rounded-lg p-4 border-2 border-dashed border-[#E5E5E5]">
          <p className="text-sm text-[#969696] text-center">
            Gorev yonetimi entegrasyonu yakin zamanda eklenecek.
          </p>
        </div>
      </div>
    </div>
  );
}
