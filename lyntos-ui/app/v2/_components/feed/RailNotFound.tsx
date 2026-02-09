'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface RailNotFoundProps {
  closeButtonRef: React.RefObject<HTMLButtonElement>;
  onClose: () => void;
}

export function RailNotFound({ closeButtonRef, onClose }: RailNotFoundProps) {
  return (
          <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
    <button
      ref={closeButtonRef}
      onClick={onClose}
      className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[#F5F6F8] text-[#969696] hover:text-[#5A5A5A] transition-colors"
      aria-label="Kapat"
    >
      <X className="w-5 h-5" />
    </button>

    <div className="w-16 h-16 rounded-full bg-[#F5F6F8] flex items-center justify-center mb-4">
      <AlertTriangle className="w-8 h-8 text-[#969696]" />
    </div>
    <h3 className="text-lg font-semibold text-[#5A5A5A] mb-2">
      Kart Bulunamadı
    </h3>
    <p className="text-sm text-[#969696] mb-6 max-w-xs">
      Seçilen kart bulunamadı. Dönem veya mükellef değişmiş olabilir.
    </p>
    <button
      onClick={onClose}
      className="flex items-center gap-2 px-4 py-2 bg-[#F5F6F8] text-[#5A5A5A] rounded-lg hover:bg-[#E5E5E5] transition-colors text-sm font-medium"
    >
      <X className="w-4 h-4" />
      Kapat
    </button>
          </div>
  );
}
