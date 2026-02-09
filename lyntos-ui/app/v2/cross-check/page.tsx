'use client';

/**
 * Defter Kontrol Sayfası - Orchestrator
 *
 * Muhasebe defterleri tutarlılık kontrolü:
 * C1: Yevmiye Defter Dengesi (Borç = Alacak)
 * C2: Yevmiye ↔ Kebir Mutabakatı
 * C3: Kebir ↔ Mizan Mutabakatı
 * C4: Mizan Dengesi (Borç = Alacak)
 */

import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, FileText } from 'lucide-react';
import { useDashboardScope } from '../_components/scope/ScopeProvider';
import { ScopeGuide } from '../_components/shared/ScopeGuide';
import { DataFreshness } from '../_components/shared/DataFreshness';
import { API_BASE_URL } from '../_lib/config/api';
import { getAuthToken } from '../_lib/auth';

// Types
import type { FullReportResponse, OpeningBalanceStatus, FilterType, TabType } from './_types';

// Components
import {
  getOverallStatusBadge,
  OpeningBalanceCard,
  BalanceChecksPanel,
  ReconciliationPanel,
} from './_components';

export default function CrossCheckPage() {
  const { scope, isReady } = useDashboardScope();

  const [data, setData] = useState<FullReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('c3');
  const [filter, setFilter] = useState<FilterType>('all');
  const [openingBalance, setOpeningBalance] = useState<OpeningBalanceStatus | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);

  const clientId = scope.client_id;
  const periodId = scope.period;
  const isScopeComplete = Boolean(clientId && periodId);

  const fetchCrossCheck = async () => {
    if (!isScopeComplete) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        client_id: clientId,
        period_id: periodId,
      });

      // Defter kontrol ve açılış bakiyesi verilerini paralel çek
      const token = getAuthToken();
      const authHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const [crossCheckResponse, openingBalanceResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v2/defter-kontrol/full?${params}`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/api/v2/opening-balance/${clientId}/${periodId}/status`, { headers: authHeaders }).catch(() => null)
      ]);

      if (crossCheckResponse.ok) {
        const result = await crossCheckResponse.json();
        setData(result);
        setLastFetchedAt(new Date().toISOString());
      } else {
        const errData = await crossCheckResponse.json().catch(() => ({}));
        setError(errData.detail || 'Veri yüklenirken hata oluştu');
      }

      // Açılış bakiyesi durumu
      if (openingBalanceResponse?.ok) {
        const obResult = await openingBalanceResponse.json();
        setOpeningBalance(obResult);
      } else {
        // API yoksa veya hata varsa varsayılan "yüklenmedi" durumu
        setOpeningBalance({
          has_data: false,
          status: 'missing',
          status_color: 'red',
          status_text: 'Açılış bakiyesi yüklenmedi',
          hesap_sayisi: 0,
          toplam_borc: 0,
          toplam_alacak: 0,
          is_balanced: false
        });
      }
    } catch (err) {
      console.error('Defter kontrol hatası:', err);
      setError('Sunucuya bağlanılamadı');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isReady && isScopeComplete) {
      fetchCrossCheck();
    }
  }, [isReady, clientId, periodId]);

  // Loading state
  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-[#0078D0] animate-spin mx-auto mb-4" />
          <p className="text-[#969696]">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Scope incomplete state
  if (!isScopeComplete) {
    return (
      <div className="min-h-screen bg-[#F5F6F8]">
        <div className="bg-white border-b border-[#E5E5E5] px-6 py-4">
          <h1 className="text-2xl font-bold text-[#2E2E2E]">Defter Kontrolü</h1>
          <p className="text-sm text-[#969696] mt-1">Yevmiye, Kebir ve Mizan tutarlılık kontrolü</p>
        </div>
        <div className="px-6 py-12">
          <ScopeGuide variant="banner" description="Çapraz kontrol için üstteki menülerden bir mükellef ve dönem seçin." />
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
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#2E2E2E]">Defter Kontrolü</h1>
              {data && data.summary.overall_status !== 'NO_DATA' && getOverallStatusBadge(data.summary.overall_status)}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-[#969696]">
                {periodId} - Yevmiye, Kebir ve Mizan Tutarlılık Kontrolü
              </p>
              <DataFreshness lastUpdated={lastFetchedAt} />
            </div>
          </div>
          <button
            onClick={fetchCrossCheck}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[#5A5A5A] hover:text-[#2E2E2E] border border-[#B4B4B4] rounded-lg hover:bg-[#F5F6F8] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-6 py-4">
          <div className="bg-[#FEF2F2] border border-[#FFC7C9] rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#F0282D]" />
            <p className="text-[#BF192B]">{error}</p>
          </div>
        </div>
      )}

      {/* Content — NO_DATA: Veri yoksa empty state göster */}
      {data && data.summary.overall_status === 'NO_DATA' && (
        <div className="px-6 py-12">
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-12 flex flex-col items-center justify-center">
            <FileText className="w-12 h-12 text-[#969696] mb-4" />
            <h3 className="text-lg font-semibold text-[#2E2E2E] mb-2">Defter Verisi Bulunamadı</h3>
            <p className="text-[#5A5A5A] text-center max-w-md">
              Bu dönem için yevmiye, kebir veya mizan verisi yüklenmemiş.
              Defter kontrolü yapabilmek için önce veri yükleyin.
            </p>
          </div>
        </div>
      )}

      {data && data.summary.overall_status !== 'NO_DATA' && (
        <>
          {/* TD-002: Açılış Bakiyesi Uyarısı */}
          {openingBalance && (
            <div className="px-6 pt-4">
              <OpeningBalanceCard openingBalance={openingBalance} />
            </div>
          )}

          {/* Özet Kartları */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 border border-[#E5E5E5]">
                <p className="text-sm text-[#969696] mb-1">Toplam Kontrol</p>
                <p className="text-2xl font-bold text-[#2E2E2E]">{data.summary.total_checks}</p>
              </div>
              <div className="bg-[#ECFDF5] rounded-xl p-4 border border-[#AAE8B8]">
                <p className="text-sm text-[#00804D] mb-1">Başarılı</p>
                <p className="text-2xl font-bold text-[#00804D]">{data.summary.passed_checks}</p>
              </div>
              <div className="bg-[#FFFBEB] rounded-xl p-4 border border-[#FFF08C]">
                <p className="text-sm text-[#FA841E] mb-1">Uyarı</p>
                <p className="text-2xl font-bold text-[#FA841E]">{data.summary.warning_checks}</p>
              </div>
              <div className="bg-[#FEF2F2] rounded-xl p-4 border border-[#FFC7C9]">
                <p className="text-sm text-[#BF192B] mb-1">Hata / Kritik</p>
                <p className="text-2xl font-bold text-[#BF192B]">
                  {data.summary.error_checks + data.summary.critical_checks}
                </p>
              </div>
            </div>
          </div>

          {/* C1 & C4: Denge Kontrolleri */}
          <div className="px-6 py-2">
            <BalanceChecksPanel balanceChecks={data.balance_checks} />
          </div>

          {/* C2 & C3: Mutabakat Kontrolleri */}
          <div className="px-6 py-2">
            <ReconciliationPanel
              reconciliationChecks={data.reconciliation_checks}
              yevmiyeKebirDetails={data.yevmiye_kebir_details}
              kebirMizanDetails={data.kebir_mizan_details}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              filter={filter}
              setFilter={setFilter}
              loading={loading}
            />
          </div>
        </>
      )}
    </div>
  );
}
