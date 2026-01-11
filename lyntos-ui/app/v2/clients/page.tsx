'use client';

import React from 'react';
import { Users, Building2, Plus, Search } from 'lucide-react';

const SAMPLE_CLIENTS = [
  { id: 'OZKAN_KIRTASIYE', name: 'Ozkan Kirtasiye A.S.', vkn: '1234567890', status: 'active', riskScore: 88 },
  { id: 'ABC_TEKNOLOJI', name: 'ABC Teknoloji Ltd.Sti.', vkn: '0987654321', status: 'active', riskScore: 72 },
  { id: 'XYZ_YAZILIM', name: 'XYZ Yazilim A.S.', vkn: '5678901234', status: 'pending', riskScore: 95 },
];

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mukellefler</h1>
          <p className="text-slate-600 mt-1">
            Tum mukelleflerinizi yonetin
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          Yeni Mukellef
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Mukellef ara (isim, VKN)..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Client List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Mukellef
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                VKN
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Durum
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Risk Skoru
              </th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {SAMPLE_CLIENTS.map((client) => (
              <tr key={client.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{client.name}</p>
                      <p className="text-sm text-slate-500">{client.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 font-mono">
                  {client.vkn}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    client.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {client.status === 'active' ? 'Aktif' : 'Beklemede'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          client.riskScore >= 90 ? 'bg-green-500' :
                          client.riskScore >= 70 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${client.riskScore}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                      {client.riskScore}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <a
                    href={`/v2?client_id=${client.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Detay
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
