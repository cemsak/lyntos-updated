'use client';
import React from 'react';
import { useDashboardScope } from '../scope/ScopeProvider';
import { Badge } from '../shared/Badge';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
}

export function PdfPreviewModal({ isOpen, onClose, onExport }: PdfPreviewModalProps) {
  const { scope } = useDashboardScope();

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const reportSections = [
    { name: 'Genel Bilgiler', icon: 'i', included: true },
    { name: 'KPI Özeti (8 gösterge)', icon: 'K', included: true },
    { name: 'VDK Risk Analizi (13 kriter)', icon: 'R', included: true },
    { name: 'Çapraz Kontrol Sonuçları', icon: 'C', included: true },
    { name: 'Mizan Analizi', icon: 'M', included: true },
    { name: 'Enflasyon Muhasebesi', icon: 'E', included: true },
    { name: 'Eksik Veri Listesi', icon: '!', included: true },
    { name: 'Yasal Dayanaklar', icon: 'Y', included: true },
    { name: 'Kanit Dosyalari Listesi', icon: 'D', included: true },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-preview-modal-title"
        className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden"
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E5E5] bg-[#F5F6F8]">
          <h2 id="pdf-preview-modal-title" className="text-lg font-semibold text-[#2E2E2E]">PDF Rapor Önizleme</h2>
          <p className="text-xs text-[#969696] mt-0.5">Rapor içeriğini gözden geçirin</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Report Info */}
          <div className="p-4 bg-[#F5F6F8] rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[#969696]">Mükellef</p>
                <p className="font-medium text-[#2E2E2E]">{scope.client_id || '—'}</p>
              </div>
              <div>
                <p className="text-[#969696]">Dönem</p>
                <p className="font-medium text-[#2E2E2E]">{scope.period || '—'}</p>
              </div>
              <div>
                <p className="text-[#969696]">SMMM</p>
                <p className="font-medium text-[#2E2E2E]">{scope.smmm_id || '—'}</p>
              </div>
              <div>
                <p className="text-[#969696]">Oluşturma Tarihi</p>
                <p className="font-medium text-[#2E2E2E]">{new Date().toLocaleDateString('tr-TR')}</p>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div>
            <p className="text-sm font-medium text-[#5A5A5A] mb-2">Rapor İçeriği</p>
            <div className="space-y-2">
              {reportSections.map((section, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-[#F5F6F8] rounded">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center bg-[#E5E5E5] rounded text-xs font-bold text-[#5A5A5A]">
                      {section.icon}
                    </span>
                    <span className="text-sm text-[#5A5A5A]">{section.name}</span>
                  </div>
                  <Badge variant="success">Dahil</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Meta Info */}
          <div className="p-3 bg-[#E6F9FF] rounded-lg border border-[#E6F9FF]">
            <p className="text-xs text-[#00287F]">
              i PDF raporu <strong>rulepack_version</strong>, <strong>inputs_hash</strong> ve
              <strong> oluşturma zamanı</strong> bilgilerini içerecektir. Bu bilgiler
              raporun bütünlüğünü ve izlenebilirliğini sağlar.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E5E5E5] bg-[#F5F6F8] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#5A5A5A] hover:text-[#2E2E2E] transition-colors"
          >
            İptal
          </button>
          <button
            onClick={() => {
              onExport();
              onClose();
            }}
            className="px-6 py-2 text-sm bg-[#0049AA] text-white rounded-lg hover:bg-[#0049AA] transition-colors flex items-center gap-2"
          >
            <span>PDF</span>
            Oluştur ve İndir
          </button>
        </div>
      </div>
    </div>
  );
}
