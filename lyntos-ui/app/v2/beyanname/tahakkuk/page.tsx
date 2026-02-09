'use client';

/**
 * Tahakkuk Sayfası
 *
 * Header'daki dönem seçiciye bağlı çalışır.
 * Dönem seçilmeden veri göstermez.
 */

import { useState, useEffect } from 'react';
import { RefreshCw, FileText, Calendar, AlertCircle as AlertIcon, CheckCircle2 } from 'lucide-react';
import { ScopeGuide } from '../../_components/shared/ScopeGuide';
import { useDashboardScope } from '../../_components/scope/ScopeProvider';
import { API_BASE_URL } from '../../_lib/config/api';
import { formatCurrency, formatPeriod } from '../../_lib/format';

interface Tahakkuk {
  id: number;
  period_id: string;
  vergi_turu: string | null;
  tahakkuk_tutari: number;
  gecikme_faizi: number;
  gecikme_zammi: number;
  toplam_borc: number;
  source_file: string | null;
  tahakkuk_tarihi: string | null;
}

interface TahakkukOzet {
  toplam_borc: number;
  kayit_sayisi: number;
}

export default function TahakkukPage() {
  const { scope, isReady } = useDashboardScope();

  const [tahakkuklar, setTahakkuklar] = useState<Tahakkuk[]>([]);
  const [ozet, setOzet] = useState<TahakkukOzet | null>(null);
  const [loading, setLoading] = useState(false);

  // Scope'tan client_id ve period al
  const clientId = scope.client_id;
  const periodId = scope.period;

  // Dönem seçili mi kontrol et
  const isScopeComplete = Boolean(clientId && periodId);

  const fetchData = async () => {
    if (!isScopeComplete) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        client_id: clientId,
        period_id: periodId,
      });

      const response = await fetch(`${API_BASE_URL}/api/v2/beyanname/tahakkuk?${params}`);

      if (response.ok) {
        const data = await response.json();
        setTahakkuklar(data.tahakkuklar || []);
        setOzet(data.ozet || null);
      }
    } catch (err) {
      console.error('Tahakkuk fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Scope değiştiğinde verileri yükle
  useEffect(() => {
    if (isReady && isScopeComplete) {
      fetchData();
    } else {
      setTahakkuklar([]);
      setOzet(null);
    }
  }, [clientId, periodId, isReady]);

  const getTurColor = (tur: string | null) => {
    switch (tur) {
      case 'KDV': return 'bg-[#E6F9FF] text-[#0049AA]';
      case 'MUHTASAR': return 'bg-[#FFFBEB] text-[#FA841E]';
      case 'GECICI_VERGI': return 'bg-[#E6F9FF] text-[#0049AA]';
      case 'POSET': return 'bg-[#ECFDF5] text-[#00804D]';
      default: return 'bg-[#F5F6F8] text-[#5A5A5A]';
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
          <h1 className="text-2xl font-bold text-[#2E2E2E]">Tahakkuklar</h1>
        </div>
        <div className="p-6">
          <ScopeGuide variant="banner" description="Tahakkuk verilerini görüntülemek için üstteki menülerden bir mükellef ve dönem seçin." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <div className="bg-white border-b border-[#E5E5E5] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#2E2E2E]">Tahakkuklar</h1>
            <p className="text-sm text-[#969696] mt-1">{formatPeriod(periodId)} - Vergi Borçları</p>
          </div>
          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 text-sm text-[#5A5A5A] hover:text-[#2E2E2E] border border-[#B4B4B4] rounded-lg hover:bg-[#F5F6F8]">
            <RefreshCw className="w-4 h-4" />
            Yenile
          </button>
        </div>
      </div>

      {ozet && ozet.kayit_sayisi > 0 && (
        <div className="px-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-6 border border-[#E5E5E5]">
              <div className="flex items-center gap-3 mb-2">
                <AlertIcon className="w-6 h-6 text-[#F0282D]" />
                <p className="text-lg text-[#5A5A5A]">Toplam Borç</p>
              </div>
              <p className="text-3xl font-bold text-[#BF192B]">{formatCurrency(ozet.toplam_borc)}</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-[#E5E5E5]">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-6 h-6 text-[#969696]" />
                <p className="text-lg text-[#5A5A5A]">Tahakkuk Sayısı</p>
              </div>
              <p className="text-3xl font-bold text-[#2E2E2E]">{ozet.kayit_sayisi}</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 pb-6">
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E5E5] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E5E5] bg-[#F5F6F8]">
            <h2 className="font-semibold text-[#2E2E2E]">Tahakkuk Listesi</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 text-[#0078D0] animate-spin mx-auto mb-4" />
              <p className="text-[#969696]">Yükleniyor...</p>
            </div>
          ) : tahakkuklar.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-[#00A651] mx-auto mb-4" />
              <p className="text-[#969696]">Tahakkuk bulunamadı</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-[#F5F6F8] border-b border-[#E5E5E5]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#5A5A5A] uppercase">Vergi Türü</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#5A5A5A] uppercase">Tarih</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">Tahakkuk</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">Gecikme</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">Toplam Borç</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {tahakkuklar.map((t) => (
                  <tr key={t.id} className="hover:bg-[#F5F6F8]">
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getTurColor(t.vergi_turu)}`}>
                        {t.vergi_turu || 'Bilinmeyen'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-[#5A5A5A]">
                        <Calendar className="w-4 h-4" />
                        {t.tahakkuk_tarihi || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-[#2E2E2E]">
                      {formatCurrency(t.tahakkuk_tutari)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-[#FA841E]">
                      {formatCurrency(t.gecikme_faizi + t.gecikme_zammi)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-semibold text-[#BF192B]">
                      {formatCurrency(t.toplam_borc)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {ozet && ozet.kayit_sayisi > 0 && (
                <tfoot className="bg-[#F5F6F8] border-t-2 border-[#E5E5E5]">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-right font-semibold text-[#5A5A5A]">
                      TOPLAM
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-lg font-bold text-[#BF192B]">
                      {formatCurrency(ozet.toplam_borc)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
