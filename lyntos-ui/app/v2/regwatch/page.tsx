'use client';

/**
 * Mevzuat Takibi Ana Sayfası
 * Sprint 1.2 - Stub Page
 *
 * RegWatch - Mevzuat değişiklik radarı
 */

import React from 'react';
import { Radar, Bell, Calendar, FileText, ArrowRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const RECENT_CHANGES = [
  {
    id: '1',
    title: 'KDV Genel Tebliği Değişikliği',
    date: '10.01.2026',
    category: 'KDV',
    impact: 'high',
    summary: 'E-fatura düzenleme sınırı güncellendi',
  },
  {
    id: '2',
    title: 'Kurumlar Vergisi Oranı',
    date: '08.01.2026',
    category: 'Kurumlar',
    impact: 'high',
    summary: '2026 yılı için %25 oran teyidi',
  },
  {
    id: '3',
    title: 'SGK Prim Tavanı',
    date: '05.01.2026',
    category: 'SGK',
    impact: 'medium',
    summary: 'Ocak 2026 prim tavanı belirlendi',
  },
];

export default function RegwatchPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mevzuat Takibi</h1>
          <p className="text-slate-600 mt-1">
            Vergi ve muhasebe mevzuatındaki değişiklikleri takip edin
          </p>
        </div>
        <Link
          href="/v2/regwatch/chat"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Mevzuat Asistanı
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">12</p>
              <p className="text-sm text-slate-500">Bu ay değişiklik</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Radar className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">3</p>
              <p className="text-sm text-slate-500">Kritik etki</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">5</p>
              <p className="text-sm text-slate-500">Yaklaşan son tarih</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Changes */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Son Değişiklikler</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {RECENT_CHANGES.map((change) => (
            <Link
              key={change.id}
              href={`/v2/regwatch/${change.id}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  change.impact === 'high' ? 'bg-red-500' : 'bg-amber-500'
                }`} />
                <div>
                  <p className="font-medium text-slate-900">{change.title}</p>
                  <p className="text-sm text-slate-500 mt-1">{change.summary}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-slate-400">{change.date}</span>
                    <span className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                      {change.category}
                    </span>
                  </div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400" />
            </Link>
          ))}
        </div>
      </div>

      {/* External Link */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-slate-400" />
          <span className="text-sm text-slate-600">
            Resmi Gazete ve GİB duyurularına doğrudan erişin
          </span>
        </div>
        <a
          href="https://www.resmigazete.gov.tr"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        >
          Resmi Gazete
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
