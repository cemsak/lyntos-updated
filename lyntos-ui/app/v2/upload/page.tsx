'use client';

import React from 'react';
import { Upload, FileSpreadsheet, FileText, Database } from 'lucide-react';

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Veri Yukleme</h1>
        <p className="text-slate-600 mt-1">
          Muhasebe verilerinizi yukleyin ve analiz edin
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
                Mizan Yukle
              </h3>
              <p className="text-sm text-slate-500">Excel veya CSV</p>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Donem sonu mizan verilerinizi yukleyin. Enflasyon duzeltmesi ve risk analizi icin gereklidir.
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
              <p className="text-sm text-slate-400">Yakin Zamanda</p>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            E-defter XML dosyalarinizi otomatik analiz. Yakin zamanda aktif olacak.
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
              <p className="text-sm text-slate-400">Yakin Zamanda</p>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Banka ekstrelerini yukleyin, otomatik mutabakat. Yakin zamanda aktif olacak.
          </p>
        </div>
      </div>

      {/* Drag & Drop Area */}
      <div className="mt-8">
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors">
          <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">
            Dosyalarinizi surukleyin
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            veya dosya secmek icin tiklayin
          </p>
          <p className="text-xs text-slate-400">
            Desteklenen formatlar: XLSX, XLS, CSV (maks. 10MB)
          </p>
        </div>
      </div>
    </div>
  );
}
