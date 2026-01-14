'use client';

/**
 * Kanıt Paketi (Evidence Bundle) Sayfası
 * Sprint 1.2 - Stub Page
 *
 * Denetim dosyası ve kanıt paketi yönetimi
 */

import React from 'react';
import { FolderArchive, Download, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const BUNDLE_SECTIONS = [
  {
    id: 'mizan',
    title: 'Mizan ve Defterler',
    status: 'complete',
    files: 4,
  },
  {
    id: 'beyan',
    title: 'Beyannameler',
    status: 'complete',
    files: 6,
  },
  {
    id: 'mutabakat',
    title: 'Mutabakat Belgeleri',
    status: 'partial',
    files: 2,
  },
  {
    id: 'fatura',
    title: 'E-Fatura / E-Arşiv',
    status: 'pending',
    files: 0,
  },
  {
    id: 'banka',
    title: 'Banka Ekstreleri',
    status: 'pending',
    files: 0,
  },
];

const STATUS_CONFIG = {
  complete: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Tamamlandı' },
  partial: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Eksik' },
  pending: { icon: AlertCircle, color: 'text-slate-400', bg: 'bg-slate-100', label: 'Bekliyor' },
};

export default function EvidenceBundlePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kanıt Paketi</h1>
          <p className="text-slate-600 mt-1">
            Denetim hazırlık dosyası ve kanıt dokümantasyonu
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          <Download className="w-4 h-4" />
          ZIP İndir
        </button>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Dosya Durumu</h2>
          <span className="text-sm text-slate-500">12 / 20 belge tamamlandı</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full" style={{ width: '60%' }} />
        </div>
        <p className="text-sm text-slate-500 mt-2">
          Eksik belgeler tamamlandığında kanıt paketi oluşturulabilir.
        </p>
      </div>

      {/* Sections */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Belge Kategorileri</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {BUNDLE_SECTIONS.map((section) => {
            const statusConfig = STATUS_CONFIG[section.status as keyof typeof STATUS_CONFIG];
            const StatusIcon = statusConfig.icon;
            return (
              <div key={section.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg ${statusConfig.bg} flex items-center justify-center`}>
                    <FolderArchive className={`w-5 h-5 ${statusConfig.color}`} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{section.title}</p>
                    <p className="text-sm text-slate-500">{section.files} dosya</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                  <span className={`text-sm ${statusConfig.color}`}>{statusConfig.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-900">Kanıt Paketi Hakkında</p>
          <p className="text-sm text-blue-700 mt-1">
            Kanıt paketi, vergi incelemesi veya bağımsız denetim için gerekli tüm belgeleri
            organize edilmiş şekilde içerir. Her belge evidence_refs ile izlenebilir.
          </p>
        </div>
      </div>
    </div>
  );
}
