'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Clock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { getAuthToken } from '../_lib/auth';

interface RiskItem {
  id: string;
  title: string;
  client: string;
  severity: 'high' | 'medium' | 'low';
  category: string;
  description: string;
  deadline: string;
  status: 'open' | 'in_progress' | 'resolved';
}

export default function RiskQueuePage() {
  const [riskItems, setRiskItems] = useState<RiskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRiskItems() {
      const token = getAuthToken();
      if (!token) {
        setError('Oturum bulunamadi. Lutfen giris yapin.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/v1/contracts/risk-queue', {
          headers: { Authorization: token },
        });

        if (!response.ok) {
          // API henuz hazir degil, empty state goster
          setRiskItems([]);
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        setRiskItems(data.items || []);
      } catch {
        // API baglantisi yok, empty state goster
        setRiskItems([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRiskItems();
  }, []);

  // İstatistikleri hesapla
  const stats = {
    kritik: riskItems.filter(r => r.severity === 'high').length,
    orta: riskItems.filter(r => r.severity === 'medium').length,
    dusuk: riskItems.filter(r => r.severity === 'low').length,
    cozuldu: riskItems.filter(r => r.status === 'resolved').length,
  };

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
              <p className="text-2xl font-bold text-red-700">{stats.kritik}</p>
              <p className="text-sm text-red-600">Kritik</p>
            </div>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-600" />
            <div>
              <p className="text-2xl font-bold text-amber-700">{stats.orta}</p>
              <p className="text-sm text-amber-600">Orta</p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-700">{stats.dusuk}</p>
              <p className="text-sm text-blue-600">Dusuk</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-700">{stats.cozuldu}</p>
              <p className="text-sm text-green-600">Cozuldu</p>
            </div>
          </div>
        </div>
      </div>

      {/* Risk List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center p-12 bg-white rounded-xl border border-slate-200">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-slate-600">Yukleniyor...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-slate-600">{error}</p>
          </div>
        ) : riskItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200">
            <CheckCircle2 className="w-16 h-16 text-green-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Bekleyen Risk Yok</h3>
            <p className="text-slate-500 text-center max-w-md">
              Su anda cozum bekleyen risk ogesi bulunmuyor.
              Mizan yukleyerek risk analizi baslatin.
            </p>
            <Link
              href="/v2/upload"
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Veri Yukle
            </Link>
          </div>
        ) : (
          riskItems.map((risk) => (
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
                  <Link
                    href={`/v2/vdk/${risk.id}`}
                    className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Incele <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
