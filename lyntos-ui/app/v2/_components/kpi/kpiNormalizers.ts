import type { KpiData } from './KpiCard';
import type { PanelEnvelope, ExpertAnalysis, AiAnalysis, LegalBasisRef, EvidenceRef } from '../contracts/envelope';
import { normalizeExpertAnalysis, normalizeAiAnalysis, normalizeMeta, determineTrust, resolveLegalBasisRefs } from '../contracts/map';
import { getSonrakiBeyan, formatTarihKisa } from '../../_lib/vergiTakvimi';

// VDK Kriter Mapping - criteria_scores'u puanKiranlar formatına dönüştürmek için
// WEIGHTS: Backend ile AYNI olmalı (kurgan_calculator.py)
export const KRITER_BILGILERI: Record<string, { baslik: string; aciklama: string; oneri: string; agirlik: number; esik: number }> = {
  vergiye_uyum: {
    baslik: 'Vergiye Uyum',
    aciklama: 'KDV, Stopaj ve diğer vergi beyannamelerinin zamanında ve doğru verilip verilmediği',
    oneri: 'Beyanname tarihlerini kontrol edin, gecikme varsa düzeltin',
    agirlik: 25,  // Max kesinti
    esik: 70,     // Bu skorun altında kesinti başlar
  },
  odeme_seffafligi: {
    baslik: 'Ödeme Şeffaflığı',
    aciklama: 'Büyük tutarlı ödemelerin banka üzerinden yapılıp yapılmadığı (VUK 320)',
    oneri: '7.000 TL üzeri ödemeleri banka/çek ile yapın, nakit kaçının',
    agirlik: 20,
    esik: 80,
  },
  sevkiyat: {
    baslik: 'Sevkiyat Belgeleri',
    aciklama: 'Sevk irsaliyesi ve e-irsaliye düzeninin eksiksiz olması',
    oneri: 'Sevk irsaliyelerini düzenli tutun, e-irsaliye sistemini kullanın',
    agirlik: 10,
    esik: 100,
  },
  e_imza_uyumu: {
    baslik: 'E-İmza Uyumu',
    aciklama: 'E-fatura, e-defter ve diğer e-belgelerin imzalanma durumu',
    oneri: 'E-imza sertifikanızın geçerliliğini kontrol edin',
    agirlik: 10,
    esik: 100,
  },
  gecmis_inceleme: {
    baslik: 'Geçmiş İnceleme',
    aciklama: 'Geçmişte vergi incelemesi veya SMİYB (sahte fatura) kaydı olup olmadığı',
    oneri: 'Geçmiş inceleme varsa, aynı hatalara düşmemeye dikkat edin',
    agirlik: 15,
    esik: 100,
  },
  ortak_gecmisi: {
    baslik: 'Ortak Geçmişi',
    aciklama: 'Şirket ortaklarının vergi sicilinde sorunlu kayıt olup olmadığı',
    oneri: 'Ortak değişikliği varsa yeni ortakların sicilini kontrol edin',
    agirlik: 10,
    esik: 100,
  },
};

// Helper to extract nested analysis from backend response
function extractAnalysis(raw: Record<string, unknown>, dataKey?: string): { expert?: ExpertAnalysis; ai?: AiAnalysis } {
  // Try data.analysis first (most endpoints)
  const data = raw.data as Record<string, unknown> | undefined;
  if (data?.analysis) {
    const analysisRaw = data.analysis as Record<string, unknown>;
    return {
      expert: normalizeExpertAnalysis(analysisRaw.expert),
      ai: normalizeAiAnalysis(analysisRaw.ai),
    };
  }
  // Try data[dataKey].analysis (kurgan_risk, etc.)
  if (dataKey && data?.[dataKey]) {
    const nested = data[dataKey] as Record<string, unknown>;
    if (nested.analysis) {
      const analysisRaw = nested.analysis as Record<string, unknown>;
      return {
        expert: normalizeExpertAnalysis(analysisRaw.expert),
        ai: normalizeAiAnalysis(analysisRaw.ai),
      };
    }
  }
  return {};
}

