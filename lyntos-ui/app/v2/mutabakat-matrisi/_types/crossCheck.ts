/**
 * Mutabakat Matrisi Tip Tanimlari
 * Backend CrossCheckResult + frontend enrichment types
 */

// ══════════════════════════════════════════════════════════
// Backend response types (API contract mirror)
// ══════════════════════════════════════════════════════════

export type CheckStatus = 'pass' | 'fail' | 'warning' | 'skipped' | 'no_data';
export type CheckSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface CrossCheckResultRaw {
  check_id: string;
  check_name: string;
  check_name_tr: string;
  description: string;
  status: CheckStatus;
  severity: CheckSeverity;

  // Values compared
  source_label: string;
  source_value: number;
  target_label: string;
  target_value: number;
  difference: number;
  difference_percent: number;

  // Tolerance
  tolerance_amount: number;
  tolerance_percent: number;

  // Rich fields (backend ALREADY returns these)
  message: string;
  recommendation?: string;
  evidence?: Record<string, unknown>;
}

export interface CrossCheckSummaryRaw {
  period_id: string;
  tenant_id: string;
  client_id: string;
  total_checks: number;
  passed: number;
  failed: number;
  warnings: number;
  skipped: number;
  no_data: number;
  critical_issues: number;
  high_issues: number;
  medium_issues: number;
  low_issues: number;
  overall_status: CheckStatus;
  completion_percent: number;
  checks: CrossCheckResultRaw[];
  checked_at: string;
  recommended_actions: string[];
}

// ══════════════════════════════════════════════════════════
// Frontend enrichment types
// ══════════════════════════════════════════════════════════

export type RootCause =
  | 'UYUMLU'
  | 'VERI_EKSIK'
  | 'YAPISAL_FARK'
  | 'ZAMANLAMA_FARKI'
  | 'HESAPLAMA_HATASI'
  | 'BILINMEYEN';

export interface RootCauseResult {
  neden: RootCause;
  guvenilirlik: 'kesin' | 'tahmini';
  aciklama: string;
}

export type SmmmKarar = 'KABUL' | 'REDDEDILDI' | 'INCELENIYOR' | 'BILINMIYOR';

export interface SmmmKararData {
  karar: SmmmKarar;
  not: string;
  tarih: string;
}

export interface ConfidenceSplit {
  kapsam: number;
  eslestirme: number;
  toplam: number;
  aciklama: string;
}

export interface TrendData {
  direction: 'up' | 'down' | 'stable' | 'no_history';
  change_pct: number;
  previous_value: number;
  aciklama: string;
}

export interface EnrichedCrossCheck extends CrossCheckResultRaw {
  rootCause: RootCauseResult;
  smmmKarar: SmmmKararData;
  confidence: ConfidenceSplit;
  trend?: TrendData;
}

// ══════════════════════════════════════════════════════════
// Filter types
// ══════════════════════════════════════════════════════════

export type CheckFilter = 'all' | 'kritik' | 'failed' | 'warning' | 'passed' | 'no_data';
export type GroupFilter = 'all' | 'beyan' | 'teknik' | 'mali' | 'efatura';

// ══════════════════════════════════════════════════════════
// Config constants
// ══════════════════════════════════════════════════════════

export const SEVERITY_CONFIG: Record<CheckSeverity, {
  label: string;
  badgeVariant: 'error' | 'warning' | 'success' | 'info' | 'default';
  priority: number;
}> = {
  critical: { label: 'KRiTiK', badgeVariant: 'error', priority: 1 },
  high: { label: 'YUKSEK', badgeVariant: 'error', priority: 2 },
  medium: { label: 'ORTA', badgeVariant: 'warning', priority: 3 },
  low: { label: 'DUSUK', badgeVariant: 'success', priority: 4 },
  info: { label: 'BiLGi', badgeVariant: 'info', priority: 5 },
};

export const STATUS_CONFIG: Record<CheckStatus, {
  label: string;
  badgeVariant: 'error' | 'warning' | 'success' | 'info' | 'default';
}> = {
  pass: { label: 'Basarili', badgeVariant: 'success' },
  fail: { label: 'Basarisiz', badgeVariant: 'error' },
  warning: { label: 'Uyari', badgeVariant: 'warning' },
  no_data: { label: 'Veri Yok', badgeVariant: 'warning' },
  skipped: { label: 'Atlandi', badgeVariant: 'default' },
};

export const SMMM_KARAR_CONFIG: Record<SmmmKarar, {
  label: string;
  tooltip: string;
  badgeVariant: 'error' | 'warning' | 'success' | 'info' | 'default';
}> = {
  KABUL: {
    label: 'Kabul Edildi',
    tooltip: 'Bu kontrol sonucu kabul edildi ve dosyaya dahil edilecek',
    badgeVariant: 'success',
  },
  REDDEDILDI: {
    label: 'Reddedildi',
    tooltip: 'Bu kontrol sonucu reddedildi, duzeltme gerekiyor',
    badgeVariant: 'error',
  },
  INCELENIYOR: {
    label: 'Inceleniyor',
    tooltip: 'Bu kontrol henuz devam ediyor',
    badgeVariant: 'info',
  },
  BILINMIYOR: {
    label: 'Karar Bekleniyor',
    tooltip: 'SMMM karar vermeli',
    badgeVariant: 'warning',
  },
};

export const ROOT_CAUSE_CONFIG: Record<RootCause, {
  label: string;
  aciklama: string;
  badgeVariant: 'error' | 'warning' | 'success' | 'info' | 'default';
}> = {
  UYUMLU: {
    label: 'Uyumlu',
    aciklama: 'Kaynak ve hedef degerler tolerans dahilinde eslesiyor',
    badgeVariant: 'success',
  },
  VERI_EKSIK: {
    label: 'Veri Eksik',
    aciklama: 'Karsilastirma icin gereken veri yuklenmemis',
    badgeVariant: 'warning',
  },
  YAPISAL_FARK: {
    label: 'Yapisal Fark',
    aciklama: 'Mizan ile beyanname/rapor arasinda yapisal bir fark tespit edildi',
    badgeVariant: 'error',
  },
  ZAMANLAMA_FARKI: {
    label: 'Zamanlama',
    aciklama: 'Donem sonu zamanlama farki (cut-off)',
    badgeVariant: 'info',
  },
  HESAPLAMA_HATASI: {
    label: 'Hesaplama Hatasi',
    aciklama: 'Olasi hesaplama veya kayit hatasi',
    badgeVariant: 'error',
  },
  BILINMEYEN: {
    label: 'Incelenmeli',
    aciklama: 'Fark nedeni otomatik belirlenemedi',
    badgeVariant: 'warning',
  },
};
