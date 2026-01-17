'use client';

/**
 * Enflasyon Muhasebesi Ana Sayfasi
 *
 * TMS 29 ve VUK gecici madde enflasyon duzeltmesi
 */

import React from 'react';
import { TrendingUp, Upload, Calculator, FileText, ArrowRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const ENFLASYON_STEPS = [
  {
    step: 1,
    title: 'Veri Yükleme',
    description: 'Sabit kıymet listesi, stok ve sermaye detayları',
    icon: Upload,
    href: '/v2/enflasyon/upload',
    status: 'pending',
  },
  {
    step: 2,
    title: 'Düzeltme Hesabı',
    description: 'TMS 29 / VUK düzeltme katsayıları uygulanır',
    icon: Calculator,
    href: '#',
    status: 'locked',
  },
  {
    step: 3,
    title: 'Rapor Üretimi',
    description: 'Düzeltme fişleri ve karşılaştırmalı tablolar',
    icon: FileText,
    href: '#',
    status: 'locked',
  },
];

export default function EnflasyonPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Enflasyon Muhasebesi</h1>
        <p className="text-slate-600 mt-1">
          TMS 29 ve VUK Geçici 33. Madde kapsamında enflasyon düzeltmesi
        </p>
      </div>

      {/* Alert Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-900">2025 Yili Enflasyon Duzeltmesi</p>
          <p className="text-sm text-amber-700 mt-1">
            31.12.2025 tarihli bilancolar icin enflasyon duzeltmesi zorunludur.
            Son beyan tarihi: 30.04.2026
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ENFLASYON_STEPS.map((item) => (
          <div
            key={item.step}
            className={`bg-white rounded-xl border p-6 ${
              item.status === 'locked'
                ? 'border-slate-200 opacity-60'
                : 'border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                item.status === 'locked' ? 'bg-slate-100' : 'bg-blue-100'
              }`}>
                <item.icon className={`w-5 h-5 ${
                  item.status === 'locked' ? 'text-slate-400' : 'text-blue-600'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400">Adım {item.step}</span>
                  {item.status === 'locked' && (
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded">Kilitli</span>
                  )}
                </div>
                <h3 className="font-semibold text-slate-900 mt-1">{item.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                {item.status !== 'locked' && (
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    Başla
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Enflasyon Düzeltmesi Nedir?</h2>
        <div className="prose prose-sm text-slate-600">
          <p>
            Enflasyon muhasebesi, yüksek enflasyon dönemlerinde finansal tabloların
            satın alma gücü açısından düzeltilmesi işlemidir.
          </p>
          <ul className="mt-3 space-y-2">
            <li><strong>TMS 29:</strong> Uluslararası muhasebe standardı, TFRS uygulayan şirketler için</li>
            <li><strong>VUK Geç. 33:</strong> Vergi mevzuatı kapsamında zorunlu düzeltme</li>
            <li><strong>Düzeltme Katsayısı:</strong> Yİ-ÜFE endeksleri kullanılarak hesaplanır</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