// Helper to extract legal_basis_refs from nested data
function extractLegalBasisRefs(raw: Record<string, unknown>, dataKey?: string): LegalBasisRef[] {
  const data = raw.data as Record<string, unknown> | undefined;
  // Try top-level data.legal_basis_refs
  if (Array.isArray(data?.legal_basis_refs)) {
    return resolveLegalBasisRefs(data.legal_basis_refs as string[]);
  }
  // Try nested data[dataKey].legal_basis_refs
  if (dataKey && data?.[dataKey]) {
    const nested = data[dataKey] as Record<string, unknown>;
    if (Array.isArray(nested.legal_basis_refs)) {
      return resolveLegalBasisRefs(nested.legal_basis_refs as string[]);
    }
  }
  return [];
}

// Helper to extract evidence_refs
function extractEvidenceRefs(raw: Record<string, unknown>, dataKey?: string): EvidenceRef[] {
  const data = raw.data as Record<string, unknown> | undefined;

  // Backend kind -> EvidenceRef kind mapping
  const mapKind = (kind: unknown): 'document' | 'bundle' | 'external' => {
    const k = String(kind || 'document').toLowerCase();
    if (k === 'bundle' || k === 'external') return k;
    return 'document'; // beyanname, tahakkuk, mizan hepsi document olarak map'lenir
  };

  // Try analysis.expert.evidence_refs
  const expertRaw = dataKey && data?.[dataKey]
    ? ((data[dataKey] as Record<string, unknown>).analysis as Record<string, unknown>)?.expert
    : (data?.analysis as Record<string, unknown>)?.expert;

  if (expertRaw && Array.isArray((expertRaw as Record<string, unknown>).evidence_refs)) {
    const refs = (expertRaw as Record<string, unknown>).evidence_refs as unknown[];
    return refs.map(ref => {
      // Backend object döndürüyor: { id, kind, title_tr, ref, url }
      if (typeof ref === 'object' && ref !== null) {
        const refObj = ref as Record<string, unknown>;
        return {
          id: String(refObj.id || ''),
          title_tr: String(refObj.title_tr || refObj.title || ''),
          kind: mapKind(refObj.kind),
          ref: String(refObj.ref || refObj.path || ''),
          url: typeof refObj.url === 'string' ? refObj.url : undefined,
        };
      }
      // Eski format: string array
      const refStr = String(ref);
      return {
        id: refStr,
        title_tr: refStr,
        kind: 'document' as const,
        ref: refStr,
        url: `/api/v1/evidence/file/${encodeURIComponent(refStr)}`,
      };
    });
  }

  // data.kanitlar.evidence_refs'ten de al (geçici vergi için)
  const kanitlar = data?.kanitlar as Record<string, unknown> | undefined;
  if (kanitlar && Array.isArray(kanitlar.evidence_refs)) {
    const refs = kanitlar.evidence_refs as unknown[];
    return refs.map(ref => {
      if (typeof ref === 'object' && ref !== null) {
        const refObj = ref as Record<string, unknown>;
        return {
          id: String(refObj.id || ''),
          title_tr: String(refObj.title_tr || refObj.title || ''),
          kind: mapKind(refObj.kind),
          ref: String(refObj.ref || refObj.path || ''),
          url: typeof refObj.url === 'string' ? refObj.url : undefined,
        };
      }
      return {
        id: String(ref),
        title_tr: String(ref),
        kind: 'document' as const,
        ref: String(ref),
        url: undefined,
      };
    });
  }

  return [];
}

// Create envelope with proper analysis extraction
function createKpiEnvelope<T>(
  raw: unknown,
  extractData: (raw: unknown) => T | undefined,
  dataKey?: string,
  requestId?: string,
  emptyMessage?: string
): PanelEnvelope<T> {
  if (!raw || typeof raw !== 'object') {
    return {
      status: 'error',
      reason_tr: 'Geçersiz yanıt formatı',
      legal_basis_refs: [],
      evidence_refs: [],
      analysis: {},
      trust: 'low',
      meta: normalizeMeta(undefined, requestId),
    };
  }

  const obj = raw as Record<string, unknown>;
  const analysis = extractAnalysis(obj, dataKey);
  const legalRefs = extractLegalBasisRefs(obj, dataKey);
  const evidenceRefs = extractEvidenceRefs(obj, dataKey);
  const data = extractData(raw);

  let status: PanelEnvelope<T>['status'] = 'ok';
  let reason_tr = 'Veri başarıyla yüklendi.';

  if (data === undefined || data === null) {
    status = 'empty';
    reason_tr = emptyMessage || 'Görüntülenecek veri yok.';
  }

  return {
    status,
    reason_tr,
    data,
    legal_basis_refs: legalRefs,
    evidence_refs: evidenceRefs,
    analysis,
    trust: determineTrust(analysis.expert, analysis.ai),
    confidence: analysis.ai?.confidence,
    meta: normalizeMeta(obj.meta, requestId),
  };
}

