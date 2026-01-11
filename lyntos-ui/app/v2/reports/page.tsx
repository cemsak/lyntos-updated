'use client';

import React from 'react';
import { BarChart3, FileText, Download, Calendar, TrendingUp, PieChart } from 'lucide-react';

const REPORTS = [
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
        {REPORTS.map((report) => (
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
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Mizan Analiz - 2025 Q4
                </p>
                <p className="text-xs text-slate-500">Ozkan Kirtasiye A.S.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">09.01.2026</span>
              <button className="text-blue-600 hover:text-blue-800">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  VDK Risk Raporu - 2025 Q4
                </p>
                <p className="text-xs text-slate-500">Ozkan Kirtasiye A.S.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">08.01.2026</span>
              <button className="text-blue-600 hover:text-blue-800">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
