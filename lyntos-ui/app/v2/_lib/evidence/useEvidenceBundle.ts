'use client';

import { useState, useCallback } from 'react';
import { useMizanStore } from '../stores/mizanStore';
import { useOranlarStore } from '../stores/oranlarStore';
import { useDashboardScope } from '../../_components/scope/useDashboardScope';
import { generateEvidenceBundle, type EvidenceBundle, type BundleGeneratorOptions } from './bundleGenerator';
import { generatePDFContent, type PDFContent } from './pdfGenerator';
import type { RuleContext, MizanAccount } from '../rule-engine/types';
import { ruleEngine, initializeRuleEngine } from '../rule-engine/registry';

interface UseEvidenceBundleReturn {
  // State
  bundle: EvidenceBundle | null;
  pdfContent: PDFContent | null;
  loading: boolean;
  error: string | null;

  // Actions
  generateBundle: () => Promise<EvidenceBundle | null>;
  generatePDF: () => PDFContent | null;
  downloadJSON: () => void;
  reset: () => void;
}

export function useEvidenceBundle(): UseEvidenceBundleReturn {
  const [bundle, setBundle] = useState<EvidenceBundle | null>(null);
  const [pdfContent, setPdfContent] = useState<PDFContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { scope } = useDashboardScope();
  const mizanStore = useMizanStore();
  const oranlarStore = useOranlarStore();

  const generateBundle = useCallback(async (): Promise<EvidenceBundle | null> => {
    setLoading(true);
    setError(null);

    try {
      // Mizan yüklü mü kontrol et
      if (!mizanStore.loaded || mizanStore.accounts.length === 0) {
        throw new Error('Mizan verisi yüklenmemiş. Lütfen önce mizan yükleyin.');
      }

      // Rule Engine'i başlat
      initializeRuleEngine();

      // Mizan hesaplarını RuleContext formatına çevir
      const mizanAccounts: MizanAccount[] = mizanStore.accounts.map(a => {
        const bakiye = a.borcBakiye - a.alacakBakiye;
        return {
          kod: a.hesapKodu,
          ad: a.hesapAdi,
          borc: a.borcBakiye,
          alacak: a.alacakBakiye,
          bakiye,
          bakiyeYonu: bakiye >= 0 ? 'B' : 'A' as const,
        };
      });

      // Rule Context oluştur
      const context: RuleContext = {
        taxpayer: {
          id: mizanStore.meta?.taxpayerId || scope.client_id,
          vkn: mizanStore.meta?.taxpayerId || '',
          unvan: mizanStore.meta?.taxpayerName || scope.client_id,
        },
        period: {
          yil: parseInt(mizanStore.meta?.period?.split('-')[0] || '2026'),
          donem: 'ANNUAL',
          baslangic: `${mizanStore.meta?.period?.split('-')[0] || '2026'}-01-01`,
          bitis: `${mizanStore.meta?.period?.split('-')[0] || '2026'}-12-31`,
        },
        smmmId: scope.smmm_id,
        mizan: mizanAccounts,
        mizanOzet: mizanStore.summary ? {
          aktifToplam: mizanStore.summary.aktifToplam,
          pasifToplam: mizanStore.summary.pasifToplam,
          ozSermaye: mizanStore.summary.ozSermaye,
          yabanciKaynak: mizanStore.summary.yabanciKaynak,
          donemKari: 0,
          brutSatislar: 0,
        } : undefined,
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
            aylik_kira_limiti: oranlarStore.binekOtoLimitleri[2024]?.aylik_kira_limiti || 26000,
            amortisman_limiti: oranlarStore.binekOtoLimitleri[2024]?.amortisman_limiti_otv_kdv_dahil || 1500000,
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

      // Rule Engine çalıştır
      console.log('[useEvidenceBundle] Rule Engine çalıştırılıyor...');
      const engineResult = await ruleEngine.execute(context);
      console.log('[useEvidenceBundle] Rule Engine tamamlandı:', engineResult.summary);

      // Bundle oluştur
      const bundleOptions: BundleGeneratorOptions = {
        taxpayerId: context.taxpayer.id,
        taxpayerName: context.taxpayer.unvan,
        taxNumber: context.taxpayer.vkn,
        period: mizanStore.meta?.period || scope.period,
        smmmId: scope.smmm_id,
        smmmName: scope.smmm_id, // TODO: Gerçek isim
      };

      const generatedBundle = generateEvidenceBundle(engineResult, bundleOptions);
      setBundle(generatedBundle);

      console.log('[useEvidenceBundle] Bundle oluşturuldu:', generatedBundle.id);
      return generatedBundle;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setError(message);
      console.error('[useEvidenceBundle] Hata:', message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [mizanStore, oranlarStore, scope]);

  const generatePDF = useCallback((): PDFContent | null => {
    if (!bundle) {
      setError('Önce bundle oluşturulmalı');
      return null;
    }

    try {
      const content = generatePDFContent(bundle);
      setPdfContent(content);
      console.log('[useEvidenceBundle] PDF içeriği oluşturuldu:', content.totalPages, 'sayfa');
      return content;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'PDF oluşturma hatası';
      setError(message);
      return null;
    }
  }, [bundle]);

  const downloadJSON = useCallback(() => {
    if (!bundle) {
      setError('İndirilecek bundle yok');
      return;
    }

    const json = JSON.stringify(bundle, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidence-bundle-${bundle.scope.taxpayerId}-${bundle.scope.period}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [bundle]);

  const reset = useCallback(() => {
    setBundle(null);
    setPdfContent(null);
    setError(null);
  }, []);

  return {
    bundle,
    pdfContent,
    loading,
    error,
    generateBundle,
    generatePDF,
    downloadJSON,
    reset,
  };
}
