/**
 * LYNTOS Rule Engine - React Hook
 * Sprint 5.2 - Frontend Integration
 */

'use client';

import { useState, useCallback } from 'react';
import { ruleEngine, initializeRuleEngine } from './registry';
import { RuleContext, EngineExecutionResult, MizanAccount } from './types';
import { useOranlarStore } from '../stores/oranlarStore';

export function useRuleEngine() {
  const [result, setResult] = useState<EngineExecutionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const oranlarStore = useOranlarStore();

  const execute = useCallback(async (
    mizan: MizanAccount[],
    taxpayer: { id: string; vkn: string; unvan: string },
    period: { yil: number; donem: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'ANNUAL' }
  ) => {
    setLoading(true);
    setError(null);

    try {
      // Engine'i initialize et
      initializeRuleEngine();

      // Mizan özeti hesapla
      const aktifToplam = mizan.filter(h => h.kod.startsWith('1') || h.kod.startsWith('2'))
        .reduce((s, h) => s + (h.bakiyeYonu === 'B' ? h.bakiye : -h.bakiye), 0);

      const pasifToplam = mizan.filter(h => ['3', '4', '5'].some(p => h.kod.startsWith(p)))
        .reduce((s, h) => s + (h.bakiyeYonu === 'A' ? h.bakiye : -h.bakiye), 0);

      const ozSermaye = mizan.filter(h => h.kod.startsWith('5'))
        .reduce((s, h) => s + (h.bakiyeYonu === 'A' ? h.bakiye : -h.bakiye), 0);

      const yabanciKaynak = mizan.filter(h => h.kod.startsWith('3') || h.kod.startsWith('4'))
        .reduce((s, h) => s + (h.bakiyeYonu === 'A' ? h.bakiye : -h.bakiye), 0);

      const context: RuleContext = {
        taxpayer,
        period: {
          yil: period.yil,
          donem: period.donem,
          baslangic: `${period.yil}-01-01`,
          bitis: `${period.yil}-12-31`,
        },
        smmmId: 'current-smmm',
        mizan,
        mizanOzet: {
          aktifToplam,
          pasifToplam,
          ozSermaye,
          yabanciKaynak,
          donemKari: 0,
          brutSatislar: 0,
        },
        oranlar: {
          faizOranlari: {
            tcmb_ticari_tl: oranlarStore.faizOranlari.tcmb_ticari_tl,
            tcmb_ticari_eur: oranlarStore.faizOranlari.tcmb_ticari_eur,
            tcmb_ticari_usd: oranlarStore.faizOranlari.tcmb_ticari_usd,
          },
          vergiOranlari: {
            kurumlar_vergisi: oranlarStore.vergiOranlari.kurumlar_vergisi,
            kdv_genel: oranlarStore.vergiOranlari.kdv_genel,
          },
          binekOtoLimitleri: {
            aylik_kira_limiti: oranlarStore.binekOtoLimitleri[period.yil]?.aylik_kira_limiti || 26000,
            amortisman_limiti: oranlarStore.binekOtoLimitleri[period.yil]?.amortisman_limiti_otv_kdv_dahil || 1500000,
          },
          dovizKurlari: {
            usd_alis: oranlarStore.dovizKurlari.usd_alis,
            eur_alis: oranlarStore.dovizKurlari.eur_alis,
            usd_efektif_alis: oranlarStore.dovizKurlari.usd_efektif_alis,
            eur_efektif_alis: oranlarStore.dovizKurlari.eur_efektif_alis,
          },
        },
        executionId: `exec-${Date.now()}`,
        timestamp: new Date().toISOString(),
      };

      const engineResult = await ruleEngine.execute(context);
      setResult(engineResult);
      return engineResult;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [oranlarStore]);

  return {
    execute,
    result,
    loading,
    error,
    riskScore: result?.riskScore ?? 0,
    riskLevel: result?.riskLevel ?? 'LOW',
    triggeredRules: result?.phases.flatMap(p => p.ruleResults.filter(r => r.triggered)) ?? [],
  };
}
