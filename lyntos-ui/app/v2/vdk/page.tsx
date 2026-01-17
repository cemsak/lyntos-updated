'use client';

/**
 * VDK Risk Analizi Ana Sayfası
 *
 * VDK 13 kriter bazında risk analizi dashboard'u
 */

import React, { useState, useEffect } from 'react';
import { ShieldAlert, ArrowRight, Loader2, Upload } from 'lucide-react';
import Link from 'next/link';
import { getAuthToken } from '../_lib/auth';

interface RiskSummary {
  high: number;
  medium: number;
  low: number;
  score: number;
  lastUpdated: string;
}

const RISK_CATEGORY_CONFIG = [
  {
    id: 'high',
    label: 'Yuksek Risk',
    key: 'high' as const,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  {
    id: 'medium',
    label: 'Orta Risk',
    key: 'medium' as const,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  {
    id: 'low',
    label: 'Dusuk Risk',
    key: 'low' as const,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
];

export default function VdkRiskPage() {
  const [riskData, setRiskData] = useState<RiskSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRiskData() {
      const token = getAuthToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/v1/contracts/vdk-risk/summary', {
          headers: { Authorization: token },
        });

        if (!response.ok) {
          setRiskData(null);
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        setRiskData(data);
      } catch {
        setRiskData(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRiskData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-slate-600">Yukleniyor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">VDK Risk Analizi</h1>
        <p className="text-slate-600 mt-1">
          Vergi Denetim Kurulu 13 kriter bazinda risk degerlendirmesi
        </p>
      </div>

      {riskData ? (
        <>
          {/* Risk Ozeti */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {RISK_CATEGORY_CONFIG.map((category) => (
              <div
                key={category.id}
                className={`${category.bgColor} ${category.borderColor} border rounded-xl p-5`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${category.color}`}>{category.label}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">
                      {riskData[category.key]}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">kriter</p>
                  </div>
                  <ShieldAlert className={`w-10 h-10 ${category.color} opacity-50`} />
                </div>
              </div>
            ))}
          </div>

          {/* Risk Skoru */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Genel Risk Skoru</h2>
              <span className="text-sm text-slate-500">Son guncelleme: {riskData.lastUpdated}</span>
            </div>
            <div className="flex items-center gap-6">
              <div className={`w-32 h-32 rounded-full border-8 flex items-center justify-center ${
                riskData.score >= 70 ? 'border-red-400' :
                riskData.score >= 40 ? 'border-amber-400' : 'border-green-400'
              }`}>
                <div className="text-center">
                  <span className="text-3xl font-bold text-slate-900">{riskData.score}</span>
                  <span className="text-sm text-slate-500 block">/100</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-slate-600">
                  Risk skorunuz{' '}
                  <span className={`font-semibold ${
                    riskData.score >= 70 ? 'text-red-600' :
                    riskData.score >= 40 ? 'text-amber-600' : 'text-green-600'
                  }`}>
                    {riskData.score >= 70 ? 'Yuksek' : riskData.score >= 40 ? 'Orta' : 'Dusuk'}
                  </span>{' '}
                  seviyede.
                </p>
                <Link
                  href="/v2/risk"
                  className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Bekleyen islemleri gor
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-xl border border-slate-200 p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <ShieldAlert className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Risk Analizi Icin Veri Gerekli</h3>
            <p className="text-slate-500 max-w-md">
              VDK 13 kriter bazinda risk analizi icin once mizan ve beyanname
              verilerinizi yuklemeniz gerekmektedir.
            </p>
            <Link
              href="/v2/upload"
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Upload className="w-4 h-4" />
              Veri Yukle
            </Link>
          </div>
        </div>
      )}

      {/* 13 Kriter Listesi */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">VDK 13 Kriter</h2>
        <p className="text-slate-500 text-sm">
          Detayli kriter analizi icin veri yuklemeniz gerekmektedir.
          Mizan ve beyanname verilerinizi yukledikten sonra her kriter icin
          detayli analiz goruntulecektir.
        </p>
        {!riskData && (
          <Link
            href="/v2/upload"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Veri Yukle
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
