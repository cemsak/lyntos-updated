'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, ArrowRight } from 'lucide-react';

const RISK_ITEMS = [
  {
    id: 'RISK-001',
    title: 'Yuksek Kasa Bakiyesi',
    client: 'Ozkan Kirtasiye A.S.',
    severity: 'high',
    category: 'VDK K-09',
    description: 'Kasa bakiyesi aktif toplaminin %15\'ini asiyor',
    deadline: '2026-01-15',
    status: 'open',
  },
  {
    id: 'RISK-002',
    title: 'Ortaklardan Alacaklar',
    client: 'ABC Teknoloji Ltd.Sti.',
    severity: 'medium',
    category: 'VDK K-07',
    description: 'Ortaklardan alacaklar sermayenin %50\'sini asiyor',
    deadline: '2026-01-20',
    status: 'in_progress',
  },
  {
    id: 'RISK-003',
    title: 'Kar Marji Dusuk',
    client: 'Ozkan Kirtasiye A.S.',
    severity: 'low',
    category: 'Finansal',
    description: 'Donem net kar marji %0.0',
    deadline: '2026-01-25',
    status: 'open',
  },
];

export default function RiskQueuePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bekleyen Islemler</h1>
        <p className="text-slate-600 mt-1">
          Cozum bekleyen risk uyarilari
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-red-700">1</p>
              <p className="text-sm text-red-600">Kritik</p>
            </div>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-600" />
            <div>
              <p className="text-2xl font-bold text-amber-700">1</p>
              <p className="text-sm text-amber-600">Orta</p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-700">1</p>
              <p className="text-sm text-blue-600">Dusuk</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-700">0</p>
              <p className="text-sm text-green-600">Cozuldu</p>
            </div>
          </div>
        </div>
      </div>

      {/* Risk List */}
      <div className="space-y-4">
        {RISK_ITEMS.map((risk) => (
          <div
            key={risk.id}
            className={`bg-white rounded-xl border p-4 hover:shadow-md transition-shadow ${
              risk.severity === 'high' ? 'border-red-200' :
              risk.severity === 'medium' ? 'border-amber-200' :
              'border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  risk.severity === 'high' ? 'bg-red-100' :
                  risk.severity === 'medium' ? 'bg-amber-100' :
                  'bg-blue-100'
                }`}>
                  <AlertTriangle className={`w-5 h-5 ${
                    risk.severity === 'high' ? 'text-red-600' :
                    risk.severity === 'medium' ? 'text-amber-600' :
                    'text-blue-600'
                  }`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-500">{risk.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      risk.severity === 'high' ? 'bg-red-100 text-red-700' :
                      risk.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {risk.category}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900">{risk.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{risk.client}</p>
                  <p className="text-sm text-slate-600 mt-2">{risk.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Son Tarih</p>
                <p className="text-sm font-medium text-slate-700">{risk.deadline}</p>
                <a
                  href={`/v2/vdk/${risk.id}`}
                  className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Incele <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
