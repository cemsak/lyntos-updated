/**
 * LYNTOS Cross-Check Engine Types
 * VDK/YMM denetim mantigina uygun capraz kontrol tipleri
 *
 * Note: "Engine" prefix kullaniliyor cunku ana types.ts'de
 * zaten CrossCheckResult ve CrossCheckReport tanimli.
 */

export type CheckSeverity = 'critical' | 'warning' | 'info';
export type CheckStatus = 'pass' | 'fail' | 'skip' | 'partial';

export interface CheckEvidence {
  source: string;        // Dosya adi
  field: string;         // Alan adi (hesapKodu, matrah, vs.)
  value: number | string;
  line?: number;         // Satir numarasi (varsa)
  page?: number;         // Sayfa numarasi (PDF icin)
}

export interface EngineCheckResult {
  ruleId: string;        // R-KDV-001 formatinda
  ruleName: string;      // Turkce aciklama
  category: string;      // 'kdv' | 'muhtasar' | 'banka' | 'yevmiye' | 'edefter'
  status: CheckStatus;
  severity: CheckSeverity;

  expected: number | string | null;
  actual: number | string | null;
  difference?: number;
  toleranceUsed?: number;

  evidenceA: CheckEvidence;  // Birinci kaynak (genellikle Mizan)
  evidenceB: CheckEvidence;  // Ikinci kaynak (beyanname, banka vs.)

  message: string;           // Kullaniciya gosterilecek mesaj
  suggestion?: string;       // Duzeltme onerisi
  legalBasis?: string;       // Yasal dayanak (VUK, KDV Kanunu vs.)

  checkTime: string;         // ISO timestamp
}

export interface EngineCheckSummary {
  totalChecks: number;
  passed: number;
  failed: number;
  skipped: number;
  partial: number;

  criticalIssues: number;
  warnings: number;

  categories: {
    kdv: { total: number; passed: number; failed: number };
    muhtasar: { total: number; passed: number; failed: number };
    banka: { total: number; passed: number; failed: number };
    yevmiye: { total: number; passed: number; failed: number };
    edefter: { total: number; passed: number; failed: number };
  };
}

export interface EngineCheckReport {
  vkn: string | null;
  unvan: string | null;
  donem: string | null;

  checkTime: string;
  checkDurationMs: number;

  summary: EngineCheckSummary;
  results: EngineCheckResult[];

  // Gruplandirilmis sonuclar
  byCategory: Record<string, EngineCheckResult[]>;
  bySeverity: Record<CheckSeverity, EngineCheckResult[]>;
  byStatus: Record<CheckStatus, EngineCheckResult[]>;
}

// Rule interface - her kural bu interface'i implement eder
export interface EngineCheckRule {
  ruleId: string;
  ruleName: string;
  category: string;
  severity: CheckSeverity;
  legalBasis?: string;

  check(data: CrossCheckInput): Promise<EngineCheckResult[]>;
}

// Engine'e giren tum parse edilmis veriler
export interface CrossCheckInput {
  mizan: import('../types').ParsedMizan | null;
  yevmiye: import('../types').ParsedYevmiye | null;
  kebir: import('../types').ParsedKebir | null;
  edefter: import('../types').ParsedEDefter[];
  kdvBeyannameler: import('../types').ParsedKDVBeyanname[];
  muhtasarlar: import('../types').ParsedMuhtasar[];
  geciciVergiler: import('../types').ParsedGeciciVergi[];
  bankaEkstreleri: import('../types').ParsedBankaEkstre[];
}

// Tolerans ayarlari
export interface ToleranceConfig {
  absoluteTL: number;     // Mutlak fark (TL)
  percentageRate: number; // Yuzde tolerans (0.01 = %1)
}

export const DEFAULT_TOLERANCE: ToleranceConfig = {
  absoluteTL: 1.00,       // 1 TL'ye kadar fark kabul
  percentageRate: 0.001   // %0.1'e kadar fark kabul
};
