'use client';

/**
 * KanitPaketiPopover
 * Popover showing evidence package status in the RightRail
 */

import React from 'react';
import Link from 'next/link';
import {
  X,
  Upload,
  CheckCircle2,
  Circle,
  FolderArchive,
} from 'lucide-react';
import type { BelgeTipi } from '../donem-verileri/types';
import { BELGE_TANIMLARI } from '../donem-verileri/types';

interface ZorunluBelge {
  tip: BelgeTipi;
  labelOverride?: string;
}

interface KanitPaketiPopoverProps {
  zorunluBelgeler: ZorunluBelge[];
  belgeDurumMap: Map<BelgeTipi, 'VAR' | 'EKSIK' | 'BEKLIYOR'>;
  kanitPaketiYuzde: number;
  onClose: () => void;
  onUploadClick?: (tip: BelgeTipi) => void;
}

export function KanitPaketiPopover({
  zorunluBelgeler,
  belgeDurumMap,
  kanitPaketiYuzde,
  onClose,
  onUploadClick,
}: KanitPaketiPopoverProps) {
  return (
    <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-[#E5E5E5] z-50 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5]">
        <h4 className="text-sm font-semibold text-[#2E2E2E]">
          Kanıt Paketi Durumu
        </h4>
        <button
          onClick={onClose}
          className="p-1 hover:bg-[#F5F6F8] rounded transition-colors"
        >
          <X className="w-4 h-4 text-[#969696]" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-3 border-b border-[#E5E5E5]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#969696]">Tamamlanma</span>
          <span className="text-xs font-semibold text-[#5A5A5A]">%{kanitPaketiYuzde}</span>
        </div>
        <div className="w-full h-2 bg-[#F5F6F8] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              kanitPaketiYuzde === 100 ? 'bg-[#00A651]' : 'bg-[#FFB114]'
            }`}
            style={{ width: `${kanitPaketiYuzde}%` }}
          />
        </div>
      </div>

      {/* Belge listesi */}
      <div className="max-h-48 overflow-y-auto">
        {zorunluBelgeler.map(({ tip, labelOverride }, idx) => {
          const isVar = belgeDurumMap.get(tip) === 'VAR';
          const ad = labelOverride || BELGE_TANIMLARI[tip]?.ad || tip;

          return (
            <div
              key={tip}
              className={`flex items-center justify-between px-4 py-2 ${
                idx !== zorunluBelgeler.length - 1 ? 'border-b border-[#F5F6F8]' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {isVar ? (
                  <CheckCircle2 className="w-4 h-4 text-[#00A651]" />
                ) : (
                  <Circle className="w-4 h-4 text-[#B4B4B4]" />
                )}
                <span className={`text-sm ${isVar ? 'text-[#00804D]' : 'text-[#5A5A5A]'}`}>
                  {ad}
                </span>
              </div>
              {!isVar && onUploadClick && (
                <button
                  onClick={() => {
                    onUploadClick(tip);
                    onClose();
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#0049AA] hover:text-[#00287F] hover:bg-[#E6F9FF] rounded transition-colors"
                >
                  <Upload className="w-3 h-3" />
                  Yükle
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer link */}
      <Link
        href="/v2/reports/evidence"
        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F5F6F8] border-t border-[#E5E5E5] rounded-b-lg text-xs text-[#0049AA] hover:text-[#00287F] hover:bg-[#F5F6F8] transition-colors"
      >
        <FolderArchive className="w-3.5 h-3.5" />
        Kanıt Paketi Sayfasına Git
      </Link>
    </div>
  );
}

export default KanitPaketiPopover;
