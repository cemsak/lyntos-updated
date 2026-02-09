import type { PanelEnvelope } from '../contracts/envelope';
import { normalizeToEnvelope } from '../contracts/map';

// YIUFE_DEMO_DATA kaldırıldı - Mock data yasak
// Gerçek Yİ-ÜFE verisi TCMB EVDS API'den gelecek
// https://evds2.tcmb.gov.tr/
export interface YiufeData {
  son3Yil: number | null;
  son3YilEsik: number;
  son12Ay: number | null;
  son12AyEsik: number;
  duzeltmeKatsayisi: number | null;
  referansTarih: string | null;
  isLoading: boolean;
  error: string | null;
}

// Sabit eşik değerleri (VUK Geçici 33 uyarınca)
export const YIUFE_ESIK_DEGERLERI = {
  son3YilEsik: 100,  // %100
  son12AyEsik: 10,   // %10
};

// VUK Geçici Madde 33 Açıklaması - Hardcoded değerler kaldırıldı
export const VUK_GEC33_INFO = {
  baslik: 'VUK Geçici Madde 33 Nedir?',
  açıklama: `Vergi Usul Kanunu Geçici Madde 33, yüksek enflasyon dönemlerinde mali tabloların düzeltilmesini düzenler.`,
  kosullar: [
    'Yİ-ÜFE son 3 yılda %100\'ü aşmalı',
    'Yİ-ÜFE son 12 ayda %10\'u aşmalı',
    'Her iki koşul da sağlanmalıdır',
  ],
  yontem: [
    'Parasal olmayan aktif ve pasifler düzeltilir',
    'Düzeltme farkı özkaynaklar arasında muhasebeleştirilir',
    'Vergisel açıdan ayrı değerlendirme yapılır',
  ],
  uyarilar: [
    'VUK Gec.33 ile TMS 29 farklı sonuçlar verebilir',
    'Vergi matrahı hesaplamasında dikkatli olunmalı',
    'SMMM olarak mükellefi bilgilendirin',
  ],
};

export interface InflationItem {
  id: string;
  hesap_grubu: string;
  hesap_grubu_tr: string;
  original_amount: number;
  adjusted_amount: number;
  adjustment_factor: number;
  difference: number;
  method: 'TMS29' | 'VUK_GEC33' | 'MIXED';
}

export interface InflationResult {
  items: InflationItem[];
  summary: {
    total_original: number;
    total_adjusted: number;
    total_difference: number;
    effective_rate: number;
    method_used: string;
  };
  applicable: boolean;
  threshold_met: boolean;
}

function mapMethod(m: unknown): InflationItem['method'] {
  const str = String(m).toUpperCase();
  if (str.includes('TMS') || str.includes('29')) return 'TMS29';
  if (str.includes('VUK') || str.includes('33') || str.includes('GECICI')) return 'VUK_GEC33';
  return 'MIXED';
}

export function normalizeInflation(raw: unknown): PanelEnvelope<InflationResult> {
  return normalizeToEnvelope<InflationResult>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;

    const itemsRaw = data?.items || data?.adjustments || data?.hesaplar || [];
    const items: InflationItem[] = Array.isArray(itemsRaw)
      ? itemsRaw.map((item: Record<string, unknown>, idx: number) => ({
          id: String(item.id || `inf-${idx}`),
          hesap_grubu: String(item.hesap_grubu || item.group_code || item.code || ''),
          hesap_grubu_tr: String(item.hesap_grubu_tr || item.group_name || item.name || ''),
          original_amount: typeof item.original_amount === 'number' ? item.original_amount : typeof item.original === 'number' ? item.original : 0,
          adjusted_amount: typeof item.adjusted_amount === 'number' ? item.adjusted_amount : typeof item.adjusted === 'number' ? item.adjusted : 0,
          adjustment_factor: typeof item.adjustment_factor === 'number' ? item.adjustment_factor : typeof item.factor === 'number' ? item.factor : 1,
          difference: typeof item.difference === 'number' ? item.difference : 0,
          method: mapMethod(item.method),
        }))
      : [];

    const summaryRaw = data?.summary as Record<string, unknown> | undefined;
    const totalOriginal = items.reduce((sum, i) => sum + i.original_amount, 0);
    const totalAdjusted = items.reduce((sum, i) => sum + i.adjusted_amount, 0);

    return {
      items,
      summary: {
        total_original: typeof summaryRaw?.total_original === 'number' ? summaryRaw.total_original : totalOriginal,
        total_adjusted: typeof summaryRaw?.total_adjusted === 'number' ? summaryRaw.total_adjusted : totalAdjusted,
        total_difference: typeof summaryRaw?.total_difference === 'number' ? summaryRaw.total_difference : totalAdjusted - totalOriginal,
        effective_rate: typeof summaryRaw?.effective_rate === 'number' ? summaryRaw.effective_rate : 0,
        method_used: String(summaryRaw?.method_used || 'VUK_GEC33'),
      },
      applicable: typeof data?.applicable === 'boolean' ? data.applicable : true,
      threshold_met: typeof data?.threshold_met === 'boolean' ? data.threshold_met : true,
    };
  });
}

export const METHOD_LABELS: Record<InflationItem['method'], { label: string; badge: 'info' | 'success' | 'warning' }> = {
  TMS29: { label: 'TMS 29', badge: 'info' },
  VUK_GEC33: { label: 'VUK Geç. 33', badge: 'success' },
  MIXED: { label: 'Karma', badge: 'warning' },
};
