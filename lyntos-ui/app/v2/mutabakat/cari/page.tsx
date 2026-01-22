'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  Building,
  Users,
  Banknote,
  Loader2,
  FileX,
} from 'lucide-react';
import { Card } from '../../_components/shared/Card';
import { Badge } from '../../_components/shared/Badge';
import { getAuthToken } from '../../_lib/auth';

interface CariHesap {
  hesapKodu: string;
  hesapAdi: string;
  kayitBakiye: number;
  mutabakatBakiye: number;
  fark: number;
  durum: 'uyumlu' | 'farkli' | 'bekliyor';
  sonMutabakat?: string;
}

export default function CariMutabakatPage() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hesaplar, setHesaplar] = useState<CariHesap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch cari hesaplar from API
  useEffect(() => {
    const fetchCariHesaplar = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getAuthToken();
        if (!token) {
          // Token yoksa empty state göster
          setHesaplar([]);
          setLoading(false);
          return;
        }
        const response = await fetch('/api/v1/contracts/data-quality?type=cari', {
          headers: {
            'Authorization': token,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        // Map API response to CariHesap format if data exists
        if (data.data?.items && Array.isArray(data.data.items)) {
          setHesaplar(data.data.items);
        } else {
          setHesaplar([]);
        }
      } catch (err) {
        console.error('[CariMutabakat] Fetch failed:', err);
        setHesaplar([]);
        setError('Cari hesap verileri yuklenemedi');
      } finally {
        setLoading(false);
      }
    };

    fetchCariHesaplar();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const token = getAuthToken();
        if (!token) {
          // Token yoksa işlem yapma
          setIsRefreshing(false);
          return;
        }
      const response = await fetch('/api/v1/contracts/data-quality?type=cari', {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.data?.items && Array.isArray(data.data.items)) {
        setHesaplar(data.data.items);
      } else {
        setHesaplar([]);
      }
    } catch (err) {
      console.error('[CariMutabakat] Refresh failed:', err);
      setError('Veriler yenilenemedi');
    } finally {
      setIsRefreshing(false);
    }
  };

  const toplamFark = hesaplar.reduce((acc, h) => acc + Math.abs(h.fark), 0);
  const uyumsuzHesap = hesaplar.filter((h) => h.durum === 'farkli').length;
  const uyumluHesap = hesaplar.filter((h) => h.durum === 'uyumlu').length;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0 }).format(value) + ' TL';

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Geri
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Cari Mutabakat Kontrolu</h1>
              <p className="text-slate-600">120-Alicilar, 320-Saticilar, 131/331-Ortaklar</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Yenileniyor...' : 'Yenile'}
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              <Download className="w-4 h-4" />
              Excel İndir
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Banknote className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Toplam Fark</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(toplamFark)}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Kontrol Edilen</p>
                <p className="text-xl font-bold text-slate-800">{hesaplar.length}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Uyumsuz</p>
                <p className="text-xl font-bold text-amber-600">{uyumsuzHesap}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Uyumlu</p>
                <p className="text-xl font-bold text-green-600">{uyumluHesap}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Table */}
        <Card>
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-slate-600">Cari hesaplar yukleniyor...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">{error}</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Tekrar Dene
              </button>
            </div>
          ) : hesaplar.length === 0 ? (
            <div className="p-8 text-center">
              <FileX className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Cari Hesap Bulunamadi</h3>
              <p className="text-slate-500 text-sm">Mutabakat kontrolu icin cari hesap verisi yukleyin.</p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Hesap</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Hesap Adi</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Kayit Bakiye</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">
                    Mutabakat Bakiye
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Fark</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Durum</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Son Mutabakat</th>
                </tr>
              </thead>
              <tbody>
                {hesaplar.map((hesap) => (
                  <tr key={hesap.hesapKodu} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-slate-800">{hesap.hesapKodu}</td>
                    <td className="py-3 px-4 text-slate-800">{hesap.hesapAdi}</td>
                    <td className="py-3 px-4 text-right text-slate-800">
                      {formatCurrency(hesap.kayitBakiye)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-800">
                      {formatCurrency(hesap.mutabakatBakiye)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-medium ${
                        hesap.fark > 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {formatCurrency(hesap.fark)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {hesap.durum === 'uyumlu' ? (
                        <Badge variant="success">Uyumlu</Badge>
                      ) : hesap.durum === 'farkli' ? (
                        <Badge variant="warning">Farkli</Badge>
                      ) : (
                        <Badge variant="default">Bekliyor</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-sm text-slate-500">
                      {hesap.sonMutabakat || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </Card>

        {/* Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800">Mutabakat Nedir?</h3>
              <p className="text-sm text-blue-700 mt-1">
                Cari mutabakat, isletmenin alici ve satici hesaplarinin karsi tarafin kayitlariyla
                karsilastirilmasidir. Farklar, eksik/fazla fatura, odeme zamanlama farklari veya
                hatalari gosterebilir.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-between">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Geri Don
          </button>
          <button
            onClick={() => router.push('/v2')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Dashboard'a Don
          </button>
        </div>
      </div>
    </div>
  );
}
