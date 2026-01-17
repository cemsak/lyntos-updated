'use client';

/**
 * Mevzuat Takibi Ana Sayfası
 *
 * RegWatch - Mevzuat degisiklik radari
 */

import React, { useState, useEffect } from 'react';
import { Radar, Bell, Calendar, FileText, ArrowRight, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getAuthToken } from '../_lib/auth';

interface MevzuatChange {
  id: string;
  title: string;
  date: string;
  category: string;
  impact: 'high' | 'medium' | 'low';
  summary: string;
}

interface MevzuatStats {
  thisMonth: number;
  critical: number;
  upcoming: number;
}

export default function RegwatchPage() {
  const [changes, setChanges] = useState<MevzuatChange[]>([]);
  const [stats, setStats] = useState<MevzuatStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMevzuatData() {
      const token = getAuthToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const [changesRes, statsRes] = await Promise.all([
          fetch('/api/v1/regwatch/changes', { headers: { Authorization: token } }),
          fetch('/api/v1/regwatch/stats', { headers: { Authorization: token } }),
        ]);

        if (changesRes.ok) {
          const changesData = await changesRes.json();
          setChanges(changesData.items || []);
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch {
        // API baglantisi yok
      } finally {
        setIsLoading(false);
      }
    }

    fetchMevzuatData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mevzuat Takibi</h1>
          <p className="text-slate-600 mt-1">
            Vergi ve muhasebe mevzuatindaki degisiklikleri takip edin
          </p>
        </div>
        <Link
          href="/v2/regwatch/chat"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Mevzuat Asistani
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
              <p className="text-2xl font-bold text-slate-900">
                {isLoading ? '-' : stats?.thisMonth ?? 0}
              </p>
              <p className="text-sm text-slate-500">Bu ay degisiklik</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Radar className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {isLoading ? '-' : stats?.critical ?? 0}
              </p>
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
              <p className="text-2xl font-bold text-slate-900">
                {isLoading ? '-' : stats?.upcoming ?? 0}
              </p>
              <p className="text-sm text-slate-500">Yaklasan son tarih</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Changes */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Son Degisiklikler</h2>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-slate-600">Yukleniyor...</span>
          </div>
        ) : changes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Radar className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-600">Henuz mevzuat degisikligi kaydedilmedi.</p>
            <p className="text-slate-400 text-sm mt-1">
              Mevzuat takip servisi aktif oldugunda degisiklikler burada goruntulenecek.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {changes.map((change) => (
              <Link
                key={change.id}
                href={`/v2/regwatch/${change.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    change.impact === 'high' ? 'bg-red-500' :
                    change.impact === 'medium' ? 'bg-amber-500' : 'bg-green-500'
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
        )}
      </div>

      {/* External Link */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-slate-400" />
          <span className="text-sm text-slate-600">
            Resmi Gazete ve GIB duyurularina dogrudan erisin
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
