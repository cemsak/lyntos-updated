'use client';

/**
 * EksikBelgelerPopover
 * Popover listing missing mandatory documents in the RightRail
 */

import React from 'react';
import {
  X,
  Upload,
  Circle,
} from 'lucide-react';
import type { BelgeTipi } from '../donem-verileri/types';

interface EksikBelge {
  tip: BelgeTipi;
  ad: string;
}

interface EksikBelgelerPopoverProps {
  belgeler: EksikBelge[];
  onClose: () => void;
  onUploadClick?: (tip: BelgeTipi) => void;
}

export function EksikBelgelerPopover({ belgeler, onClose, onUploadClick }: EksikBelgelerPopoverProps) {
  if (belgeler.length === 0) return null;

  return (
    <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-[#E5E5E5] z-50 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5]">
        <h4 className="text-sm font-semibold text-[#2E2E2E]">
          Eksik Zorunlu Belgeler ({belgeler.length})
        </h4>
        <button
          onClick={onClose}
          className="p-1 hover:bg-[#F5F6F8] rounded transition-colors"
        >
          <X className="w-4 h-4 text-[#969696]" />
        </button>
      </div>

      {/* Eksik belge listesi */}
      <div className="max-h-48 overflow-y-auto">
        {belgeler.map((belge, idx) => (
          <div
            key={belge.tip}
            className={`flex items-center justify-between px-4 py-2.5 hover:bg-[#F5F6F8] ${
              idx !== belgeler.length - 1 ? 'border-b border-[#F5F6F8]' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <Circle className="w-3 h-3 text-[#B4B4B4]" />
              <span className="text-sm text-[#5A5A5A]">{belge.ad}</span>
            </div>
            {onUploadClick && (
              <button
                onClick={() => {
                  onUploadClick(belge.tip);
                  onClose();
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#0049AA] hover:text-[#00287F] hover:bg-[#E6F9FF] rounded transition-colors"
              >
                <Upload className="w-3 h-3" />
                Yükle
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Footer uyarı */}
      <div className="px-4 py-2.5 bg-[#FEF2F2] border-t border-[#FEF2F2] rounded-b-lg">
        <p className="text-xs text-[#BF192B]">
          <strong>Uyarı:</strong> Zorunlu belgeler yüklenmeden tam analiz yapılamaz.
        </p>
      </div>
    </div>
  );
}

export default EksikBelgelerPopover;
