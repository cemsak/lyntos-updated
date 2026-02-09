import React from 'react';
import { Info, X, CheckCircle2 } from 'lucide-react';
import { VUK_GEC33_INFO } from './inflationTypes';

interface VukInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VukInfoModal({ isOpen, onClose }: VukInfoModalProps) {
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
        <div className="p-4 flex items-center justify-between bg-[#E6F9FF] border-b border-[#ABEBFF]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#E6F9FF]">
              <Info className="w-6 h-6 text-[#0049AA]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#00287F]">{VUK_GEC33_INFO.baslik}</h2>
              <p className="text-sm text-[#5A5A5A]">Enflasyon Düzeltmesi Mevzuatı</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#969696] hover:text-[#5A5A5A]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-[#5A5A5A]">{VUK_GEC33_INFO.açıklama}</p>

          <div>
            <h3 className="text-sm font-semibold text-[#5A5A5A] mb-2">Uygulama Koşulları</h3>
            <ul className="space-y-2">
              {VUK_GEC33_INFO.kosullar.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#5A5A5A]">
                  <CheckCircle2 className="w-4 h-4 text-[#00A651] flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#5A5A5A] mb-2">Düzeltme Yöntemi</h3>
            <ul className="space-y-1 text-sm text-[#5A5A5A]">
              {VUK_GEC33_INFO.yontem.map((item, i) => (
                <li key={i} className="pl-4 border-l-2 border-[#5ED6FF]">{item}</li>
              ))}
            </ul>
          </div>

          <div className="p-3 bg-[#FFFBEB] border border-[#FFF08C] rounded-lg">
            <h3 className="text-sm font-semibold text-[#E67324] mb-2">Dikkat Edilmesi Gerekenler</h3>
            <ul className="space-y-1 text-xs text-[#FA841E]">
              {VUK_GEC33_INFO.uyarilar.map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-[#E5E5E5] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#0049AA] transition-colors"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
}
