'use client';

/**
 * E-Defter Rapor Sayfası
 *
 * GİB'e gönderilen e-defterlerin durumu ve içerik özeti
 * Orchestrator: delegates rendering to sub-components
 */

import { useState, useEffect } from 'react';
import { RefreshCw, Info } from 'lucide-react';
import { useDashboardScope } from '../../_components/scope/ScopeProvider';
import { ScopeGuide } from '../../_components/shared/ScopeGuide';
import { DataFreshness } from '../../_components/shared/DataFreshness';
import { API_BASE_URL } from '../../_lib/config/api';
import { getAuthToken } from '../../_lib/auth';
import type { EDefterRapor, RaporSummary, ClientInfo } from './types';
import { GibGonderimDurumu } from './GibGonderimDurumu';
import { IcerikOzeti } from './IcerikOzeti';
import { DefterListesi } from './DefterListesi';
import { DefterDetay } from './DefterDetay';

export default function EDefterRaporPage() {
  const { scope, isReady } = useDashboardScope();
  const [raporlar, setRaporlar] = useState<EDefterRapor[]>([]);
  const [summary, setSummary] = useState<RaporSummary | null>(null);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRapor, setSelectedRapor] = useState<EDefterRapor | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);

  const clientId = scope.client_id;
  const periodId = scope.period;
  const isScopeComplete = Boolean(clientId && periodId);

  const fetchRaporlar = async () => {
    if (!isScopeComplete) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        client_id: clientId,
        period_id: periodId,
      });

      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/v2/edefter/rapor?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRaporlar(data.raporlar || []);
        setSummary(data.summary || null);
        setClientInfo(data.client_info || null);
        setLastFetchedAt(new Date().toISOString());
        if (data.raporlar && data.raporlar.length > 0) {
          setSelectedRapor(data.raporlar[0]);
        }
      } else {
        console.error('E-Defter rapor API hatası:', response.status);
      }
    } catch (err) {
      console.error('E-Defter rapor yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isReady && isScopeComplete) {
      fetchRaporlar();
    } else if (isReady && !isScopeComplete) {
      setLoading(false);
    }
  }, [isReady, clientId, periodId]);

  // Scope hazır değilse
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

  if (!isScopeComplete) {
    return (
      <div className="min-h-screen bg-[#F5F6F8]">
        <div className="bg-white border-b border-[#E5E5E5] px-6 py-4">
          <h1 className="text-2xl font-bold text-[#2E2E2E]">E-Defter Kontrol</h1>
          <p className="text-sm text-[#969696] mt-1">GİB E-Defter Durumu ve İçerik Özeti</p>
        </div>
        <div className="px-6 py-12">
          <ScopeGuide variant="banner" description="E-Defter kontrolü için üstteki menülerden bir mükellef ve dönem seçin." />
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
            <h1 className="text-2xl font-bold text-[#2E2E2E]">E-Defter Kontrol</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-[#969696]">
                {periodId} dönemi için GİB&apos;e gönderilen e-defter dosyalarının durumu ve içerik özeti
              </p>
              <DataFreshness lastUpdated={lastFetchedAt} />
            </div>
          </div>
          <button
            onClick={fetchRaporlar}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[#5A5A5A] hover:text-[#2E2E2E] border border-[#B4B4B4] rounded-lg hover:bg-[#F5F6F8] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>
      </div>

      {/* Açıklama Bilgi Kutusu */}
      <div className="px-6 pt-4">
        <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-[#0049AA] mt-0.5 flex-shrink-0" />
            <div className="text-sm text-[#00287F]">
              <p className="font-medium mb-1">Bu sayfa ne işe yarar?</p>
              <p className="text-[#0049AA]">
                LYNTOS&apos;a yüklediğiniz e-defter XML dosyalarının (Yevmiye, Kebir, Beratlar) içerik özetini gösterir.
                Borç-alacak dengesini, toplam fiş sayısını ve defter tiplerine göre dağılımı kontrol edebilirsiniz.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* GİB Gönderim Durumu */}
      <GibGonderimDurumu raporlar={raporlar} />

      {/* İçerik Özet Kartları */}
      <IcerikOzeti raporCount={raporlar.length} summary={summary} />

      {/* Content: Defter Listesi + Detay */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-3 gap-6">
          <DefterListesi
            raporlar={raporlar}
            selectedRapor={selectedRapor}
            onSelect={setSelectedRapor}
            loading={loading}
          />
          <DefterDetay
            selectedRapor={selectedRapor}
            clientInfo={clientInfo}
          />
        </div>
      </div>
    </div>
  );
}
