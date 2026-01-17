'use client';

/**
 * Kontrol Listeleri Sayfasi
 *
 * SMMM/YMM icin hazir kontrol listeleri
 */

import React from 'react';
import { CheckSquare, Download, Clock, FileCheck, ChevronRight } from 'lucide-react';

const CHECKLISTS = [
  {
    id: 'donem-sonu',
    title: 'Dönem Sonu Kapanış',
    items: 24,
    category: 'Zorunlu',
    description: 'Yıl sonu kapanış işlemleri kontrol listesi',
  },
  {
    id: 'gecici-vergi',
    title: 'Geçici Vergi Beyanı',
    items: 12,
    category: 'Zorunlu',
    description: 'Üçer aylık geçici vergi hazırlık listesi',
  },
  {
    id: 'kurumlar-vergi',
    title: 'Kurumlar Vergisi',
    items: 20,
    category: 'Zorunlu',
    description: 'Yıllık kurumlar vergisi beyanı kontrolleri',
  },
  {
    id: 'kdv-iade',
    title: 'KDV İade Dosyası',
    items: 18,
    category: 'İsteğe Bağlı',
    description: 'KDV iade başvuru evrak listesi',
  },
  {
    id: 'denetim-hazirlik',
    title: 'Denetim Hazırlık',
    items: 30,
    category: 'İsteğe Bağlı',
    description: 'Vergi incelemesi öncesi hazırlık listesi',
  },
  {
    id: 'enflasyon',
    title: 'Enflasyon Düzeltmesi',
    items: 15,
    category: 'Zorunlu',
    description: 'Enflasyon muhasebesi belge listesi',
  },
];

export default function KontrolListeleriPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Kontrol Listeleri</h1>
        <p className="text-slate-600 mt-1">
          Dönemsel işlemler için hazır kontrol listeleri
        </p>
      </div>

      {/* Checklist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CHECKLISTS.map((list) => (
          <div
            key={list.id}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{list.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      list.category === 'Zorunlu'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {list.category}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{list.description}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <FileCheck className="w-3 h-3" />
                      {list.items} madde
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        ))}
      </div>

      {/* Download All */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Download className="w-5 h-5 text-slate-400" />
          <span className="text-sm text-slate-600">
            Tüm kontrol listelerini Excel olarak indirin
          </span>
        </div>
        <button className="text-sm font-medium text-blue-600 hover:text-blue-800">
          Tümünü İndir
        </button>
      </div>
    </div>
  );
}
