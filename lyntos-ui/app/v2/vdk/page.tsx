'use client';

/**
 * VDK Risk Analizi Ana Sayfası
 * Sprint 1.2 - Stub Page
 *
 * VDK 13 kriter bazında risk analizi dashboard'u
 */

import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, TrendingUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const RISK_CATEGORIES = [
  {
    id: 'high',
    label: 'Yüksek Risk',
    count: 3,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  {
    id: 'medium',
    label: 'Orta Risk',
    count: 5,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  {
    id: 'low',
    label: 'Düşük Risk',
    count: 5,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
];

export default function VdkRiskPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">VDK Risk Analizi</h1>
        <p className="text-slate-600 mt-1">
          Vergi Denetim Kurulu 13 kriter bazında risk değerlendirmesi
        </p>
      </div>

      {/* Risk Özeti */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {RISK_CATEGORIES.map((category) => (
          <div
            key={category.id}
            className={`${category.bgColor} ${category.borderColor} border rounded-xl p-5`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${category.color}`}>{category.label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{category.count}</p>
                <p className="text-xs text-slate-500 mt-1">kriter</p>
              </div>
              <ShieldAlert className={`w-10 h-10 ${category.color} opacity-50`} />
            </div>
          </div>
        ))}
      </div>

      {/* Risk Skoru */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Genel Risk Skoru</h2>
          <span className="text-sm text-slate-500">Son güncelleme: Bugün</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="w-32 h-32 rounded-full border-8 border-amber-400 flex items-center justify-center">
            <div className="text-center">
              <span className="text-3xl font-bold text-slate-900">62</span>
              <span className="text-sm text-slate-500 block">/100</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-slate-600">
              Risk skorunuz <span className="font-semibold text-amber-600">Orta</span> seviyede.
              3 kritik konu acil müdahale gerektiriyor.
            </p>
            <Link
              href="/v2/risk"
              className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Bekleyen işlemleri gör
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* 13 Kriter Listesi Placeholder */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">VDK 13 Kriter</h2>
        <p className="text-slate-500 text-sm">
          Detaylı kriter analizi için veri yüklemeniz gerekmektedir.
          Mizan ve beyanname verilerinizi yükledikten sonra her kriter için
          detaylı analiz görüntülenecektir.
        </p>
        <Link
          href="/v2/upload"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Veri Yükle
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
