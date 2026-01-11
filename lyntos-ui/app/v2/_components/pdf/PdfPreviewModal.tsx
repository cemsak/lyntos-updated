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
    { name: 'KPI Ozeti (8 gosterge)', icon: 'K', included: true },
    { name: 'VDK Risk Analizi (13 kriter)', icon: 'R', included: true },
    { name: 'Capraz Kontrol Sonuclari', icon: 'C', included: true },
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-900">PDF Rapor Onizleme</h2>
          <p className="text-xs text-slate-500 mt-0.5">Rapor icerigini gozden gecirin</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Report Info */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Mukellef</p>
                <p className="font-medium text-slate-900">{scope.client_id || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500">Donem</p>
                <p className="font-medium text-slate-900">{scope.period || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500">SMMM</p>
                <p className="font-medium text-slate-900">{scope.smmm_id || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500">Olusturma Tarihi</p>
                <p className="font-medium text-slate-900">{new Date().toLocaleDateString('tr-TR')}</p>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Rapor Icerigi</p>
            <div className="space-y-2">
              {reportSections.map((section, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center bg-slate-200 rounded text-xs font-bold text-slate-600">
                      {section.icon}
                    </span>
                    <span className="text-sm text-slate-700">{section.name}</span>
                  </div>
                  <Badge variant="success">Dahil</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Meta Info */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-800">
              i PDF raporu <strong>rulepack_version</strong>, <strong>inputs_hash</strong> ve
              <strong> olusturma zamani</strong> bilgilerini icerecektir. Bu bilgiler
              raporun butunlugunu ve izlenebilirligini saglar.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
          >
            Iptal
          </button>
          <button
            onClick={() => {
              onExport();
              onClose();
            }}
            className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span>PDF</span>
            Olustur ve Indir
          </button>
        </div>
      </div>
    </div>
  );
}
