'use client';

import React from 'react';
import { FileText, Calendar, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

const DECLARATIONS = [
  {
    id: 'KDV-2025-12',
    type: 'KDV Beyannamesi',
    period: 'Aralik 2025',
    dueDate: '2026-01-26',
    status: 'pending',
    client: 'Ozkan Kirtasiye A.S.',
  },
  {
    id: 'MUHTASAR-2025-12',
    type: 'Muhtasar Beyanname',
    period: 'Aralik 2025',
    dueDate: '2026-01-26',
    status: 'pending',
    client: 'Ozkan Kirtasiye A.S.',
  },
  {
    id: 'GECICI-2025-Q4',
    type: 'Gecici Vergi',
    period: '2025 Q4',
    dueDate: '2026-02-17',
    status: 'draft',
    client: 'Ozkan Kirtasiye A.S.',
  },
  {
    id: 'KDV-2025-11',
    type: 'KDV Beyannamesi',
    period: 'Kasim 2025',
    dueDate: '2025-12-26',
    status: 'submitted',
    client: 'Ozkan Kirtasiye A.S.',
  },
];

export default function DeclarationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Beyannameler</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Vergi beyannamelerinizi yonetin
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-600" />
            <div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">2</p>
              <p className="text-sm text-amber-600">Bekleyen</p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">1</p>
              <p className="text-sm text-blue-600">Taslak</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">1</p>
              <p className="text-sm text-green-600">Gonderildi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Declarations List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                Beyanname
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                Donem
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                Son Tarih
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                Durum
              </th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {DECLARATIONS.map((dec) => (
              <tr key={dec.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{dec.type}</p>
                      <p className="text-sm text-slate-500">{dec.client}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                  {dec.period}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-400">{dec.dueDate}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                    dec.status === 'submitted' ? 'bg-green-100 text-green-700' :
                    dec.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {dec.status === 'submitted' ? <CheckCircle2 className="w-3 h-3" /> :
                     dec.status === 'pending' ? <Clock className="w-3 h-3" /> :
                     <FileText className="w-3 h-3" />}
                    {dec.status === 'submitted' ? 'Gonderildi' :
                     dec.status === 'pending' ? 'Bekliyor' : 'Taslak'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <a
                    href={`/v2/beyan/${dec.type.toLowerCase().replace(' ', '-')}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    {dec.status === 'draft' ? 'Duzenle' : 'Goruntule'}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
