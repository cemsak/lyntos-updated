'use client';

/**
 * Banka Hareketleri Sayfası
 *
 * Header'daki dönem seçiciye bağlı çalışır.
 * Dönem seçilmeden veri göstermez.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Building2,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  ArrowRight,
} from 'lucide-react';
import { ScopeGuide } from '../_components/shared/ScopeGuide';
import { useDashboardScope } from '../_components/scope/ScopeProvider';
import { exportToCsv } from '../_lib/exportCsv';
import { DataFreshness } from '../_components/shared/DataFreshness';
import { api } from '../_lib/api/client';
import { formatCurrency, formatDate, formatPeriod } from '../_lib/format';

interface BankaHesap {
  banka_adi: string;
  hesap_kodu: string;
  islem_sayisi: number;
  toplam_giris: number;
  toplam_cikis: number;
  son_bakiye: number;
}

interface BankaIslem {
  id: number;
  banka_adi: string;
  hesap_kodu: string;
  tarih: string;
  aciklama: string;
  tutar: number;
  bakiye: number;
  islem_tipi: string;
}

export default function BankaPage() {
  const router = useRouter();
  const { scope, isReady } = useDashboardScope();

  const [hesaplar, setHesaplar] = useState<BankaHesap[]>([]);
  const [islemler, setIslemler] = useState<BankaIslem[]>([]);
  const [selectedHesap, setSelectedHesap] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingIslemler, setLoadingIslemler] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [ozet, setOzet] = useState<{ toplam_giris: number; toplam_cikis: number; islem_sayisi: number }>({
    toplam_giris: 0,
    toplam_cikis: 0,
    islem_sayisi: 0,
  });
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);

  // Scope'tan client_id ve period al
  const clientId = scope.client_id;
  const periodId = scope.period;

  // Dönem seçili mi kontrol et
  const isScopeComplete = Boolean(clientId && periodId);

  const fetchHesaplar = async () => {
    if (!isScopeComplete) return;

    setLoading(true);
    try {
      const { data } = await api.get<{ hesaplar: BankaHesap[] }>(
        `/api/v2/banka/hesaplar?client_id=${clientId}&period_id=${periodId}`
      );

      if (data) {
        setHesaplar(data.hesaplar || []);
        setLastFetchedAt(new Date().toISOString());
      }
    } catch (err) {
      console.error('Hesaplar fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchIslemler = async (hesapKodu?: string) => {
    if (!isScopeComplete) return;

    setLoadingIslemler(true);
    try {
      const params = new URLSearchParams({
        client_id: clientId,
        period_id: periodId,
        page: page.toString(),
        page_size: '50',
      });

      if (hesapKodu) {
        params.append('hesap_kodu', hesapKodu);
      }

      const { data } = await api.get<{ islemler: BankaIslem[]; total: number; pages: number; ozet: { toplam_giris: number; toplam_cikis: number; islem_sayisi: number } }>(
        `/api/v2/banka/islemler?${params}`
      );

      if (data) {
        setIslemler(data.islemler || []);
        setTotal(data.total || 0);
        setTotalPages(data.pages || 1);
        setOzet(data.ozet || { toplam_giris: 0, toplam_cikis: 0, islem_sayisi: 0 });
      }
    } catch (err) {
      console.error('İşlemler fetch error:', err);
    } finally {
      setLoadingIslemler(false);
    }
  };

  // Scope değiştiğinde verileri yükle
  useEffect(() => {
    if (isReady && isScopeComplete) {
      setSelectedHesap(null);
      fetchHesaplar();
      fetchIslemler();
    } else {
      setHesaplar([]);
      setIslemler([]);
      setOzet({ toplam_giris: 0, toplam_cikis: 0, islem_sayisi: 0 });
    }
  }, [clientId, periodId, isReady]);

  // Hesap veya sayfa değiştiğinde işlemleri yükle
  useEffect(() => {
    if (isReady && isScopeComplete) {
      fetchIslemler(selectedHesap || undefined);
    }
  }, [selectedHesap, page]);

  const filteredIslemler = islemler.filter(
    (i) =>
      i.aciklama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.hesap_kodu?.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-2xl font-bold text-[#2E2E2E]">Banka Hareketleri</h1>
        </div>
        <div className="p-6">
          <ScopeGuide variant="banner" description="Banka hareketlerini görüntülemek için üstteki menülerden bir dönem seçin." />
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
            <h1 className="text-2xl font-bold text-[#2E2E2E]">Banka Hareketleri</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-[#969696]">
                {formatPeriod(periodId)} - {total.toLocaleString('tr-TR')} işlem
              </p>
              <DataFreshness lastUpdated={lastFetchedAt} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchHesaplar();
                fetchIslemler();
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-[#5A5A5A] hover:text-[#2E2E2E] border border-[#B4B4B4] rounded-lg hover:bg-[#F5F6F8]"
            >
              <RefreshCw className="w-4 h-4" />
              Yenile
            </button>
            <button
              onClick={() => router.push('/v2/mutabakat')}
              className="flex items-center gap-2 px-4 py-2 text-sm text-[#0049AA] bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg hover:bg-[#ABEBFF] transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              Banka Mutabakat
            </button>
            <button
              onClick={() => exportToCsv(`banka_${periodId}`, islemler, [
                { header: 'Banka', accessor: (r) => r.banka_adi },
                { header: 'Hesap Kodu', accessor: (r) => r.hesap_kodu },
                { header: 'Tarih', accessor: (r) => r.tarih },
                { header: 'Açıklama', accessor: (r) => r.aciklama },
                { header: 'Tutar', accessor: (r) => r.tutar },
                { header: 'Bakiye', accessor: (r) => r.bakiye },
                { header: 'İşlem Tipi', accessor: (r) => r.islem_tipi },
              ])}
              disabled={islemler.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-[#0049AA] rounded-lg hover:bg-[#00287F] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              CSV İndir
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-[#E5E5E5]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#E6F9FF] rounded-lg">
                <Building2 className="w-5 h-5 text-[#0049AA]" />
              </div>
              <div>
                <p className="text-sm text-[#969696]">Toplam Hesap</p>
                <p className="text-xl font-bold text-[#2E2E2E]">{hesaplar.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-[#E5E5E5]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#ECFDF5] rounded-lg">
                <TrendingUp className="w-5 h-5 text-[#00804D]" />
              </div>
              <div>
                <p className="text-sm text-[#969696]">Toplam Giriş</p>
                <p className="text-xl font-bold text-[#00804D]">
                  {formatCurrency(ozet.toplam_giris)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-[#E5E5E5]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#FEF2F2] rounded-lg">
                <TrendingDown className="w-5 h-5 text-[#BF192B]" />
              </div>
              <div>
                <p className="text-sm text-[#969696]">Toplam Çıkış</p>
                <p className="text-xl font-bold text-[#BF192B]">
                  {formatCurrency(ozet.toplam_cikis)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-[#E5E5E5]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#E6F9FF] rounded-lg">
                <ArrowRightLeft className="w-5 h-5 text-[#0049AA]" />
              </div>
              <div>
                <p className="text-sm text-[#969696]">İşlem Sayısı</p>
                <p className="text-xl font-bold text-[#2E2E2E]">
                  {ozet.islem_sayisi.toLocaleString('tr-TR')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-6">
        <div className="flex gap-6">
          {/* Hesap Listesi */}
          <div className="w-72 bg-white rounded-xl shadow-sm border border-[#E5E5E5] overflow-hidden">
            <div className="p-3 border-b border-[#E5E5E5] bg-[#F5F6F8]">
              <h3 className="font-semibold text-sm text-[#5A5A5A]">Banka Hesapları</h3>
            </div>
            <div className="divide-y divide-[#E5E5E5] max-h-[500px] overflow-y-auto">
              <button
                onClick={() => {
                  setSelectedHesap(null);
                  setPage(1);
                }}
                className={`w-full px-4 py-3 text-left hover:bg-[#F5F6F8] ${
                  !selectedHesap ? 'bg-[#E6F9FF] border-l-4 border-[#0078D0]' : ''
                }`}
              >
                <p className="text-sm font-medium text-[#2E2E2E]">Tüm Hesaplar</p>
                <p className="text-xs text-[#969696]">
                  {hesaplar.reduce((sum, h) => sum + h.islem_sayisi, 0)} işlem
                </p>
              </button>
              {hesaplar.map((h, idx) => (
                <button
                  key={`${h.hesap_kodu}-${idx}`}
                  onClick={() => {
                    setSelectedHesap(h.hesap_kodu);
                    setPage(1);
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-[#F5F6F8] ${
                    selectedHesap === h.hesap_kodu ? 'bg-[#E6F9FF] border-l-4 border-[#0078D0]' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-[#2E2E2E]">{h.hesap_kodu}</p>
                      <p className="text-xs text-[#969696]">{h.banka_adi}</p>
                    </div>
                    <span className="text-xs text-[#969696]">{h.islem_sayisi}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* İşlem Tablosu */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-[#E5E5E5] overflow-hidden">
            {/* Filters */}
            <div className="p-4 border-b border-[#E5E5E5]">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#969696]" />
                <input
                  type="text"
                  placeholder="Açıklama ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#0078D0]"
                />
              </div>
            </div>

            {loadingIslemler ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 text-[#0078D0] animate-spin mx-auto mb-4" />
                <p className="text-[#969696]">Yükleniyor...</p>
              </div>
            ) : filteredIslemler.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-[#969696]">Bu dönem için banka işlemi bulunamadı.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#F5F6F8] border-b border-[#E5E5E5]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[#5A5A5A]">
                          Tarih
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[#5A5A5A]">
                          Hesap
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[#5A5A5A]">
                          Açıklama
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-[#5A5A5A]">
                          Tutar
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-[#5A5A5A]">
                          Bakiye
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5E5]">
                      {filteredIslemler.map((islem) => (
                        <tr key={islem.id} className="hover:bg-[#F5F6F8]">
                          <td className="px-4 py-3 text-sm text-[#5A5A5A]">
                            {formatDate(islem.tarih)}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#2E2E2E]">
                            <span className="font-medium">{islem.hesap_kodu}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#5A5A5A] max-w-md truncate">
                            {islem.aciklama || '-'}
                          </td>
                          <td
                            className={`px-4 py-3 text-sm text-right font-mono ${
                              islem.tutar >= 0 ? 'text-[#00804D]' : 'text-[#BF192B]'
                            }`}
                          >
                            {islem.tutar >= 0 ? '+' : ''}
                            {formatCurrency(islem.tutar)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-mono text-[#2E2E2E]">
                            {formatCurrency(islem.bakiye)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="px-4 py-3 border-t border-[#E5E5E5] flex items-center justify-between">
                  <p className="text-sm text-[#969696]">
                    Sayfa {page} / {totalPages} ({total.toLocaleString('tr-TR')} işlem)
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
