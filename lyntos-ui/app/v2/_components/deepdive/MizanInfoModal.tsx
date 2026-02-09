'use client';
import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  X,
} from 'lucide-react';
import { MIZAN_SMMM_INFO } from './mizanOmurgaConstants';

interface MizanInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MizanInfoModal({ isOpen, onClose }: MizanInfoModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleBackdropClick}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
        <div className="p-4 flex items-center justify-between bg-[#ECFDF5] border-b border-[#AAE8B8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#ECFDF5]">
              <BookOpen className="w-6 h-6 text-[#00A651]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#00804D]">{MIZAN_SMMM_INFO.title}</h2>
              <p className="text-sm text-[#5A5A5A]">{MIZAN_SMMM_INFO.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#969696] hover:text-[#5A5A5A]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <h3 className="text-sm font-semibold text-[#5A5A5A] mb-2">Mizan Analizi Nedir?</h3>
            <ul className="space-y-2">
              {MIZAN_SMMM_INFO.context.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#5A5A5A]">
                  <CheckCircle2 className="w-4 h-4 text-[#00A651] flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#5A5A5A] mb-2">VDK Risk Kriterleri</h3>
            <div className="space-y-2">
              {MIZAN_SMMM_INFO.vdkKriterleri.map((kriter, i) => (
                <div key={i} className="text-sm text-[#5A5A5A] pl-4 border-l-2 border-[#FF9196] bg-[#FEF2F2] p-2 rounded-r">
                  <span className="font-mono text-[#BF192B] text-xs mr-2">{kriter.kod}</span>
                  {kriter.aciklama}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#ECFDF5] border border-[#AAE8B8] rounded-lg p-3">
            <h3 className="text-sm font-semibold text-[#00804D] mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              SMMM/YMM Olarak Ne Yapmalısınız?
            </h3>
            <ul className="space-y-1">
              {MIZAN_SMMM_INFO.actions.map((action, i) => (
                <li key={i} className="text-sm text-[#5A5A5A] pl-4 border-l-2 border-[#6BDB83]">
                  {action}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-[#E5E5E5] flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-[#00A651] text-white rounded-lg hover:bg-[#00804D] transition-colors">
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
}
