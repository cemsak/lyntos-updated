/**
 * LYNTOS Signal Generator Types
 * Sprint 4.1 - Domain Signal Contract
 *
 * Anayasa: "Her sinyal why + evidence + actions + impact içermeli"
 */

import type {
  FeedItem,
  FeedSeverity,
  FeedCategory,
  FeedAction,
  FeedImpact,
  EvidenceRef,
} from '../feed/types';

// ═══════════════════════════════════════════════════════════════════
// SIGNAL INPUT TYPES (from source data)
// ═══════════════════════════════════════════════════════════════════

export interface MizanHesap {
  kod: string; // "100", "102", "131", etc.
  ad: string; // "Kasa", "Bankalar", etc.
  borc: number; // Borç toplamı
  alacak: number; // Alacak toplamı
  bakiye: number; // Net bakiye (mutlak değer)
  bakiyeYonu: 'B' | 'A'; // Borç veya Alacak yönü
  oncekiDonemBakiye?: number;
}

export interface MizanContext {
  period: string; // "2024-Q4"
  client_id: string;
  smmm_id: string;
  ciro?: number; // Dönem cirosu (600+601+602)
  sermaye?: number; // Ödenmiş sermaye
  toplamAktif?: number;
}

// ═══════════════════════════════════════════════════════════════════
// SIGNAL OUTPUT TYPES
// ═══════════════════════════════════════════════════════════════════

export interface SignalResult {
  signals: FeedItem[];
  stats: {
    total_checked: number;
    signals_generated: number;
    by_severity: Record<FeedSeverity, number>;
  };
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════
// SIGNAL RULE DEFINITION
// ═══════════════════════════════════════════════════════════════════

export interface SignalRule {
  id: string;
  name: string;
  description: string;
  hesapKodlari: string[]; // ["100"] veya ["600", "601", "602"]
  category: FeedCategory;
  check: (hesap: MizanHesap, context: MizanContext) => SignalCheckResult | null;
}

export interface SignalCheckResult {
  severity: FeedSeverity;
  score: number;
  impact: FeedImpact;
  title: string;
  summary: string; // why: neden bu sinyal üretildi
  why: string; // Explainability contract
  evidence_refs: EvidenceRef[];
  actions: FeedAction[];
  dedupe_key: string;
}

// ═══════════════════════════════════════════════════════════════════
// MATERIALITY THRESHOLDS
// ═══════════════════════════════════════════════════════════════════

export const MATERIALITY = {
  // Mutlak eşikler (TL)
  KASA_MIN: 1000, // 1000 TL altı ihmal edilebilir
  BANKA_MIN: 5000,
  STOK_MIN: 10000,
  ALACAK_MIN: 25000,

  // Oran eşikleri
  KASA_CIRO_MAX: 0.05, // Kasa / Ciro max %5
  ORTAK_SERMAYE_MAX: 0.25, // Ortaklara borç / Sermaye max %25
  SUPHELI_ALACAK_MAX: 0.1, // Şüpheli alacak / Toplam alacak max %10
  DONEM_SAPMA_MAX: 0.3, // Dönemsel değişim max %30
} as const;

// ═══════════════════════════════════════════════════════════════════
// VDK RISK MAPPING
// ═══════════════════════════════════════════════════════════════════

export const VDK_RISK_HESAPLAR = [
  '100', // Kasa - negatif/yüksek
  '131', // Ortaklara borçlar
  '331', // Ortaklardan alacaklar
  '153', // Ticari mallar - negatif
  '136', // Diğer alacaklar
  '336', // Diğer borçlar
] as const;

// ═══════════════════════════════════════════════════════════════════
// CROSS CHECK TYPES (Sprint 4.2)
// ═══════════════════════════════════════════════════════════════════

export type CrossCheckType =
  | 'banka'
  | 'kasa'
  | 'stok'
  | 'alici'
  | 'satici'
  | 'kdv';

export interface CrossCheckItem {
  type: CrossCheckType;
  label: string;
  mizanHesapKodu: string;
  mizanBakiye: number;
  karsiVeriBakiye: number;
  fark: number;
  farkYuzde: number;
  karsiVeriKaynagi: string; // "Is Bankasi Ekstre", "31.12.2024 Sayim", etc.
  karsiVeriTarihi?: string;
}

export interface CrossCheckContext {
  period: string;
  client_id: string;
  smmm_id: string;
}

export interface CrossCheckResult {
  signals: FeedItem[];
  stats: {
    total_checked: number;
    signals_generated: number;
    total_fark: number;
    by_type: Record<CrossCheckType, number>;
  };
  errors: string[];
}

// Cross Check Materiality Thresholds
export const CROSSCHECK_THRESHOLDS: Record<
  CrossCheckType,
  {
    minFark: number;
    minYuzde: number;
    severity: FeedSeverity;
  }
> = {
  banka: { minFark: 100, minYuzde: 0.1, severity: 'HIGH' },
  kasa: { minFark: 50, minYuzde: 0.5, severity: 'HIGH' },
  stok: { minFark: 1000, minYuzde: 1, severity: 'MEDIUM' },
  alici: { minFark: 5000, minYuzde: 2, severity: 'MEDIUM' },
  satici: { minFark: 5000, minYuzde: 2, severity: 'MEDIUM' },
  kdv: { minFark: 100, minYuzde: 0.1, severity: 'HIGH' },
};
