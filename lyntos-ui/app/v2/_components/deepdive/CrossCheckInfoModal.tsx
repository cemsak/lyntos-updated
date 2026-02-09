'use client';
import React from 'react';
import { X, CheckCircle2, AlertTriangle, BookOpen } from 'lucide-react';
import { CROSS_CHECK_SMMM_INFO } from './crosscheck-constants';

export function CrossCheckInfoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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
        <div className="p-4 flex items-center justify-between bg-[#E6F9FF] border-b border-[#ABEBFF]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#E6F9FF]">
              <BookOpen className="w-6 h-6 text-[#0049AA]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#00287F]">{CROSS_CHECK_SMMM_INFO.title}</h2>
              <p className="text-sm text-[#5A5A5A]">{CROSS_CHECK_SMMM_INFO.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#969696] hover:text-[#5A5A5A]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Context */}
          <div>
            <h3 className="text-sm font-semibold text-[#5A5A5A] mb-2">Cross-Check Nasıl Çalışır?</h3>
            <ul className="space-y-2">
              {CROSS_CHECK_SMMM_INFO.context.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#5A5A5A]">
                  <CheckCircle2 className="w-4 h-4 text-[#0078D0] flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Fark Tipleri */}
          <div>
            <h3 className="text-sm font-semibold text-[#5A5A5A] mb-2">Fark Seviyeleri</h3>
            <div className="space-y-2">
              {CROSS_CHECK_SMMM_INFO.farkTipleri.map((fark, i) => (
                <div key={i} className={`p-2 rounded text-sm ${fark.color}`}>
                  <strong>{fark.level}:</strong> {fark.desc}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-3">
            <h3 className="text-sm font-semibold text-[#00287F] mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              SMMM Olarak Ne Yapmalısınız?
            </h3>
            <ul className="space-y-1">
              {CROSS_CHECK_SMMM_INFO.actions.map((action, i) => (
                <li key={i} className="text-sm text-[#5A5A5A] pl-4 border-l-2 border-[#5ED6FF]">
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
            className="px-4 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#0049AA] transition-colors"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
}
