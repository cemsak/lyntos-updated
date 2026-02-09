'use client';

/**
 * Defteri Kebir Sayfası
 *
 * Header'daki dönem seçiciye bağlı çalışır.
 * Dönem seçilmeden veri göstermez.
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  BookOpen,
} from 'lucide-react';
import { useDashboardScope } from '../_components/scope/ScopeProvider';
import { ScopeGuide } from '../_components/shared/ScopeGuide';
import { exportToCsv } from '../_lib/exportCsv';
import { DataFreshness } from '../_components/shared/DataFreshness';
import { API_BASE_URL } from '../_lib/config/api';
import { getAuthToken } from '../_lib/auth';
import { formatCurrency, formatDate, formatPeriod } from '../_lib/format';

interface HesapOzet {
  hesap_kodu: string;
  hesap_adi: string;
  hareket_sayisi: number;
  toplam_borc: number;
  toplam_alacak: number;
}

interface KebirEntry {
  id: number;
  kebir_hesap: string;
  kebir_hesap_adi: string;
  tarih: string;
  madde_no: string;
  fis_no: string;
  hesap_kodu: string;
  hesap_adi: string;
  aciklama: string;
  borc: number;
  alacak: number;
  bakiye: number;
  bakiye_turu: string;
}

export default function KebirPage() {
  const { scope, isReady } = useDashboardScope();
  const searchParams = useSearchParams();
  const hesapParam = searchParams.get('hesap');

  const [hesaplar, setHesaplar] = useState<HesapOzet[]>([]);
  const [selectedHesap, setSelectedHesap] = useState<string | null>(null);
  const [initialHesapApplied, setInitialHesapApplied] = useState(false);
  const [hareketler, setHareketler] = useState<KebirEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHareketler, setLoadingHareketler] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Scope'tan client_id ve period al
  const clientId = scope.client_id;
  const periodId = scope.period;

  // Dönem seçili mi kontrol et
  const isScopeComplete = Boolean(clientId && periodId);

  const fetchHesaplar = async () => {
    if (!isScopeComplete) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        client_id: clientId,
        period_id: periodId,
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/v2/kebir/hesap-listesi?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHesaplar(data.hesaplar || []);
        setLastFetchedAt(new Date().toISOString());
      }
    } catch (err) {
      console.error('Hesaplar fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHareketler = async (hesapKodu: string) => {
    if (!isScopeComplete) return;

    setLoadingHareketler(true);
    try {
      const params = new URLSearchParams({
        client_id: clientId,
        period_id: periodId,
        page: page.toString(),
        page_size: '100',
      });

      const token = getAuthToken();
      const response = await fetch(
        `${API_BASE_URL}/api/v2/kebir/hesap/${encodeURIComponent(hesapKodu)}?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setHareketler(data.entries || []);
        setTotalPages(data.pages || 1);
      }
    } catch (err) {
      console.error('Hareketler fetch error:', err);
    } finally {
      setLoadingHareketler(false);
    }
  };

  // Scope değiştiğinde hesapları yeniden yükle
  useEffect(() => {
    if (isReady && isScopeComplete) {
      setSelectedHesap(null);
      setHareketler([]);
      fetchHesaplar();
    } else {
      setHesaplar([]);
      setHareketler([]);
    }
  }, [clientId, periodId, isReady]);

  // URL param'dan hesap seçimi (drill-down desteği)
  useEffect(() => {
    if (hesapParam && hesaplar.length > 0 && !initialHesapApplied) {
      const match = hesaplar.find(h => h.hesap_kodu === hesapParam);
      if (match) {
        setSelectedHesap(match.hesap_kodu);
        setPage(1);
      } else {
        // Hesap listede yoksa arama alanına doldur
        setSearchTerm(hesapParam);
      }
      setInitialHesapApplied(true);
    }
  }, [hesapParam, hesaplar, initialHesapApplied]);

  // Hesap seçildiğinde veya sayfa değiştiğinde hareketleri yükle
  useEffect(() => {
    if (selectedHesap && isScopeComplete) {
      fetchHareketler(selectedHesap);
    }
  }, [selectedHesap, page]);

  const filteredHesaplar = hesaplar.filter(
    (h) =>
      h.hesap_kodu?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.hesap_adi?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Loading state
  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-[#0078D0] animate-spin" />
      </div>
    );
  }

  // Dönem seçilmemiş
  if (!isScopeComplete) {
    return (
      <div className="min-h-screen bg-[#F5F6F8]">
        <div className="bg-white border-b border-[#E5E5E5] px-6 py-4">
          <h1 className="text-2xl font-bold text-[#2E2E2E]">Defteri Kebir</h1>
        </div>
        <div className="p-6">
          <ScopeGuide variant="banner" description="Defteri kebir kayıtlarını görüntülemek için üstteki menülerden bir dönem seçin." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E5E5] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#2E2E2E]">Defteri Kebir</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-[#969696]">
                {formatPeriod(periodId)} - {hesaplar.length.toLocaleString('tr-TR')} hesap
              </p>
              <DataFreshness lastUpdated={lastFetchedAt} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchHesaplar}
              className="flex items-center gap-2 px-4 py-2 text-sm text-[#5A5A5A] hover:text-[#2E2E2E] border border-[#B4B4B4] rounded-lg hover:bg-[#F5F6F8]"
            >
              <RefreshCw className="w-4 h-4" />
              Yenile
            </button>
            <button
              onClick={() => exportToCsv(`kebir_${periodId}`, hesaplar, [
                { header: 'Hesap Kodu', accessor: (r) => r.hesap_kodu },
                { header: 'Hesap Adı', accessor: (r) => r.hesap_adi },
                { header: 'Hareket Sayısı', accessor: (r) => r.hareket_sayisi },
                { header: 'Toplam Borç', accessor: (r) => r.toplam_borc },
                { header: 'Toplam Alacak', accessor: (r) => r.toplam_alacak },
                { header: 'Bakiye', accessor: (r) => r.toplam_borc - r.toplam_alacak },
              ])}
              disabled={hesaplar.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-[#0049AA] rounded-lg hover:bg-[#00287F] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              CSV İndir
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex gap-6">
          {/* Hesap Listesi */}
          <div className="w-96 bg-white rounded-xl shadow-sm border border-[#E5E5E5] overflow-hidden">
            <div className="p-4 border-b border-[#E5E5E5]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#969696]" />
                <input
                  type="text"
                  placeholder="Hesap kodu veya adı ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#0078D0]"
                />
              </div>
            </div>

            <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <RefreshCw className="w-6 h-6 text-[#0078D0] animate-spin mx-auto mb-2" />
                  <p className="text-sm text-[#969696]">Yükleniyor...</p>
                </div>
              ) : filteredHesaplar.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-[#969696]">Hesap bulunamadı</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E5E5E5]">
                  {filteredHesaplar.map((hesap) => (
                    <button
                      key={hesap.hesap_kodu}
                      onClick={() => {
                        setSelectedHesap(hesap.hesap_kodu);
                        setPage(1);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-[#F5F6F8] transition-colors ${
                        selectedHesap === hesap.hesap_kodu ? 'bg-[#E6F9FF] border-l-4 border-[#0078D0]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#2E2E2E]">
                            {hesap.hesap_kodu}
                          </p>
                          <p className="text-xs text-[#969696] truncate">
                            {hesap.hesap_adi}
                          </p>
                        </div>
                        <div className="text-right ml-2">
                          <p className="text-xs text-[#969696]">
                            {hesap.hareket_sayisi} hareket
                          </p>
                        </div>
                      </div>
                      <div className="mt-1 flex justify-between text-xs">
                        <span className="text-[#00804D]">
                          B: {formatCurrency(hesap.toplam_borc)}
                        </span>
                        <span className="text-[#BF192B]">
                          A: {formatCurrency(hesap.toplam_alacak)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Hesap Hareketleri */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-[#E5E5E5] overflow-hidden">
            {!selectedHesap ? (
              <div className="p-12 text-center">
                <BookOpen className="w-12 h-12 text-[#B4B4B4] mx-auto mb-4" />
                <p className="text-[#969696]">
                  Soldaki listeden bir hesap seçin
                </p>
              </div>
            ) : loadingHareketler ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 text-[#0078D0] animate-spin mx-auto mb-4" />
                <p className="text-[#969696]">Hareketler yükleniyor...</p>
              </div>
            ) : (
              <>
                {/* Hesap Başlığı */}
                <div className="px-4 py-3 bg-[#F5F6F8] border-b border-[#E5E5E5]">
                  <h3 className="font-semibold text-[#2E2E2E]">{selectedHesap}</h3>
                  <p className="text-sm text-[#969696]">
                    {hareketler[0]?.kebir_hesap_adi || hareketler[0]?.hesap_adi || '-'}
                  </p>
                </div>

                {/* Tablo */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#F5F6F8] border-b border-[#E5E5E5]">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-[#5A5A5A]">
                          Tarih
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-[#5A5A5A]">
                          Fiş No
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-[#5A5A5A]">
                          Açıklama
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-[#5A5A5A]">
                          Borç
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-[#5A5A5A]">
                          Alacak
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-[#5A5A5A]">
                          Bakiye
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5E5]">
                      {hareketler.map((h) => (
                        <tr key={h.id} className="hover:bg-[#F5F6F8]">
                          <td className="px-3 py-2 text-sm text-[#5A5A5A]">
                            {formatDate(h.tarih)}
                          </td>
                          <td className="px-3 py-2 text-sm text-[#2E2E2E]">
                            {h.fis_no || h.madde_no || '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-[#5A5A5A] max-w-xs truncate">
                            {h.aciklama || '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-right font-mono text-[#00804D]">
                            {h.borc > 0 ? formatCurrency(h.borc) : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-right font-mono text-[#BF192B]">
                            {h.alacak > 0 ? formatCurrency(h.alacak) : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-right font-mono">
                            {formatCurrency(h.bakiye)} {h.bakiye_turu}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="px-4 py-3 border-t border-[#E5E5E5] flex items-center justify-between">
                  <p className="text-sm text-[#969696]">
                    Sayfa {page} / {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 text-[#5A5A5A] hover:text-[#2E2E2E] disabled:opacity-50"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-2 text-[#5A5A5A] hover:text-[#2E2E2E] disabled:opacity-50"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
