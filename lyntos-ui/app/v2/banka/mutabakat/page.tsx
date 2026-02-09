'use client';

/**
 * Banka - Mizan Mutabakat Sayfası
 *
 * MAXİM DÜZELTME:
 * - Tarih bazlı doğru dönem sonu bakiye
 * - Yüzdesel fark gösterimi
 * - Eksik veri uyarıları
 */

import { useState, useEffect } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useDashboardScope } from '../../_components/scope/ScopeProvider';
import { ScopeGuide } from '../../_components/shared/ScopeGuide';
import { DataFreshness } from '../../_components/shared/DataFreshness';
import { API_BASE_URL } from '../../_lib/config/api';
import { getAuthToken } from '../../_lib/auth';
import { formatCurrency, formatPeriod } from '../../_lib/format';

interface MutabakatSatir {
  hesap_kodu: string;
  hesap_adi: string | null;
  banka_adi: string | null;
  mizan_bakiye: number;
  banka_bakiye: number;
  fark: number;
  fark_yuzde: number;
  durum: 'OK' | 'UYARI' | 'FARK';
  aciklama: string | null;
}

interface MutabakatOzet {
  toplam_hesap: number;
  esit_hesap: number;
  farkli_hesap: number;
}

export default function BankaMutabakatPage() {
  const { scope, isReady } = useDashboardScope();

  const [mutabakat, setMutabakat] = useState<MutabakatSatir[]>([]);
  const [ozet, setOzet] = useState<MutabakatOzet | null>(null);
  const [toplamFark, setToplamFark] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);

  // Scope'tan client_id ve period al
  const clientId = scope.client_id;
  const periodId = scope.period;

  // Dönem seçili mi kontrol et
  const isScopeComplete = Boolean(clientId && periodId);

  const fetchMutabakat = async () => {
    if (!isScopeComplete) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        client_id: clientId,
        period_id: periodId,
      });

      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/v2/banka/mutabakat?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMutabakat(data.mutabakat || []);
        setOzet(data.ozet || null);
        setToplamFark(data.toplam_fark || 0);
        setLastFetchedAt(new Date().toISOString());
      }
    } catch (err) {
      console.error('Mutabakat fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Scope değiştiğinde verileri yükle
  useEffect(() => {
    if (isReady && isScopeComplete) {
      fetchMutabakat();
    } else {
      setMutabakat([]);
      setOzet(null);
      setToplamFark(0);
    }
  }, [clientId, periodId, isReady]);

  const getDurumBadge = (durum: string, aciklama: string | null) => {
    switch (durum) {
      case 'OK':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#00804D] bg-[#ECFDF5] rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            OK
          </span>
        );
      case 'UYARI':
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#FA841E] bg-[#FFFBEB] rounded-full"
            title={aciklama || ''}
          >
            <AlertTriangle className="w-3 h-3" />
            UYARI
          </span>
        );
      case 'FARK':
      default:
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#BF192B] bg-[#FEF2F2] rounded-full"
            title={aciklama || ''}
          >
            <XCircle className="w-3 h-3" />
            FARK
          </span>
        );
    }
  };

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
          <h1 className="text-2xl font-bold text-[#2E2E2E]">Banka - Mizan Mutabakatı</h1>
        </div>
        <div className="p-6">
          <ScopeGuide
            variant="full"
            description="Mutabakat kontrolü için üstteki menüden bir mükellef ve dönem seçin."
          />
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
            <h1 className="text-2xl font-bold text-[#2E2E2E]">Banka - Mizan Mutabakatı</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-[#969696]">
                {formatPeriod(periodId)} - Banka bakiyeleri ile Mizan 102 hesapları karşılaştırması
              </p>
              <DataFreshness lastUpdated={lastFetchedAt} />
            </div>
          </div>
          <button
            onClick={fetchMutabakat}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[#5A5A5A] hover:text-[#2E2E2E] border border-[#B4B4B4] rounded-lg hover:bg-[#F5F6F8]"
          >
            <RefreshCw className="w-4 h-4" />
            Yenile
          </button>
        </div>
      </div>

      {/* Summary */}
      {ozet && (
        <div className="px-6 py-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-[#E5E5E5]">
              <p className="text-sm text-[#969696]">Toplam Hesap</p>
              <p className="text-2xl font-bold text-[#2E2E2E]">{ozet.toplam_hesap}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-[#AAE8B8] bg-[#ECFDF5]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#00804D]" />
                <p className="text-sm text-[#00804D]">Eşleşen</p>
              </div>
              <p className="text-2xl font-bold text-[#00804D]">{ozet.esit_hesap}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-[#FFC7C9] bg-[#FEF2F2]">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-[#BF192B]" />
                <p className="text-sm text-[#BF192B]">Farklı</p>
              </div>
              <p className="text-2xl font-bold text-[#BF192B]">{ozet.farkli_hesap}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-[#E5E5E5]">
              <p className="text-sm text-[#969696]">Toplam Fark</p>
              <p className={`text-2xl font-bold ${toplamFark > 0 ? 'text-[#BF192B]' : 'text-[#00804D]'}`}>
                {formatCurrency(toplamFark)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-6 pb-6">
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E5E5] overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 text-[#0078D0] animate-spin mx-auto mb-4" />
              <p className="text-[#969696]">Mutabakat hesaplanıyor...</p>
            </div>
          ) : mutabakat.length === 0 ? (
            <div className="p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <p className="text-[#969696]">Mutabakat verisi bulunamadı</p>
              <p className="text-sm text-[#969696] mt-2">
                102.xx hesapları için mizan ve banka verisi yüklü olmalıdır.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-[#F5F6F8] border-b border-[#E5E5E5]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#5A5A5A] uppercase">
                    Hesap Kodu
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#5A5A5A] uppercase">
                    Hesap Adı
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#5A5A5A] uppercase">
                    Banka
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">
                    Mizan Bakiye
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[#5A5A5A]">
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">
                    Banka Bakiye
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">
                    Fark
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[#5A5A5A] uppercase">
                    Durum
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {mutabakat.map((row, idx) => (
                  <tr
                    key={`${row.hesap_kodu}-${idx}`}
                    className={`hover:bg-[#F5F6F8] ${
                      row.durum === 'FARK' ? 'bg-[#FEF2F2]' : row.durum === 'UYARI' ? 'bg-[#FFFBEB]' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-[#2E2E2E]">
                      {row.hesap_kodu}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#5A5A5A] max-w-xs truncate" title={row.hesap_adi || ''}>
                      {row.hesap_adi ? (row.hesap_adi.length > 40 ? row.hesap_adi.slice(0, 40) + '...' : row.hesap_adi) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#5A5A5A]">
                      {row.banka_adi || (
                        <span className="text-[#FA841E] flex items-center gap-1">
                          <Info className="w-3 h-3" />
                          Eksik
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-[#2E2E2E]">
                      {formatCurrency(row.mizan_bakiye)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ArrowRight className="w-4 h-4 text-[#969696] mx-auto" />
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-[#2E2E2E]">
                      {formatCurrency(row.banka_bakiye)}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm text-right font-mono font-semibold ${
                        row.durum === 'OK' ? 'text-[#00804D]' : row.durum === 'UYARI' ? 'text-[#FA841E]' : 'text-[#BF192B]'
                      }`}
                    >
                      {formatCurrency(row.fark)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getDurumBadge(row.durum, row.aciklama)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Info Banner */}
        {mutabakat.some(m => m.aciklama?.includes('Banka ekstresi yüklenmemiş')) && (
          <div className="mt-4 bg-[#FFFBEB] border border-[#FFF08C] rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#FA841E] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#E67324]">Eksik Banka Verisi Tespit Edildi</p>
              <p className="text-sm text-[#FA841E] mt-1">
                Bazı hesaplar için banka ekstresi yüklenmemiş. Doğru mutabakat için ilgili banka ekstrelerini yükleyin.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