// Normalizers for each KPI type
export function normalizeKurganRisk(raw: unknown, requestId?: string): PanelEnvelope<KpiData> {
  // Önce standart envelope oluştur
  const envelope = createKpiEnvelope<KpiData>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;

    // SIFIR TOLERANS: Backend ok:false dönerse veri yok demek
    if (data?.ok === false) return undefined;

    const kurgan = data?.kurgan_risk as Record<string, unknown> | undefined;

    // score = null ise hesaplanamaz demek
    if (!kurgan || kurgan.score === null || kurgan.score === undefined) return undefined;

    // score number değilse de undefined döndür
    if (typeof kurgan.score !== 'number') return undefined;

    // data_completeness bilgisini label'a ekle
    const dataCompleteness = kurgan.data_completeness as string | undefined;
    let label = '100 üzerinden · VDK 13 Kriter';
    if (dataCompleteness === 'partial') {
      label = '100 üzerinden · Kısmi veri';
    } else if (dataCompleteness === 'insufficient') {
      label = 'Hesaplanamadı';
    }

    return {
      value: kurgan.score,
      label,
      unit: 'puan',
      risk_level: typeof kurgan.risk_level === 'string' ? kurgan.risk_level : undefined,
    };
  }, 'kurgan_risk', requestId, 'Risk analizi için mizan yükleyin');

  // criteria_scores, data_completeness ve evidence_refs'i meta.extra içine ekle
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;
    const kurgan = data?.kurgan_risk as Record<string, unknown> | undefined;
    if (kurgan) {
      // Expert analysis içindeki evidence_refs'i al
      const analysis = kurgan.analysis as Record<string, unknown> | undefined;
      const expert = analysis?.expert as Record<string, unknown> | undefined;
      const evidenceRefs = expert?.evidence_refs as unknown[] | undefined;

      envelope.meta = {
        ...envelope.meta,
        extra: {
          ...envelope.meta.extra,
          criteria_scores: kurgan.criteria_scores,
          data_completeness: kurgan.data_completeness,
          evidence_refs: evidenceRefs || [],
        },
      };
    }
  }

  return envelope;
}

export function normalizeDataQuality(raw: unknown, requestId?: string): PanelEnvelope<KpiData> {
  const envelope = createKpiEnvelope<KpiData>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;
    if (!data) return undefined;

    // SAHTE VERİ YASAK - Backend ok:false dönerse veri yok demek
    if (data.ok === false) return undefined;

    // Backend completeness_score döndürüyor
    const score = (data.completeness_score ?? data.score) as number | undefined;
    if (typeof score !== 'number') return undefined;

    // SAHTE VERİ YASAK - Skor'a göre gerçek risk seviyesi belirle
    let riskLevel: string;
    if (score >= 80) {
      riskLevel = 'Tamam';
    } else if (score >= 50) {
      riskLevel = 'Orta';
    } else if (score > 0) {
      riskLevel = 'Eksik';
    } else {
      riskLevel = 'Eksik';  // 0% = veri yok = Eksik
    }
    return {
      value: score,
      label: score >= 80 ? 'Veri Tamam' : 'Veri Eksik',
      unit: '%',
      risk_level: riskLevel,
    };
  }, undefined, requestId, 'Veri kalitesi için belge yükleyin');

  // missing_data ve data_summary bilgisini meta.extra içine ekle
  // Modal penceresinde SMMM'ye detaylı bilgi göstermek için
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;
    if (data) {
      envelope.meta = {
        ...envelope.meta,
        extra: {
          ...envelope.meta.extra,
          // SMMM'ye gösterilecek eksik belgeler
          missing_data: data.missing_data,
          // Mevcut veri özeti
          data_summary: data.data_summary,
          // Görevler
          tasks: data.tasks,
          total_time: data.total_time,
          errors: data.errors,
          warnings: data.warnings,
        },
      };
    }
  }

  return envelope;
}

