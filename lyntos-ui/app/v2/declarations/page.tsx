'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Calendar, CheckCircle2, Clock, AlertTriangle, Loader2, Upload } from 'lucide-react';
import Link from 'next/link';
import { getAuthToken } from '../_lib/auth';

interface Declaration {
  id: string;
  type: string;
  period: string;
  dueDate: string;
  status: 'pending' | 'draft' | 'submitted';
  client: string;
}

export default function DeclarationsPage() {
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDeclarations() {
      const token = getAuthToken();
      if (!token) {
        setError('Oturum bulunamadi. Lutfen giris yapin.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/v1/contracts/declarations', {
          headers: { Authorization: token },
        });

        if (!response.ok) {
          // API henuz hazir degil, empty state goster
          setDeclarations([]);
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        setDeclarations(data.items || []);
      } catch {
        // API baglantisi yok, empty state goster
        setDeclarations([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDeclarations();
  }, []);

  // Istatistikleri hesapla
  const stats = {
    pending: declarations.filter(d => d.status === 'pending').length,
    draft: declarations.filter(d => d.status === 'draft').length,
    submitted: declarations.filter(d => d.status === 'submitted').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Beyannameler</h1>
        <p className="text-slate-600 mt-1">
          Vergi beyannamelerinizi yonetin
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-600" />
            <div>
              <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
              <p className="text-sm text-amber-600">Bekleyen</p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-700">{stats.draft}</p>
              <p className="text-sm text-blue-600">Taslak</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-700">{stats.submitted}</p>
              <p className="text-sm text-green-600">Gonderildi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Declarations List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-slate-600">Yukleniyor...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-12">
            <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-slate-600">{error}</p>
          </div>
        ) : declarations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12">
            <FileText className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Beyanname Bulunamadi</h3>
            <p className="text-slate-500 text-center max-w-md">
              Henuz beyanname kaydi yok. Mizan ve belge yukleyerek
              beyanname hazirlama surecini baslatin.
            </p>
            <Link
              href="/v2/upload"
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Veri Yukle
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50">
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
            <tbody className="divide-y divide-slate-200">
              {declarations.map((dec) => (
                <tr key={dec.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="font-medium text-slate-900">{dec.type}</p>
                        <p className="text-sm text-slate-500">{dec.client}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {dec.period}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{dec.dueDate}</span>
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
                    <Link
                      href={`/v2/beyan/${dec.type.toLowerCase().replace(' ', '-')}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      {dec.status === 'draft' ? 'Duzenle' : 'Goruntule'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
