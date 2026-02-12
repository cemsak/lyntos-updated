'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Calendar, CheckCircle2, Clock, AlertTriangle, Loader2, Upload } from 'lucide-react';
import Link from 'next/link';
import { API_ENDPOINTS } from '../_lib/config/api';
import { api } from '../_lib/api/client';

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
      try {
        const { data, ok } = await api.get<Record<string, any>>(API_ENDPOINTS.contracts.declarations);

        if (!ok || !data) {
          // API henuz hazir degil, empty state goster
          setDeclarations([]);
          setIsLoading(false);
          return;
        }

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
        <h1 className="text-2xl font-bold text-[#2E2E2E]">Beyannameler</h1>
        <p className="text-[#5A5A5A] mt-1">
          Vergi beyannamelerinizi yonetin
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#FFFBEB] rounded-xl p-4 border border-[#FFF08C]">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-[#FA841E]" />
            <div>
              <p className="text-2xl font-bold text-[#FA841E]">{stats.pending}</p>
              <p className="text-sm text-[#FA841E]">Bekleyen</p>
            </div>
          </div>
        </div>
        <div className="bg-[#E6F9FF] rounded-xl p-4 border border-[#ABEBFF]">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-[#0049AA]" />
            <div>
              <p className="text-2xl font-bold text-[#0049AA]">{stats.draft}</p>
              <p className="text-sm text-[#0049AA]">Taslak</p>
            </div>
          </div>
        </div>
        <div className="bg-[#ECFDF5] rounded-xl p-4 border border-[#AAE8B8]">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-[#00804D]" />
            <div>
              <p className="text-2xl font-bold text-[#00804D]">{stats.submitted}</p>
              <p className="text-sm text-[#00804D]">Gonderildi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Declarations List */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#0049AA]" />
            <span className="ml-2 text-[#5A5A5A]">Yukleniyor...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-12">
            <AlertTriangle className="w-12 h-12 text-[#FF555F] mb-4" />
            <p className="text-[#5A5A5A]">{error}</p>
          </div>
        ) : declarations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12">
            <FileText className="w-16 h-16 text-[#B4B4B4] mb-4" />
            <h3 className="text-lg font-semibold text-[#2E2E2E] mb-2">Beyanname Bulunamadi</h3>
            <p className="text-[#969696] text-center max-w-md">
              Henuz beyanname kaydi yok. Mizan ve belge yukleyerek
              beyanname hazirlama surecini baslatin.
            </p>
            <Link
              href="/v2/upload"
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#0049AA] transition-colors"
            >
              <Upload className="w-4 h-4" />
              Veri Yukle
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#F5F6F8]">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#969696] uppercase">
                  Beyanname
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#969696] uppercase">
                  Donem
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#969696] uppercase">
                  Son Tarih
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#969696] uppercase">
                  Durum
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {declarations.map((dec) => (
                <tr key={dec.id} className="hover:bg-[#F5F6F8]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-[#969696]" />
                      <div>
                        <p className="font-medium text-[#2E2E2E]">{dec.type}</p>
                        <p className="text-sm text-[#969696]">{dec.client}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[#5A5A5A]">
                    {dec.period}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#969696]" />
                      <span className="text-[#5A5A5A]">{dec.dueDate}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                      dec.status === 'submitted' ? 'bg-[#ECFDF5] text-[#00804D]' :
                      dec.status === 'pending' ? 'bg-[#FFFBEB] text-[#FA841E]' :
                      'bg-[#E6F9FF] text-[#0049AA]'
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
                      className="text-[#0049AA] hover:text-[#00287F] text-sm font-medium"
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
