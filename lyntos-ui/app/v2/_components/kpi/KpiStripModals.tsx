'use client';
import React, { useState, useMemo } from 'react';
import type { KpiData } from './KpiCard';
import { RiskSkoruDetayModal, type PuanKiranKriter } from './RiskSkoruDetay';
import { VeriKalitesiDetayModal } from './VeriKalitesiDetay';
import { GeciciVergiDetayModal } from './GeciciVergiDetay';
import { KurumsalVergiDetayModal } from './KurumsalVergiDetay';
import { YilSonuProjDetayModal } from './YilSonuProjDetay';
import { EnflasyonDetayModal } from './EnflasyonDetay';
import { BeyanTakvimiDetayModal } from './BeyanTakvimiDetay';
import type { PanelEnvelope } from '../contracts/envelope';
import { KRITER_BILGILERI } from './kpiNormalizers';

export interface KpiStripModalHandles {
  openRiskDetay: () => void;
  openVeriKalitesi: () => void;
  openGeciciVergi: () => void;
  openKurumsalVergi: () => void;
  openYilSonuProj: () => void;
  openEnflasyon: () => void;
  openBeyanTakvimi: () => void;
}

interface KpiStripModalsProps {
  kurgan: PanelEnvelope<KpiData>;
  dataQuality: PanelEnvelope<KpiData>;
  quarterlyTax: PanelEnvelope<KpiData>;
  corporateTax: PanelEnvelope<KpiData>;
  corporateTaxForecast: PanelEnvelope<KpiData>;
  inflation: PanelEnvelope<KpiData>;
  onHandles: (handles: KpiStripModalHandles) => void;
}

