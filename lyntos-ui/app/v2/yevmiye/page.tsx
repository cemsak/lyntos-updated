'use client';

/**
 * Yevmiye Defteri Sayfası
 *
 * Header'daki dönem seçiciye bağlı çalışır.
 * Dönem seçilmeden veri göstermez.
 */

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
} from 'lucide-react';
import { useDashboardScope } from '../_components/scope/ScopeProvider';
import { ScopeGuide } from '../_components/shared/ScopeGuide';
import { exportToCsv } from '../_lib/exportCsv';
import { DataFreshness } from '../_components/shared/DataFreshness';
import { api } from '../_lib/api/client';
import { formatCurrency, formatDate, formatPeriod } from '../_lib/format';

interface YevmiyeEntry {
  id: number;
  fis_no: string;
  tarih: string;
  fis_aciklama: string | null;
  hesap_kodu: string;
  hesap_adi: string | null;
  tutar: number;
  borc_alacak: string;
  source_file: string;
}

export default function YevmiyePage() {
  const { scope, isReady } = useDashboardScope();
  const searchParams = useSearchParams();
  const hesapParam = searchParams.get('hesap');

  const [entries, setEntries] = useState<YevmiyeEntry[]>([]);
  const [initialHesapApplied, setInitialHesapApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Scope'tan client_id ve period al
  const clientId = scope.client_id;
  const periodId = scope.period;

  // Dönem seçili mi kontrol et
  const isScopeComplete = Boolean(clientId && periodId);

  // URL param'dan hesap araması (drill-down desteği)
  useEffect(() => {
    if (hesapParam && !initialHesapApplied) {
      setSearchTerm(hesapParam);
      setInitialHesapApplied(true);
    }
  }, [hesapParam, initialHesapApplied]);

  const fetchEntries = async () => {
    if (!isScopeComplete) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        client_id: clientId,
        period_id: periodId,
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      // Search varsa ekle
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      // Date filter varsa ekle
      if (dateFrom) {
        params.append('date_from', dateFrom);
      }
      if (dateTo) {
        params.append('date_to', dateTo);
      }

      const { data, error: apiError } = await api.get<{ entries: YevmiyeEntry[]; total: number; pages: number }>(
        `/api/v2/yevmiye/list?${params}`
      );

      if (apiError) throw new Error(apiError);

      setEntries(data?.entries || []);
      setTotal(data?.total || 0);
      setTotalPages(data?.pages || 1);
      setLastFetchedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  };

  // Scope veya page değiştiğinde fetch et
  useEffect(() => {
    if (isReady && isScopeComplete) {
      setPage(1); // Dönem değişince sayfayı sıfırla
      fetchEntries();
    } else {
      // Scope temizlendiyse entries'i de temizle
      setEntries([]);
      setTotal(0);
      setTotalPages(1);
    }
  }, [clientId, periodId, isReady]);

  // Page, search veya tarih filtreleri değiştiğinde (scope sabit iken)
  useEffect(() => {
    if (isReady && isScopeComplete) {
      fetchEntries();
    }
  }, [page, searchTerm, dateFrom, dateTo]);

  // Dönem seçilmemiş uyarısı
  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-[#0078D0] animate-spin" />
      </div>
    );
  }

  if (!isScopeComplete) {
    return (
      <div className="min-h-screen bg-[#F5F6F8]">
        <div className="bg-white border-b border-[#E5E5E5] px-6 py-4">
          <h1 className="text-2xl font-bold text-[#2E2E2E]">Yevmiye Defteri</h1>
        </div>
        <div className="p-6">
          <ScopeGuide variant="banner" description="Yevmiye defteri kayıtlarını görüntülemek için üstteki menülerden bir dönem seçin." />
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
            <h1 className="text-2xl font-bold text-[#2E2E2E]">Yevmiye Defteri</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-[#969696]">
                {formatPeriod(periodId)} - {total.toLocaleString('tr-TR')} kayıt
              </p>
              <DataFreshness lastUpdated={lastFetchedAt} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchEntries}
              className="flex items-center gap-2 px-4 py-2 text-sm text-[#5A5A5A] hover:text-[#2E2E2E] border border-[#B4B4B4] rounded-lg hover:bg-[#F5F6F8]"
            >
              <RefreshCw className="w-4 h-4" />
              Yenile
            </button>
            <button
              onClick={() => exportToCsv(`yevmiye_${periodId}`, entries, [
                { header: 'Fiş No', accessor: (r) => r.fis_no },
                { header: 'Tarih', accessor: (r) => r.tarih },
                { header: 'Hesap Kodu', accessor: (r) => r.hesap_kodu },
                { header: 'Hesap Adı', accessor: (r) => r.hesap_adi },
                { header: 'Açıklama', accessor: (r) => r.fis_aciklama },
                { header: 'Tutar', accessor: (r) => r.tutar },
                { header: 'Borç/Alacak', accessor: (r) => r.borc_alacak === 'B' || r.borc_alacak === 'D' ? 'Borç' : 'Alacak' },
              ])}
              disabled={entries.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-[#0049AA] rounded-lg hover:bg-[#00287F] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              CSV İndir
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#969696]" />
            <input
              type="text"
              placeholder="Fiş no veya açıklama ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#0078D0] focus:border-[#0078D0]"
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#969696]" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-[#B4B4B4] rounded-lg"
              placeholder="Başlangıç"
            />
            <span className="text-[#969696]">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm border border-[#B4B4B4] rounded-lg"
              placeholder="Bitiş"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex gap-6">
          {/* Table */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-[#E5E5E5] overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 text-[#0078D0] animate-spin mx-auto mb-4" />
                <p className="text-[#969696]">Yükleniyor...</p>
              </div>
            ) : error ? (
              <div className="p-12 text-center">
                <p className="text-[#F0282D]">{error}</p>
                <button
                  onClick={fetchEntries}
                  className="mt-4 px-4 py-2 text-sm text-[#0049AA] hover:underline"
                >
                  Tekrar Dene
                </button>
              </div>
            ) : entries.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-[#969696]">Bu dönem için yevmiye kaydı bulunamadı.</p>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-[#F5F6F8] border-b border-[#E5E5E5]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#5A5A5A] uppercase">
                        Fiş No
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#5A5A5A] uppercase">
                        Tarih
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#5A5A5A] uppercase">
                        Hesap Kodu
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#5A5A5A] uppercase">
                        Hesap Adı
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">
                        Tutar
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-[#5A5A5A] uppercase">
                        Borç / Alacak
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5]">
                    {entries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="hover:bg-[#F5F6F8] cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-[#2E2E2E]">
                          {entry.fis_no || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#5A5A5A]">
                          {formatDate(entry.tarih)}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#5A5A5A] font-mono">
                          {entry.hesap_kodu || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#5A5A5A] max-w-xs truncate">
                          {entry.hesap_adi || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-[#2E2E2E] font-mono">
                          {formatCurrency(entry.tutar)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              entry.borc_alacak === 'B' || entry.borc_alacak === 'D'
                                ? 'bg-[#FEF2F2] text-[#BF192B]'
                                : 'bg-[#ECFDF5] text-[#00804D]'
                            }`}
                          >
                            {entry.borc_alacak === 'B' || entry.borc_alacak === 'D' ? 'Borç' : 'Alacak'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="px-4 py-3 border-t border-[#E5E5E5] flex items-center justify-between">
                  <p className="text-sm text-[#969696]">
                    Sayfa {page} / {totalPages} ({total.toLocaleString('tr-TR')} kayıt)
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 text-[#5A5A5A] hover:text-[#2E2E2E] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-2 text-[#5A5A5A] hover:text-[#2E2E2E] disabled:opacity-50 disabled:cursor-not-allowed"
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
