'use client';

/**
 * LYNTOS Pratik Bilgiler - Ana Sayfa
 * Sprint 9.1 - SMMM Pratik Bilgi Merkezi
 */

import React from 'react';
import Link from 'next/link';
import {
  Calculator,
  Percent,
  Scale,
  Shield,
  Clock,
  AlertCircle,
  Calendar,
  ArrowRight,
} from 'lucide-react';

const CATEGORIES = [
  {
    id: 'hesaplamalar',
    label: 'Hesaplamalar',
    description: 'Vergi, SGK ve diger mali hesaplamalar',
    icon: Calculator,
    color: 'bg-blue-500',
    href: '/v2/pratik-bilgiler/hesaplamalar',
  },
  {
    id: 'oranlar',
    label: 'Vergi Oranlari',
    description: 'Guncel vergi oranlari ve dilimleri',
    icon: Percent,
    color: 'bg-green-500',
    href: '/v2/pratik-bilgiler/oranlar',
  },
  {
    id: 'hadler',
    label: 'Hadler ve Tutarlar',
    description: 'Yasal hadler, istisna tutarlari',
    icon: Scale,
    color: 'bg-purple-500',
    href: '/v2/pratik-bilgiler/hadler',
  },
  {
    id: 'sgk',
    label: 'SGK Bilgileri',
    description: 'SGK prim oranlari ve taban/tavan',
    icon: Shield,
    color: 'bg-cyan-500',
    href: '/v2/pratik-bilgiler/sgk',
  },
  {
    id: 'gecikme',
    label: 'Gecikme Faizi',
    description: 'Gecikme faizi ve zammi hesaplamalari',
    icon: Clock,
    color: 'bg-amber-500',
    href: '/v2/pratik-bilgiler/gecikme',
  },
  {
    id: 'cezalar',
    label: 'Cezalar',
    description: 'VUK cezalari ve usulsuzluk cezalari',
    icon: AlertCircle,
    color: 'bg-red-500',
    href: '/v2/pratik-bilgiler/cezalar',
  },
  {
    id: 'beyan-tarihleri',
    label: 'Beyan Tarihleri',
    description: 'Beyanname ve bildirim son tarihleri',
    icon: Calendar,
    color: 'bg-indigo-500',
    href: '/v2/pratik-bilgiler/beyan-tarihleri',
  },
];

export default function PratikBilgilerPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pratik Bilgiler</h1>
        <p className="text-slate-600 mt-1">
          SMMM'ler icin guncel vergi, SGK ve mali mevzuat bilgileri
        </p>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          return (
            <Link
              key={category.id}
              href={category.href}
              className="group bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-slate-300 transition-all"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 ${category.color} rounded-xl flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {category.label}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {category.description}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <h3 className="font-semibold text-blue-900 mb-2">2026 Yili Guncellemeleri</h3>
          <p className="text-sm text-blue-700">
            Yeni yil itibariyle guncellenen vergi oranlari, hadler ve SGK parametreleri
            ilgili sayfalarda yer almaktadir.
          </p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <h3 className="font-semibold text-amber-900 mb-2">Yaklasan Beyan Tarihleri</h3>
          <p className="text-sm text-amber-700">
            Ocak 2026 KDV beyannamesi son tarihi: 26 Subat 2026
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-xs text-slate-500 text-center p-4">
        Bu bilgiler genel bilgilendirme amaclidir. Mevzuat degisiklikleri takip edilmeli,
        guncel mevzuat kaynaklari kontrol edilmelidir.
      </div>
    </div>
  );
}
