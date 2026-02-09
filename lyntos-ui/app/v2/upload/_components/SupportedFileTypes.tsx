'use client';

import React from 'react';
import { UPLOAD_DOC_CATEGORIES, MAX_ZIP_SIZE_MB, MAX_FILE_SIZE_MB } from '../constants';
import type { UploadDocTier } from '../constants';

const TIER_CONFIG: Record<UploadDocTier, {
  label: string;
  borderColor: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
}> = {
  zorunlu: {
    label: 'ZORUNLU BELGELER',
    borderColor: 'border-l-[#00A651]',
    dotColor: 'bg-[#00A651]',
    badgeBg: 'bg-[#ECFDF5]',
    badgeText: 'text-[#00804D]',
  },
  onerilen: {
    label: 'ÖNERİLEN',
    borderColor: 'border-l-[#0078D0]',
    dotColor: 'bg-[#0078D0]',
    badgeBg: 'bg-[#E6F9FF]',
    badgeText: 'text-[#0049AA]',
  },
  opsiyonel: {
    label: 'OPSİYONEL',
    borderColor: 'border-l-[#B4B4B4]',
    dotColor: 'bg-[#B4B4B4]',
    badgeBg: 'bg-[#F5F6F8]',
    badgeText: 'text-[#5A5A5A]',
  },
};

const TIER_ORDER: UploadDocTier[] = ['zorunlu', 'onerilen', 'opsiyonel'];

export function SupportedFileTypes() {
  const grouped = TIER_ORDER.map(tier => ({
    tier,
    config: TIER_CONFIG[tier],
    items: UPLOAD_DOC_CATEGORIES.filter(item => item.tier === tier),
  })).filter(group => group.items.length > 0);

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-xl p-6">
      <h3 className="font-semibold text-[#2E2E2E] mb-5">Desteklenen Belge Türleri</h3>

      <div className="space-y-5">
        {grouped.map(({ tier, config, items }) => (
          <div key={tier} className={`border-l-4 ${config.borderColor} pl-4`}>
            {/* Bölüm başlığı */}
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-xs font-semibold text-[#969696] uppercase tracking-wide">
                {config.label}
              </h4>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${config.badgeBg} ${config.badgeText}`}>
                {items.length}
              </span>
            </div>

            {/* Belge kartları */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-1.5 p-3 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] hover:bg-white transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${config.dotColor} flex-shrink-0`} />
                    <item.icon className="w-4 h-4 text-[#5A5A5A] flex-shrink-0" />
                    <span className="text-sm font-medium text-[#2E2E2E] truncate">{item.label}</span>
                  </div>
                  <p className="text-[11px] text-[#969696] leading-tight pl-5.5">
                    {item.description}
                  </p>
                  {item.subTypes && (
                    <p className="text-[10px] text-[#0049AA] pl-5.5">
                      {item.subTypes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-[#969696] mt-5 pt-3 border-t border-[#E5E5E5]">
        Formatlar: XLSX, XLS, CSV, XML, PDF &nbsp;|&nbsp;
        Maks. boyut: ZIP {MAX_ZIP_SIZE_MB}MB, Tekli {MAX_FILE_SIZE_MB}MB &nbsp;|&nbsp;
        Sistem dosya türünü otomatik algılar
      </p>
    </div>
  );
}
