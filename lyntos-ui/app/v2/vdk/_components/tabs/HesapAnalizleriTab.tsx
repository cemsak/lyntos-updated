'use client';

/**
 * Hesap Analizleri Tab
 * Kategori bazli tum hesap kontrolleri
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { VdkFullAnalysisData } from '../../../_hooks/useVdkFullAnalysis';
import { KATEGORI_LABELS, getScoreColor } from '../../../_hooks/useVdkFullAnalysis';
import { KontrolCard } from './KontrolCard';

interface HesapAnalizleriTabProps {
  data: VdkFullAnalysisData;
}

export default function HesapAnalizleriTab({ data }: HesapAnalizleriTabProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['likidite', 'ortaklar'])
  );

  const categories = data.category_analysis || {};

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Kategorileri kritik/uyari sayisina gore sirala
  const sortedCategories = Object.entries(categories)
    .map(([id, cat]) => ({ id, ...cat }))
    .sort((a, b) => {
      const aScore = (a.kritik_sayisi || 0) * 100 + (a.uyari_sayisi || 0) * 10;
      const bScore = (b.kritik_sayisi || 0) * 100 + (b.uyari_sayisi || 0) * 10;
      return bScore - aScore;
    });

  return (
    <div className="space-y-4">
      {/* TTK 376 ve Ortulu Sermaye Ozet */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* TTK 376 */}
        {data.ttk_376 && (
          <Ttk376Card ttk376={data.ttk_376} />
        )}

        {/* Ortulu Sermaye */}
        {data.ortulu_sermaye && (
          <OrtuluSermayeCard ortulu={data.ortulu_sermaye} />
        )}
      </div>

      {/* Kategori Listeleri */}
      {sortedCategories.map((category) => {
        const isExpanded = expandedCategories.has(category.id);
        const kontroller = category.kontroller || [];
        const hasIssues = (category.kritik_sayisi || 0) > 0 || (category.uyari_sayisi || 0) > 0;

        return (
          <div
            key={category.id}
            className={`bg-white rounded-xl border overflow-hidden ${
              hasIssues ? 'border-[#FFE045]' : 'border-[#E5E5E5]'
            }`}
          >
            {/* Category Header */}
            <div
              className={`p-4 cursor-pointer flex items-center justify-between ${
                hasIssues ? 'bg-[#FFFBEB]' : 'bg-[#F5F6F8]'
              }`}
              onClick={() => toggleCategory(category.id)}
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-[#969696]" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-[#969696]" />
                )}
                <div>
                  <h3 className="font-semibold text-[#2E2E2E]">
                    {KATEGORI_LABELS[category.id] || category.kategori_adi || category.id}
                  </h3>
                  <div className="flex gap-3 text-sm mt-1">
                    {(category.kritik_sayisi || 0) > 0 && (
                      <span className="text-[#BF192B]">{category.kritik_sayisi} kritik</span>
                    )}
                    {(category.uyari_sayisi || 0) > 0 && (
                      <span className="text-[#FA841E]">{category.uyari_sayisi} uyari</span>
                    )}
                    {(category.normal_sayisi || 0) > 0 && (
                      <span className="text-[#00804D]">{category.normal_sayisi} normal</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-2xl font-bold ${getScoreColor(category.toplam_risk || 0)}`}>
                  {category.toplam_risk || 0}
                </span>
                <span className="text-sm text-[#969696]">/100</span>
              </div>
            </div>

            {/* Kontroller */}
            {isExpanded && kontroller.length > 0 && (
              <div className="p-4 space-y-3">
                {kontroller.map((kontrol, idx) => (
                  <KontrolCard key={idx} kontrol={kontrol} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// TTK 376 Summary Card
function Ttk376Card({ ttk376 }: { ttk376: NonNullable<VdkFullAnalysisData['ttk_376']> }) {
  return (
    <div
      className={`p-4 rounded-lg border ${
        ttk376.durum === 'BORCA_BATIK'
          ? 'bg-[#FEF2F2] border-[#FF9196]'
          : ttk376.durum === 'UCTE_IKI_KAYIP'
            ? 'bg-[#FFFBEB] border-[#FFE045]'
            : ttk376.durum === 'YARI_KAYIP'
              ? 'bg-[#FFFBEB] border-[#FFE045]'
              : 'bg-[#ECFDF5] border-[#6BDB83]'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-[#2E2E2E]">TTK 376 Sermaye Kaybi</h4>
        <span
          className={`text-sm font-semibold px-2 py-1 rounded ${
            ttk376.durum === 'NORMAL'
              ? 'bg-[#ECFDF5] text-[#00804D]'
              : ttk376.durum === 'YARI_KAYIP'
                ? 'bg-[#FFFBEB] text-[#FA841E]'
                : 'bg-[#FEF2F2] text-[#BF192B]'
          }`}
        >
          {ttk376.durum.replace('_', ' ')}
        </span>
      </div>
      <div className="text-2xl font-bold text-[#2E2E2E]">
        %{(ttk376.sermaye_kaybi_orani * 100).toFixed(1)}
      </div>
      <p className="text-sm text-[#5A5A5A] mt-2">{ttk376.aciklama}</p>
      {ttk376.aksiyon && (
        <div className="mt-2 text-sm font-medium text-[#BF192B]">
          Aksiyon: {ttk376.aksiyon}
        </div>
      )}
    </div>
  );
}

// Ortulu Sermaye Summary Card
function OrtuluSermayeCard({ ortulu }: { ortulu: NonNullable<VdkFullAnalysisData['ortulu_sermaye']> }) {
  return (
    <div
      className={`p-4 rounded-lg border ${
        ortulu.durum === 'SINIR_UZERINDE'
          ? 'bg-[#FEF2F2] border-[#FF9196]'
          : 'bg-[#ECFDF5] border-[#6BDB83]'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-[#2E2E2E]">Ortulu Sermaye (KVK 12)</h4>
        <span
          className={`text-sm font-semibold px-2 py-1 rounded ${
            ortulu.durum === 'SINIR_ALTINDA'
              ? 'bg-[#ECFDF5] text-[#00804D]'
              : 'bg-[#FEF2F2] text-[#BF192B]'
          }`}
        >
          {ortulu.durum.replace('_', ' ')}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-[#969696]">Sinir (3x Ozkaynak)</div>
          <div className="font-semibold">
            {ortulu.sinir.toLocaleString('tr-TR')} TL
          </div>
        </div>
        <div>
          <div className="text-[#969696]">Iliskili Borc</div>
          <div className="font-semibold">
            {ortulu.iliskili_borc.toLocaleString('tr-TR')} TL
          </div>
        </div>
      </div>
      {ortulu.kkeg_tutari > 0 && (
        <div className="mt-2 text-sm font-medium text-[#BF192B]">
          KKEG: {ortulu.kkeg_tutari.toLocaleString('tr-TR')} TL
        </div>
      )}
    </div>
  );
}