export function normalizeCrossCheck(raw: unknown, requestId?: string): PanelEnvelope<KpiData> {
  return createKpiEnvelope<KpiData>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;

    // SIFIR TOLERANS: Backend ok:false dönerse veri eksik demek
    if (data?.ok === false) return undefined;

    const summary = data?.summary as Record<string, unknown> | undefined;
    if (!summary) return undefined;

    // overall_status: "missing_data" ise veri eksik
    if (summary.overall_status === 'missing_data') return undefined;

    const errors = typeof summary.errors === 'number' ? summary.errors : 0;
    const warnings = typeof summary.warnings === 'number' ? summary.warnings : 0;
    return {
      value: errors + warnings,
      label: `${errors} hata, ${warnings} uyarı`,
      risk_level: errors > 0 ? 'Yüksek' : warnings > 0 ? 'Orta' : 'Düşük',
    };
  }, undefined, requestId, 'Çapraz kontrol için mizan ve beyanname yükleyin');
}

export function normalizeQuarterlyTax(raw: unknown, requestId?: string): PanelEnvelope<KpiData> {
  const envelope = createKpiEnvelope<KpiData>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;
    if (!data) return undefined;

    // SAHTE VERİ YASAK - Backend ok:false dönerse veri yok demek
    if (data.ok === false) return undefined;

    // Yeni API: selected_quarter ve zarar_ozeti kullan
    const selectedQuarter = data.selected_quarter as string | undefined;
    const year = data.year as string | undefined;
    const zararOzeti = data.zarar_ozeti as Record<string, unknown> | undefined;

    // Seçili dönem verisi
    const quarterData = selectedQuarter ? data[selectedQuarter] as Record<string, unknown> | undefined : undefined;

    // Eski API fallback (Q1/Q2)
    const q1 = data.Q1 as Record<string, unknown> | undefined;
    const q2 = data.Q2 as Record<string, unknown> | undefined;

    // Yeni API varsa onu kullan
    if (quarterData) {
      const payable = typeof quarterData.payable === 'number' ? quarterData.payable : 0;
      const isZarar = Boolean(quarterData.is_zarar);
      const zararTutari = typeof quarterData.zarar_tutari === 'number' ? quarterData.zarar_tutari : 0;

      // Zarar durumunda label'da zarar tutarını göster
      let label = `${selectedQuarter} Geçici Vergi`;
      let displayValue: string | number = payable;

      if (isZarar) {
        label = `${selectedQuarter} Zarar`;
        displayValue = `-${zararTutari.toLocaleString('tr-TR')}`;
      }

      return {
        value: displayValue,
        label,
        unit: 'TL',
        risk_level: isZarar ? 'Tamam' : (payable > 0 ? 'Orta' : 'Tamam'),
      };
    }

    // Eski API fallback
    const q1Payable = typeof q1?.payable === 'number' ? q1.payable : 0;
    const q2Payable = typeof q2?.payable === 'number' ? q2.payable : 0;
    const totalPayable = q1Payable + q2Payable;

    if (!q1 && !q2) return undefined;

    let label = 'Geçici Vergi';
    if (totalPayable === 0) {
      label = 'Geçici Vergi · Zarar';
    }

    return {
      value: totalPayable.toLocaleString('tr-TR'),
      label,
      unit: 'TL',
      risk_level: totalPayable === 0 ? 'Tamam' : undefined,
    };
  }, undefined, requestId, 'Geçici vergi hesabı için mizan yükleyin');

  // Kanıt bilgilerini meta.extra içine ekle (modal için)
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;
    if (data) {
      const kanitlar = data.kanitlar as Record<string, unknown> | undefined;
      const selectedQuarter = data.selected_quarter as string | undefined;
      const quarterData = selectedQuarter ? data[selectedQuarter] as Record<string, unknown> | undefined : undefined;

      envelope.meta = {
        ...envelope.meta,
        extra: {
          ...envelope.meta.extra,
          selected_quarter: selectedQuarter,
          year: data.year,
          quarter_data: quarterData,
          zarar_ozeti: data.zarar_ozeti,
          kanitlar: kanitlar,
          evidence_refs: kanitlar?.evidence_refs,
          eksik_belgeler: kanitlar?.eksik_belgeler,
        },
      };
    }
  }

  return envelope;
}

