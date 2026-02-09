'use client';
import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { PanelState } from '../shared/PanelState';
import { ExplainModal } from '../kpi/ExplainModal';
import { useFailSoftFetch } from '../hooks/useFailSoftFetch';
import { ENDPOINTS } from '../contracts/endpoints';
import { useScopeComplete } from '../scope/useDashboardScope';
import { formatCurrency as formatCurrencyCentral, formatPercent } from '../../_lib/format';

import type { YiufeData, InflationResult } from './inflationTypes';
import { YIUFE_ESIK_DEGERLERI, normalizeInflation } from './inflationTypes';
import { VukInfoModal } from './VukInfoModal';
import { YiufeIndicators } from './YiufeIndicators';
import { InflationEmptyTable, InflationDataView } from './InflationTable';

export function InflationPanel() {
  // SMMM GÜVENİ: Scope kontrolü
  const scopeComplete = useScopeComplete();

  const [showExplain, setShowExplain] = useState(false);
  const [showVukInfo, setShowVukInfo] = useState(false);

  // SMMM GÜVENİ: Scope yoksa veri çekme
  const envelope = useFailSoftFetch<InflationResult>(
    scopeComplete ? ENDPOINTS.INFLATION_ADJUSTMENT : null,
    normalizeInflation
  );
  const { status, reason_tr, data, analysis, trust, legal_basis_refs, evidence_refs, meta } = envelope;

  // SMMM GÜVENİ: Scope yoksa uyarı göster
  if (!scopeComplete) {
    return (
      <Card title="Enflasyon Muhasebesi" subtitle="VUK Mük. 298">
        <div className="py-8 text-center">
          <span className="text-4xl mb-4 block">📈</span>
          <p className="text-sm text-[#969696]">Dönem seçildikten sonra enflasyon analizi görünecektir.</p>
        </div>
      </Card>
    );
  }

  // Yİ-ÜFE state - TCMB EVDS API'den gelecek
  // Initial isLoading: false to prevent loading spinner before useEffect runs
  const [yiufeData, setYiufeData] = useState<YiufeData>({
    son3Yil: null,
    son3YilEsik: YIUFE_ESIK_DEGERLERI.son3YilEsik,
    son12Ay: null,
    son12AyEsik: YIUFE_ESIK_DEGERLERI.son12AyEsik,
    duzeltmeKatsayisi: null,
    referansTarih: null,
    isLoading: false,
    error: null,
  });

  // TCMB EVDS API'den Yi-UFE verisi cek (Backend API route uzerinden - guvenli)
  React.useEffect(() => {
    const fetchYiufeData = async () => {
      setYiufeData(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Backend API route'u cagir (API key server-side'da guvenli)
        const response = await fetch('/api/v2/tcmb/yiufe');
        const result = await response.json();

        if (!response.ok) {
          // API key eksikse ozel mesaj goster
          if (result.code === 'API_KEY_MISSING') {
            throw new Error('TCMB API anahtari tanimli degil. .env.local dosyasini kontrol edin.');
          }
          throw new Error(result.error || 'Yi-UFE verisi alinamadi');
        }

        if (result.success && result.data) {
          setYiufeData({
            son3Yil: result.data.son3Yil,
            son3YilEsik: YIUFE_ESIK_DEGERLERI.son3YilEsik,
            son12Ay: result.data.son12Ay,
            son12AyEsik: YIUFE_ESIK_DEGERLERI.son12AyEsik,
            duzeltmeKatsayisi: result.data.duzeltmeKatsayisi,
            referansTarih: result.data.referansTarih,
            isLoading: false,
            error: null,
          });
        } else {
          throw new Error('Gecersiz API yaniti');
        }
      } catch (error) {
        console.error('Yi-UFE verisi yuklenemedi:', error);
        setYiufeData(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Baglanti hatasi',
        }));
      }
    };

    fetchYiufeData();
  }, []);

  const formatCurrency = (n: number) => formatCurrencyCentral(n);
  const formatPct = (n: number) => formatPercent(n);

  // Check if we have real data
  const hasData = data && data.items && data.items.length > 0;
  const hasYiufeData = yiufeData.son3Yil !== null && yiufeData.son12Ay !== null;

  return (
    <>
      <Card
        title={
          <span className="flex items-center gap-2">
            Enflasyon Muhasebesi
            <button
              onClick={() => setShowVukInfo(true)}
              className="text-[#969696] hover:text-[#0049AA] transition-colors"
              title="VUK Geçici Madde 33 Nedir?"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </span>
        }
        subtitle="TMS 29 & VUK Geçici 33"
        headerAction={
          hasData ? (
            <div className="flex items-center gap-2">
              {data?.applicable ? (
                <Badge variant="info">Uygulanabilir</Badge>
              ) : (
                <Badge variant="default">Uygulanamaz</Badge>
              )}
            </div>
          ) : (
            <Badge variant="default">Veri Bekleniyor</Badge>
          )
        }
      >
        {/* Yİ-ÜFE Indicators */}
        <YiufeIndicators yiufeData={yiufeData} hasYiufeData={hasYiufeData} />

        <PanelState status={status} reason_tr={reason_tr}>
          {!hasData && status === 'ok' ? (
            <InflationEmptyTable />
          ) : hasData && (
            <InflationDataView
              data={data!}
              trust={trust}
              analysis={analysis}
              legal_basis_refs={legal_basis_refs}
              formatCurrency={formatCurrency}
              formatPct={formatPct}
              onShowVukInfo={() => setShowVukInfo(true)}
              onShowExplain={() => setShowExplain(true)}
            />
          )}
        </PanelState>
      </Card>

      <ExplainModal
        isOpen={showExplain}
        onClose={() => setShowExplain(false)}
        title="Enflasyon Muhasebesi Analizi"
        analysis={analysis}
        trust={trust}
        legalBasisRefs={legal_basis_refs}
        evidenceRefs={evidence_refs}
        meta={meta}
      />

      <VukInfoModal isOpen={showVukInfo} onClose={() => setShowVukInfo(false)} />
    </>
  );
}