export function KpiStripModals({
  kurgan,
  dataQuality,
  quarterlyTax,
  corporateTax,
  corporateTaxForecast,
  inflation,
  onHandles,
}: KpiStripModalsProps) {
  // Modal states
  const [riskDetayAcik, setRiskDetayAcik] = useState(false);
  const [veriKalitesiAcik, setVeriKalitesiAcik] = useState(false);
  const [geciciVergiAcik, setGeciciVergiAcik] = useState(false);
  const [kurumsalVergiAcik, setKurumsalVergiAcik] = useState(false);
  const [yilSonuProjAcik, setYilSonuProjAcik] = useState(false);
  const [enflasyonAcik, setEnflasyonAcik] = useState(false);
  const [beyanTakvimiAcik, setBeyanTakvimiAcik] = useState(false);

  // Expose open functions to parent
  const handles = useMemo((): KpiStripModalHandles => ({
    openRiskDetay: () => setRiskDetayAcik(true),
    openVeriKalitesi: () => setVeriKalitesiAcik(true),
    openGeciciVergi: () => setGeciciVergiAcik(true),
    openKurumsalVergi: () => setKurumsalVergiAcik(true),
    openYilSonuProj: () => setYilSonuProjAcik(true),
    openEnflasyon: () => setEnflasyonAcik(true),
    openBeyanTakvimi: () => setBeyanTakvimiAcik(true),
  }), []);

  // Notify parent of handles
  React.useEffect(() => {
    onHandles(handles);
  }, [handles, onHandles]);

  // === Risk Skoru ===
  const riskSkor = kurgan.status === 'ok' && kurgan.data && typeof kurgan.data.value === 'number'
    ? kurgan.data.value
    : null;

  const puanKiranlar = useMemo((): PuanKiranKriter[] => {
    const criteriaScores = kurgan.meta?.extra?.criteria_scores as Record<string, number> | undefined;
    if (!criteriaScores) return [];

    return Object.entries(criteriaScores)
      .filter(([kod, skor]) => {
        const bilgi = KRITER_BILGILERI[kod];
        return bilgi && skor < bilgi.esik;
      })
      .map(([kod, skor]) => {
        const bilgi = KRITER_BILGILERI[kod] || {
          baslik: kod,
          aciklama: 'Kriter açıklaması bulunamadı',
          oneri: 'Detaylı analiz için SMMM\'nize danışın',
          agirlik: 10,
          esik: 100,
        };
        const kesinti = Math.floor(bilgi.agirlik * (100 - skor) / 100);
        return {
          kod,
          baslik: bilgi.baslik,
          puan: -kesinti,
          aciklama: bilgi.aciklama,
          oneri: bilgi.oneri,
        };
      })
      .filter(k => k.puan < 0)
      .sort((a, b) => a.puan - b.puan);
  }, [kurgan.meta?.extra?.criteria_scores]);

  // === Veri Kalitesi ===
  const veriKalitesiSkor = dataQuality.status === 'ok' && dataQuality.data
    ? (typeof dataQuality.data.value === 'number' ? dataQuality.data.value : null)
    : null;

  const eksikBelgeler = useMemo(() => {
    const missingData = dataQuality.meta?.extra?.missing_data as unknown[] | undefined;
    if (!missingData) return [];

    return missingData.map(item => {
      const d = item as Record<string, unknown>;
      return {
        id: String(d.id || ''),
        belge: String(d.belge || ''),
        aciklama: String(d.aciklama || ''),
        neden_onemli: String(d.neden_onemli || ''),
        nasil_tamamlanir: String(d.nasil_tamamlanir || ''),
        oncelik: (d.oncelik as 'KRITIK' | 'YUKSEK' | 'ORTA' | 'DUSUK') || 'ORTA',
        puan_etkisi: typeof d.puan_etkisi === 'number' ? d.puan_etkisi : 0,
      };
    });
  }, [dataQuality.meta?.extra?.missing_data]);

  const veriOzeti = useMemo(() => {
    const summary = dataQuality.meta?.extra?.data_summary as Record<string, unknown> | undefined;
    if (!summary) return undefined;

    return {
      mizan_entries: typeof summary.mizan_entries === 'number' ? summary.mizan_entries : 0,
      beyanname_entries: typeof summary.beyanname_entries === 'number' ? summary.beyanname_entries : 0,
      banka_var: Boolean(summary.banka_var),
      enflasyon_csvleri: Array.isArray(summary.enflasyon_csvleri) ? summary.enflasyon_csvleri as string[] : [],
    };
  }, [dataQuality.meta?.extra?.data_summary]);

  // === Geçici Vergi ===
  const geciciVergiSelectedQuarter = quarterlyTax.meta?.extra?.selected_quarter as string | null || null;
  const geciciVergiYear = quarterlyTax.meta?.extra?.year as string | null || null;

  const geciciVergiDonemVerisi = useMemo(() => {
    const quarterData = quarterlyTax.meta?.extra?.quarter_data as Record<string, unknown> | undefined;
    if (!quarterData) return null;

    return {
      current_profit: typeof quarterData.current_profit === 'number' ? quarterData.current_profit : 0,
      calculated_tax: typeof quarterData.calculated_tax === 'number' ? quarterData.calculated_tax : 0,
      payable: typeof quarterData.payable === 'number' ? quarterData.payable : 0,
      is_zarar: Boolean(quarterData.is_zarar),
      zarar_tutari: typeof quarterData.zarar_tutari === 'number' ? quarterData.zarar_tutari : 0,
    };
  }, [quarterlyTax.meta?.extra?.quarter_data]);

  const geciciVergiKanitlar = useMemo(() => {
    const evidenceRefs = quarterlyTax.meta?.extra?.evidence_refs as unknown[] | undefined;
    if (!evidenceRefs) return [];

    return evidenceRefs.map(ref => {
      const r = ref as Record<string, unknown>;
      return {
        id: String(r.id || ''),
        kind: String(r.kind || 'document'),
        title_tr: String(r.title_tr || r.title || ''),
        ref: String(r.ref || ''),
        url: typeof r.url === 'string' ? r.url : undefined,
      };
    });
  }, [quarterlyTax.meta?.extra?.evidence_refs]);

  const geciciVergiEksikBelgeler = useMemo(() => {
    const eksikBelgelerRaw = quarterlyTax.meta?.extra?.eksik_belgeler as unknown[] | undefined;
    if (!eksikBelgelerRaw) return [];

    return eksikBelgelerRaw.map(item => {
      const d = item as Record<string, unknown>;
      return {
        belge: String(d.belge || ''),
        nasil_tamamlanir: String(d.nasil_tamamlanir || ''),
      };
    });
  }, [quarterlyTax.meta?.extra?.eksik_belgeler]);

  // === Kurumlar Vergisi ===
  const kvSeciliDonem = corporateTax.meta?.extra?.secili_donem as string | null || null;
  const kvGerekliDonem = corporateTax.meta?.extra?.gerekli_donem as string | null || null;
  const kvAciklama = corporateTax.meta?.extra?.aciklama as string | null || null;
  const kvTicariKar = corporateTax.meta?.extra?.ticari_kar as { donem_kari: number; donem_zarari: number; net_donem_kari: number } | null || null;
  const kvMaliKar = corporateTax.meta?.extra?.mali_kar as { ticari_kar: number; kkeg: number; istisna_kazanclar: number; gecmis_zarar: number; mali_kar: number } | null || null;
  const kvMatrah = corporateTax.meta?.extra?.matrah as number | null || null;
  const kvVergiOrani = corporateTax.meta?.extra?.vergi_orani as number | null || null;
  const kvHesaplananVergi = corporateTax.meta?.extra?.hesaplanan_vergi as number | null || null;
  const kvOdenecekVergi = corporateTax.data?.value ? parseFloat(String(corporateTax.data.value).replace(/[^0-9,-]/g, '').replace(',', '.')) : null;

  // === Yıl Sonu Projeksiyonu ===
  const projSeciliDonem = corporateTaxForecast.meta?.extra?.secili_donem as string | null || null;
  const projYil = corporateTaxForecast.meta?.extra?.yil as string | null || null;

  const projMevcutDonem = corporateTaxForecast.meta?.extra?.mevcut_donem as {
    kar_zarar: number;
    ciro: number;
    mizan_kayit: number;
  } | null || null;

  const projGecmisVeri = corporateTaxForecast.meta?.extra?.gecmis_veri as {
    toplam_donem: number;
    onceki_yil_ayni_donem: { yil: number; ceyrek: string; period: string; kar_zarar: number; ciro: number } | null;
    yoy_buyume: number | null;
    son_4_donem: Array<{ yil: number; ceyrek: string; period: string; kar_zarar: number; ciro: number }>;
  } | null || null;

  const projProjeksiyonYontemleri = corporateTaxForecast.meta?.extra?.projeksiyon_yontemleri as Array<{
    yontem: string;
    kod?: string;
    aciklama: string;
    sonuc: number;
    guvenilirlik: number;
    buyume_orani?: number;
    kullanilan_donemler?: string[];
  }> | null || null;

  const projKombine = corporateTaxForecast.meta?.extra?.kombine as {
    tahmini_kar: number;
    tahmini_vergi: number;
  } | null || null;

  const projSenaryolar = corporateTaxForecast.meta?.extra?.senaryolar as {
    pessimist: { kar: number; vergi: number };
    baz: { kar: number; vergi: number };
    optimist: { kar: number; vergi: number };
  } | null || null;

  const projConfidence = corporateTaxForecast.meta?.extra?.confidence as string | null || null;
  const projConfidenceSkor = corporateTaxForecast.meta?.extra?.confidence_skor as number | null || null;
  const projConfidenceAciklama = corporateTaxForecast.meta?.extra?.confidence_aciklama as string | null || null;

  const projUyarilar = corporateTaxForecast.meta?.extra?.uyarilar as string[] | null || null;
  const projOnemliNot = corporateTaxForecast.meta?.extra?.onemli_not as string | null || null;

  const projMetodoloji = corporateTaxForecast.meta?.extra?.metodoloji as {
    yontemler: string[];
    mevsimsellik: number;
    kaynak: string;
  } | null || null;

  const projDonemKarZarar = corporateTaxForecast.meta?.extra?.donem_kar_zarar as number | null || null;
  const projTahminiYillikKar = corporateTaxForecast.meta?.extra?.tahmini_yillik_kar as number | null || null;
  const projTahminiVergi = corporateTaxForecast.meta?.extra?.tahmini_vergi as number | null || null;

  // === Enflasyon ===
  const enflasyonOk = inflation.meta?.extra?.ok as boolean | null || null;

  const enflasyonTufeEndeksi = inflation.meta?.extra?.tufe_endeksi as {
    donem_basi: number;
    donem_sonu: number;
    katsayi: number;
    artis_orani: number;
  } | null || null;

  const enflasyonDuzeltmeFarklari = inflation.meta?.extra?.duzeltme_farklari as {
    '648': number;
    '658': number;
    '698': number;
  } | null || null;

  const enflasyonVergiEtkisi = inflation.meta?.extra?.vergi_etkisi as {
    mali_kar_etkisi: number;
    kv_orani: number;
    vergi_etkisi: number;
    aciklama: string;
  } | null || null;

  const enflasyonMissingData = inflation.meta?.extra?.missing_data as string[] | null || null;
  const enflasyonRequiredActions = inflation.meta?.extra?.required_actions as string[] | null || null;

  return (
    <>
      <RiskSkoruDetayModal
        isOpen={riskDetayAcik}
        onClose={() => setRiskDetayAcik(false)}
        skor={riskSkor}
        puanKiranlar={puanKiranlar}
        dataCompleteness={(kurgan.meta?.extra?.data_completeness as 'complete' | 'partial' | 'insufficient') || 'unknown'}
        evidenceRefs={(kurgan.meta?.extra?.evidence_refs as unknown[])?.map(e => e as { type: string; message?: string; note?: string }) || []}
      />

      <VeriKalitesiDetayModal
        isOpen={veriKalitesiAcik}
        onClose={() => setVeriKalitesiAcik(false)}
        skor={veriKalitesiSkor}
        eksikBelgeler={eksikBelgeler}
        veriOzeti={veriOzeti}
      />

      <GeciciVergiDetayModal
        isOpen={geciciVergiAcik}
        onClose={() => setGeciciVergiAcik(false)}
        selectedQuarter={geciciVergiSelectedQuarter}
        year={geciciVergiYear}
        donemVerisi={geciciVergiDonemVerisi}
        kanitlar={geciciVergiKanitlar}
        eksikBelgeler={geciciVergiEksikBelgeler}
      />

      <KurumsalVergiDetayModal
        isOpen={kurumsalVergiAcik}
        onClose={() => setKurumsalVergiAcik(false)}
        seciliDonem={kvSeciliDonem}
        gerekliDonem={kvGerekliDonem}
        aciklama={kvAciklama}
        ticariKar={kvTicariKar}
        maliKar={kvMaliKar}
        matrah={kvMatrah}
        vergiOrani={kvVergiOrani}
        hesaplananVergi={kvHesaplananVergi}
        odenecekVergi={kvOdenecekVergi}
      />

      <YilSonuProjDetayModal
        isOpen={yilSonuProjAcik}
        onClose={() => setYilSonuProjAcik(false)}
        seciliDonem={projSeciliDonem}
        yil={projYil}
        mevcutDonem={projMevcutDonem}
        gecmisVeri={projGecmisVeri}
        projeksiyonYontemleri={projProjeksiyonYontemleri ?? undefined}
        kombine={projKombine}
        senaryolar={projSenaryolar}
        confidenceSkor={projConfidenceSkor}
        metodoloji={projMetodoloji}
        confidence={projConfidence}
        confidenceAciklama={projConfidenceAciklama}
        uyarilar={projUyarilar}
        onemliNot={projOnemliNot}
        donemKarZarar={projDonemKarZarar}
        tahminiYillikKar={projTahminiYillikKar}
        tahminiVergi={projTahminiVergi}
      />

      <EnflasyonDetayModal
        isOpen={enflasyonAcik}
        onClose={() => setEnflasyonAcik(false)}
        ok={enflasyonOk}
        tufeEndeksi={enflasyonTufeEndeksi}
        duzeltmeFarklari={enflasyonDuzeltmeFarklari}
        vergiEtkisi={enflasyonVergiEtkisi}
        missingData={enflasyonMissingData}
        requiredActions={enflasyonRequiredActions}
      />

      <BeyanTakvimiDetayModal
        isOpen={beyanTakvimiAcik}
        onClose={() => setBeyanTakvimiAcik(false)}
      />
    </>
  );
}