export function normalizeCorporateTax(raw: unknown, requestId?: string): PanelEnvelope<KpiData> {
  const envelope = createKpiEnvelope<KpiData>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;
    if (!data) return undefined;

    // SAHTE VERİ YASAK - Backend ok:false dönerse veri yok demek
    if (data.ok === false) {
      // Q4 değilse özel mesaj göster
      const seciliDonem = data.secili_donem as string | undefined;
      const gerekliDonem = data.gerekli_donem as string | undefined;
      if (gerekliDonem === 'Q4' && seciliDonem !== 'Q4') {
        return undefined;
      }
      return undefined;
    }

    // Backend odenecek_vergi döndürüyor
    const amount = (data.odenecek_vergi ?? data.tax_amount ?? data.amount) as number | undefined;
    if (typeof amount !== 'number') return undefined;

    const donem = data.donem as string | undefined;
    let label = donem ? `${donem}` : 'Kurumlar Vergisi';
    if (amount === 0) {
      label = 'Kurumlar Vergisi · Zarar';
    }

    return {
      value: amount.toLocaleString('tr-TR'),
      label,
      unit: 'TL',
      risk_level: amount === 0 ? 'Tamam' : undefined,
    };
  }, undefined, requestId, 'Q4 verisi gerekli · Yıllık beyan');

  // Detay bilgilerini meta.extra içine ekle (modal için)
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;
    if (data) {
      // Q4 değilse reason_tr'yi envelope'a ekle
      if (data.ok === false) {
        envelope.reason_tr = data.reason_tr as string || 'Q4 verisi gerekli';
      }
      envelope.meta = {
        ...envelope.meta,
        extra: {
          ...envelope.meta.extra,
          secili_donem: data.secili_donem,
          gerekli_donem: data.gerekli_donem,
          aciklama: data.aciklama,
          ticari_kar: data.ticari_kar,
          mali_kar: data.mali_kar,
          matrah: data.matrah,
          vergi_orani: data.vergi_orani,
          hesaplanan_vergi: data.hesaplanan_vergi,
          mahsuplar: data.mahsuplar,
        },
      };
    }
  }

  return envelope;
}

export function normalizeCorporateTaxForecast(raw: unknown, requestId?: string): PanelEnvelope<KpiData> {
  const envelope = createKpiEnvelope<KpiData>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;
    if (!data) return undefined;

    // SAHTE VERİ YASAK - Backend ok:false dönerse veri yok demek
    if (data.ok === false) return undefined;

    const kombine = data.kombine as Record<string, unknown> | undefined;
    const amount = (kombine?.tahmini_vergi ?? data.tahmini_vergi ?? data.forecast_amount ?? data.amount) as number | undefined;
    if (typeof amount !== 'number') return undefined;

    // confidence değerini al (low/medium/high)
    const confidence = data.confidence as string | undefined;
    const confidenceSkor = data.confidence_skor as number | undefined;
    const seciliDonem = data.secili_donem as string | undefined;

    let label = 'Yıl Sonu Proj.';
    let riskLevel: string | undefined = 'Uyarı'; // Her zaman uyarı - tahmin!

    // Güven seviyesine göre label ayarla
    if (confidence === 'low') {
      label = `${seciliDonem || ''} → Yıl Sonu ⚠️`;
    } else if (confidence === 'medium') {
      label = `${seciliDonem || ''} → Yıl Sonu`;
    } else if (confidence === 'high') {
      label = `${seciliDonem || ''} → Yıl Sonu ✓`;
    }

    // Güven skoru %50'nin altındaysa ekstra uyarı
    if (confidenceSkor !== undefined && confidenceSkor < 0.5) {
      riskLevel = 'Düşük Güven';
    }

    return {
      value: `~${amount.toLocaleString('tr-TR')}`,  // ~ işareti tahmin olduğunu gösterir
      label,
      unit: 'TL',
      risk_level: riskLevel,
    };
  }, undefined, requestId, 'Projeksiyon için dönem mizan verisi gerekli');

  // Projeksiyon detaylarını meta.extra içine ekle (modal için)
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;
    if (data) {
      envelope.meta = {
        ...envelope.meta,
        extra: {
          ...envelope.meta.extra,
          secili_donem: data.secili_donem,
          yil: data.yil,
          mevcut_donem: data.mevcut_donem,
          gecmis_veri: data.gecmis_veri,
          projeksiyon_yontemleri: data.projeksiyon_yontemleri,
          kombine: data.kombine,
          senaryolar: data.senaryolar,
          confidence: data.confidence,
          confidence_skor: data.confidence_skor,
          confidence_aciklama: data.confidence_aciklama,
          uyarilar: data.uyarilar,
          onemli_not: data.onemli_not,
          metodoloji: data.metodoloji,
          donem_kar_zarar: data.donem_kar_zarar,
          tahmini_yillik_kar: data.tahmini_yillik_kar,
          tahmini_vergi: data.tahmini_vergi,
        },
      };
    }
  }

  return envelope;
}

