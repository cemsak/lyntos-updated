'use client';

import React from 'react';
import { Upload, FileSpreadsheet, FileText, Database } from 'lucide-react';

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Veri Yükleme</h1>
        <p className="text-slate-600 mt-1">
          Muhasebe verilerinizi yükleyin ve analiz edin
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Mizan Upload */}
        <a
          href="/v2/enflasyon/upload"
          className="group p-6 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 group-hover:text-blue-600">
                Mizan Yükle
              </h3>
              <p className="text-sm text-slate-500">Excel veya CSV</p>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Dönem sonu mizan verilerinizi yükleyin. Enflasyon düzeltmesi ve risk analizi için gereklidir.
          </p>
        </a>

        {/* E-Defter Upload */}
        <div className="p-6 bg-white rounded-xl border border-slate-200 opacity-60">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-500">E-Defter</h3>
              <p className="text-sm text-slate-400">Yakın Zamanda</p>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            E-defter XML dosyalarınızı otomatik analiz. Yakın zamanda aktif olacak.
          </p>
        </div>

        {/* Banka Ekstresi */}
        <div className="p-6 bg-white rounded-xl border border-slate-200 opacity-60">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
              <Database className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-500">Banka Ekstresi</h3>
              <p className="text-sm text-slate-400">Yakın Zamanda</p>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Banka ekstrelerini yükleyin, otomatik mutabakat. Yakın zamanda aktif olacak.
          </p>
        </div>
      </div>

      {/* Drag & Drop Area */}
      <div className="mt-8">
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors">
          <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">
            Dosyalarınızı sürükleyin
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            veya dosya seçmek için tıklayın
          </p>
          <p className="text-xs text-slate-400">
            Desteklenen formatlar: XLSX, XLS, CSV (maks. 10MB)
          </p>
        </div>
      </div>

      {/* Analysis Preview Section */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* VDK Risk Analysis Preview */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🎯</span>
            <h3 className="font-semibold text-slate-700">VDK Risk Analizi</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Risk Skoru</span>
              <span className="text-slate-300">---/100</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Kritik Kriter</span>
              <span className="text-slate-300">---</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Öneri Sayısı</span>
              <span className="text-slate-300">---</span>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-3">📤 Mizan yüklendiğinde aktif olur</p>
        </div>

        {/* Mizan Analysis Preview */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📊</span>
            <h3 className="font-semibold text-slate-700">Mizan Analizi</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Denge Kontrolü</span>
              <span className="text-slate-300">---</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Kritik Hesaplar</span>
              <span className="text-slate-300">---</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Oran Analizleri</span>
              <span className="text-slate-300">---</span>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-3">📤 Mizan yüklendiğinde aktif olur</p>
        </div>

        {/* Tax Calculation Preview */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">💰</span>
            <h3 className="font-semibold text-slate-700">Vergi Hesaplamaları</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Kurumlar Vergisi</span>
              <span className="text-slate-300">₺---</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Geçici Vergi</span>
              <span className="text-slate-300">₺---</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Enflasyon Düzeltmesi</span>
              <span className="text-slate-300">₺---</span>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-3">📤 Mizan + Beyanname yüklendiğinde aktif olur</p>
        </div>
      </div>

      {/* Required Documents Checklist */}
      <div className="mt-6 bg-white border border-slate-200 rounded-xl p-4">
        <h3 className="font-semibold text-slate-800 mb-3">Tam Analiz İçin Gerekli Belgeler</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
            <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-500">1</span>
            <span className="text-slate-600">Dönem Sonu Mizan (Excel/CSV)</span>
            <span className="ml-auto text-xs text-red-500">Zorunlu</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
            <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-500">2</span>
            <span className="text-slate-600">E-Defter Beratları (XML/ZIP)</span>
            <span className="ml-auto text-xs text-amber-500">Önerilen</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
            <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-500">3</span>
            <span className="text-slate-600">KDV Beyannameleri</span>
            <span className="ml-auto text-xs text-amber-500">Önerilen</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
            <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-500">4</span>
            <span className="text-slate-600">Banka Ekstreleri</span>
            <span className="ml-auto text-xs text-slate-400">Opsiyonel</span>
          </div>
        </div>
      </div>
    </div>
  );
}
