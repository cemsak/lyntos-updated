'use client';

/**
 * Kanit Paketi (Evidence Bundle) Sayfasi
 *
 * Denetim dosyasi ve kanit paketi yonetimi
 */

import React, { useState, useEffect } from 'react';
import { FolderArchive, Download, FileText, CheckCircle, Clock, AlertCircle, Loader2, Upload } from 'lucide-react';
import Link from 'next/link';
import { getAuthToken } from '../../_lib/auth';

interface BundleSection {
  id: string;
  title: string;
  status: 'complete' | 'partial' | 'pending';
  files: number;
}

interface BundleSummary {
  sections: BundleSection[];
  totalFiles: number;
  completedFiles: number;
}

const STATUS_CONFIG = {
  complete: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Tamamlandi' },
  partial: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Eksik' },
  pending: { icon: AlertCircle, color: 'text-slate-400', bg: 'bg-slate-100', label: 'Bekliyor' },
};

const DEFAULT_SECTIONS: BundleSection[] = [
  { id: 'mizan', title: 'Mizan ve Defterler', status: 'pending', files: 0 },
  { id: 'beyan', title: 'Beyannameler', status: 'pending', files: 0 },
  { id: 'mutabakat', title: 'Mutabakat Belgeleri', status: 'pending', files: 0 },
  { id: 'fatura', title: 'E-Fatura / E-Arsiv', status: 'pending', files: 0 },
  { id: 'banka', title: 'Banka Ekstreleri', status: 'pending', files: 0 },
];

export default function EvidenceBundlePage() {
  const [bundleData, setBundleData] = useState<BundleSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBundleData() {
      const token = getAuthToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/v1/contracts/evidence-bundle', {
          headers: { Authorization: token },
        });

        if (!response.ok) {
          setBundleData(null);
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        setBundleData(data);
      } catch {
        setBundleData(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBundleData();
  }, []);

  const sections = bundleData?.sections || DEFAULT_SECTIONS;
  const totalFiles = bundleData?.totalFiles || 0;
  const completedFiles = bundleData?.completedFiles || 0;
  const progress = totalFiles > 0 ? (completedFiles / totalFiles) * 100 : 0;
  const hasData = bundleData !== null && totalFiles > 0;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-slate-600">Yukleniyor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kanit Paketi</h1>
          <p className="text-slate-600 mt-1">
            Denetim hazirlik dosyasi ve kanit dokumantasyonu
          </p>
        </div>
        <button
          disabled={!hasData}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            hasData
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Download className="w-4 h-4" />
          ZIP Indir
        </button>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Dosya Durumu</h2>
          <span className="text-sm text-slate-500">
            {hasData ? `${completedFiles} / ${totalFiles} belge tamamlandi` : 'Veri bekleniyor'}
          </span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-slate-500 mt-2">
          {hasData
            ? 'Eksik belgeler tamamlandiginda kanit paketi olusturulabilir.'
            : 'Veri yukledikten sonra kanit paketi olusturulabilir.'}
        </p>
      </div>

      {/* Sections */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Belge Kategorileri</h2>
        </div>
        {!hasData ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <FolderArchive className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-600">Henuz belge yuklenmedi.</p>
            <p className="text-slate-400 text-sm mt-1">
              Veri yukleyerek kanit paketi olusturma surecini baslatin.
            </p>
            <Link
              href="/v2/upload"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Upload className="w-4 h-4" />
              Veri Yukle
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sections.map((section) => {
              const statusConfig = STATUS_CONFIG[section.status];
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
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-900">Kanit Paketi Hakkinda</p>
          <p className="text-sm text-blue-700 mt-1">
            Kanit paketi, vergi incelemesi veya bagimsiz denetim icin gerekli tum belgeleri
            organize edilmis sekilde icerir. Her belge evidence_refs ile izlenebilir.
          </p>
        </div>
      </div>
    </div>
  );
}