export function normalizeInflation(raw: unknown, requestId?: string): PanelEnvelope<KpiData> {
  const envelope = createKpiEnvelope<KpiData>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;
    if (!data) return undefined;

    // ok: false → veri eksik, hesaplama yapılmamış
    if (data.ok === false) return undefined;

    // duzeltme_farklari null → hesaplama yapılmamış
    const duzeltmeFarklari = data.duzeltme_farklari as Record<string, unknown> | null | undefined;
    if (!duzeltmeFarklari) return undefined;

    // Backend duzeltme_farklari.698 döndürüyor (net enflasyon düzeltme farkı)
    const net698 = duzeltmeFarklari['698'] as number | undefined;
    if (typeof net698 !== 'number') return undefined;

    return {
      value: net698.toLocaleString('tr-TR'),
      label: 'Enflasyon Düzeltmesi',
      unit: 'TL',
      risk_level: undefined, // ok:true ise uyarı yok
    };
  }, undefined, requestId, 'Enflasyon düzeltmesi için gerekli veriler eksik');

  // Tüm enflasyon verilerini meta.extra içine ekle (modal için)
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;
    if (data) {
      envelope.meta = {
        ...envelope.meta,
        extra: {
          ...envelope.meta.extra,
          ok: data.ok,
          missing_data: data.missing_data,
          required_actions: data.required_actions,
          tufe_endeksi: data.tufe_endeksi,
          duzeltme_farklari: data.duzeltme_farklari,
          vergi_etkisi: data.vergi_etkisi,
          parasal_pozisyon: data.parasal_pozisyon,
        },
      };
    }
  }

  return envelope;
}

export function normalizeRegwatch(raw: unknown, requestId?: string): PanelEnvelope<KpiData> {
  return createKpiEnvelope<KpiData>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;
    if (!data) return undefined;
    // Dinamik beyan takviminden sonraki beyani al
    const sonrakiBeyan = getSonrakiBeyan();
    if (sonrakiBeyan) {
      // Kalan gün hesapla
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sonTarih = new Date(sonrakiBeyan.sonTarih);
      const kalanGun = Math.ceil((sonTarih.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Kalan gün sayısına göre risk seviyesi
      let riskLevel: string;
      if (kalanGun <= 3) {
        riskLevel = 'Kritik';  // 3 gün veya daha az
      } else if (kalanGun <= 7) {
        riskLevel = 'Yüksek';  // 1 hafta içinde
      } else if (kalanGun <= 14) {
        riskLevel = 'Orta';    // 2 hafta içinde
      } else {
        riskLevel = 'Tamam';   // 2 haftadan fazla var
      }
      return {
        value: formatTarihKisa(sonrakiBeyan.sonTarih),
        label: `${sonrakiBeyan.beyanname} son gun`,
        risk_level: riskLevel,
      };
    }
    // Fallback - beyan bulunamazsa
    return {
      value: '-',
      label: 'Beyan takvimi bos',
      risk_level: 'Bekliyor',
    };
  }, undefined, requestId, 'Beyan takvimini goruntule');
}
