'use client';

/**
 * What-If Vergi Analizi Komponenti
 * Sprint 9.1 - LYNTOS V2 Big 4 Enhancement
 *
 * SMMM/YMM için senaryo simülasyonu
 * "Yasaları kullanarak daha az vergi" stratejileri
 */

import React, { useState, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { formatCurrency as formatCurrencyCentral } from '../../_lib/format';
import type { BaseFinancialData, WhatIfAnalysisProps } from './whatIfTypes';
import { TAX_RATES_2025 } from './whatIfTypes';
import { WHAT_IF_SCENARIOS } from './whatIfScenarios';
import { WhatIfHeader } from './WhatIfHeader';
import { BaseDataSummary } from './BaseDataSummary';
import { ScenarioCard } from './ScenarioCard';

export function WhatIfAnalysis({ baseData, clientId, period, onScenarioSelect }: WhatIfAnalysisProps) {
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);
  const [scenarioValues, setScenarioValues] = useState<Record<string, number>>({});
  const [mizanData, setMizanData] = useState<Partial<BaseFinancialData> | null>(null);
  const [mizanLoading, setMizanLoading] = useState(false);

  React.useEffect(() => {
    if (!clientId || !period) return;
    let cancelled = false;
    setMizanLoading(true);
    fetch(`/api/v1/vergus/analyze?client_id=${clientId}&period=${period}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (cancelled || !data) return;
        const summary = data.summary || {};
        const profile = data.profile || {};
        setMizanData({
          kvMatrahi: summary.asgari_kv_kontrolu?.hesaplanan_kv
            ? (summary.asgari_kv_kontrolu.hesaplanan_kv / (summary.kv_orani || 0.25))
            : 0,
          toplamHasilat: data.summary?.mali_profil?.toplam_hasilat || 0,
          ihracatHasilati: data.summary?.mali_profil?.ihracat_hasilat || 0,
          personelSayisi: profile.personel_sayisi || 0,
          argePersonel: 0,
          kvOrani: summary.kv_orani || TAX_RATES_2025.kv,
        });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setMizanLoading(false); });
    return () => { cancelled = true; };
  }, [clientId, period]);

  // Base data: prop > mizan > sifir (HARDCODED DEGER YOK)
  const resolvedBase = baseData || mizanData;
  const defaultBaseData: BaseFinancialData = {
    kvMatrahi: resolvedBase?.kvMatrahi || 0,
    toplamHasilat: resolvedBase?.toplamHasilat || 0,
    ihracatHasilati: resolvedBase?.ihracatHasilati || 0,
    personelSayisi: resolvedBase?.personelSayisi || 0,
    argePersonel: resolvedBase?.argePersonel || 0,
    kvOrani: resolvedBase?.kvOrani || TAX_RATES_2025.kv,
  };

  const formatCurrency = (value: number) => formatCurrencyCentral(value, { decimals: 0 });

  // Tum senaryolarin toplam tasarruf potansiyeli
  const totalPotentialSaving = useMemo(() => {
    return WHAT_IF_SCENARIOS.reduce((total, scenario) => {
      const value = scenarioValues[scenario.id] || scenario.defaultValue;
      const result = scenario.calculate(value, defaultBaseData);
      return total + result.saving;
    }, 0);
  }, [scenarioValues, defaultBaseData]);

  const handleValueChange = (scenarioId: string, value: number) => {
    setScenarioValues((prev) => ({
      ...prev,
      [scenarioId]: value,
    }));
  };

  const toggleScenario = (scenarioId: string) => {
    setExpandedScenario(expandedScenario === scenarioId ? null : scenarioId);
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
      <WhatIfHeader
        totalPotentialSaving={totalPotentialSaving}
        formatCurrency={formatCurrency}
      />

      <BaseDataSummary
        baseData={defaultBaseData}
        mizanLoading={mizanLoading}
        hasMizanData={!!mizanData}
        formatCurrency={formatCurrency}
      />

      {/* Scenarios */}
      <div className="divide-y divide-[#E5E5E5]">
        {WHAT_IF_SCENARIOS.map((scenario) => {
          const value = scenarioValues[scenario.id] || scenario.defaultValue;
          const result = scenario.calculate(value, defaultBaseData);

          return (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              result={result}
              value={value}
              isExpanded={expandedScenario === scenario.id}
              formatCurrency={formatCurrency}
              onToggle={toggleScenario}
              onValueChange={handleValueChange}
              onApply={onScenarioSelect}
            />
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-[#F5F6F8] border-t border-[#E5E5E5]">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#969696] mt-0.5" />
          <p className="text-[10px] text-[#969696] leading-relaxed">
            Bu simülasyonlar yaklaşık hesaplamalardır. Gerçek vergi tasarrufu
            şirketinizin özel durumuna, mevzuattaki değişikliklere ve doğru
            uygulama koşullarına bağlıdır. Profesyonel SMMM/YMM danışmanlığı önerilir.
          </p>
        </div>
      </div>
    </div>
  );
}

export default WhatIfAnalysis;
