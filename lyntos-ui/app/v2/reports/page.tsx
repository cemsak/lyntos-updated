'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, FileText, Download, Calendar, TrendingUp, PieChart, Loader2, FolderOpen } from 'lucide-react';
import Link from 'next/link';
import { getAuthToken } from '../_lib/auth';

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: typeof BarChart3;
  available: boolean;
}

interface RecentReport {
  id: string;
  type: string;
  title: string;
  client: string;
  date: string;
}

const REPORT_TYPES: ReportType[] = [
  {
    id: 'mizan-analiz',
    title: 'Mizan Analiz Raporu',
    description: 'Donem sonu mizan ozeti ve anomali tespitleri',
    icon: BarChart3,
    available: true,
  },
  {
    id: 'vdk-risk',
    title: 'VDK Risk Raporu',
    description: '13 kriter bazinda risk degerlendirmesi',
    icon: TrendingUp,
    available: true,
  },
  {
    id: 'oran-analiz',
    title: 'Finansal Oran Analizi',
    description: 'Likidite, karlilik ve verimlilik oranlari',
    icon: PieChart,
    available: true,
  },
  {
    id: 'enflasyon',
    title: 'Enflasyon Duzeltme Raporu',
    description: 'TMS 29 enflasyon muhasebesi hesaplamalari',
    icon: FileText,
    available: false,
  },
];

export default function ReportsPage() {
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRecentReports() {
      const token = getAuthToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/v1/contracts/reports/recent', {
          headers: { Authorization: token },
        });

        if (!response.ok) {
          setRecentReports([]);
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        setRecentReports(data.items || []);
      } catch {
        setRecentReports([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecentReports();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Raporlar</h1>
        <p className="text-slate-600 mt-1">
          Analiz raporlarinizi goruntuleyun ve indirin
        </p>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORT_TYPES.map((report) => (
          <div
            key={report.id}
            className={`bg-white rounded-xl border p-6 ${
              report.available
                ? 'border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer'
                : 'border-slate-200 opacity-60'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                report.available
                  ? 'bg-blue-100'
                  : 'bg-slate-100'
              }`}>
                <report.icon className={`w-6 h-6 ${
                  report.available ? 'text-blue-600' : 'text-slate-400'
                }`} />
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold ${
                  report.available ? 'text-slate-900' : 'text-slate-500'
                }`}>
                  {report.title}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {report.description}
                </p>
                {report.available ? (
                  <div className="flex items-center gap-3 mt-4">
                    <button className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                      <FileText className="w-4 h-4" />
                      Goruntule
                    </button>
                    <button className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-800">
                      <Download className="w-4 h-4" />
                      PDF Indir
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-4">
                    Veri yuklendikten sonra kullanilabilir
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Son Olusturulan Raporlar
        </h2>
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-slate-600">Yukleniyor...</span>
          </div>
        ) : recentReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8">
            <FolderOpen className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500 text-center">
              Henuz olusturulmus rapor bulunmuyor.
            </p>
            <p className="text-slate-400 text-sm text-center mt-1">
              Veri yukleyerek rapor olusturma surecini baslatin.
            </p>
            <Link
              href="/v2/upload"
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Veri Yukle
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentReports.map((report) => (
              <div key={report.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3">
                  {report.type === 'mizan' ? (
                    <BarChart3 className="w-5 h-5 text-slate-400" />
                  ) : (
                    <TrendingUp className="w-5 h-5 text-slate-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {report.title}
                    </p>
                    <p className="text-xs text-slate-500">{report.client}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{report.date}</span>
                  <button className="text-blue-600 hover:text-blue-800">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
