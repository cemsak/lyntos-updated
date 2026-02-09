'use client';

import React from 'react';
import { X, AlertTriangle, Shield } from 'lucide-react';
import { KURGAN_SMMM_INFO } from './kurganAlertHelpers';

interface KurganInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KurganInfoModal({ isOpen, onClose }: KurganInfoModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="p-4 flex items-center justify-between bg-[#FEF2F2] border-b border-[#FFC7C9]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#FEF2F2]">
              <Shield className="w-6 h-6 text-[#BF192B]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#980F30]">{KURGAN_SMMM_INFO.title}</h2>
              <p className="text-sm text-[#5A5A5A]">{KURGAN_SMMM_INFO.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#969696] hover:text-[#5A5A5A]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* System Status Banner */}
          <div className="bg-[#FEF2F2] border border-[#FF9196] rounded-lg p-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#BF192B] flex-shrink-0" />
            <p className="text-sm font-medium text-[#980F30]">
              KURGAN sistemi 1 Ekim 2025 itibariyle AKTIF! "Bilmiyordum" savunmasi gecersiz.
            </p>
          </div>

          {/* Context */}
          <div>
            <h3 className="text-sm font-semibold text-[#5A5A5A] mb-2">KURGAN Hakkinda</h3>
            <ul className="space-y-2">
              {KURGAN_SMMM_INFO.context.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#5A5A5A]">
                  <Shield className="w-4 h-4 text-[#F0282D] flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Aksiyon Tipleri */}
          <div>
            <h3 className="text-sm font-semibold text-[#5A5A5A] mb-2">Aksiyon Tipleri</h3>
            <div className="space-y-2">
              {KURGAN_SMMM_INFO.aksiyonlar.map((aksiyon, i) => (
                <div key={i} className={`p-2 rounded text-sm ${aksiyon.color}`}>
                  <div className="flex items-center justify-between">
                    <strong>{aksiyon.tip.replace('_', ' ')}</strong>
                    <span className="text-xs">{aksiyon.sure}</span>
                  </div>
                  <p className="text-xs mt-1 opacity-80">{aksiyon.aciklama}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-[#FEF2F2] border border-[#FFC7C9] rounded-lg p-3">
            <h3 className="text-sm font-semibold text-[#980F30] mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              SMMM Olarak Ne Yapmalisiniz?
            </h3>
            <ul className="space-y-1">
              {KURGAN_SMMM_INFO.actions.map((action, i) => (
                <li key={i} className="text-sm text-[#5A5A5A] pl-4 border-l-2 border-[#FF9196]">
                  {action}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E5E5E5] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#BF192B] text-white rounded-lg hover:bg-[#BF192B] transition-colors"
          >
            Anladim
          </button>
        </div>
      </div>
    </div>
  );
}
