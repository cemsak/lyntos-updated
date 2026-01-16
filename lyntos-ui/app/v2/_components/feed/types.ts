/**
 * LYNTOS Intelligence Feed Types
 * Sprint 4.0 - Deterministic Feed Contract
 *
 * Anayasa: "Kart üretilmeden önce why + evidence + actions zorunlu"
 */

// ═══════════════════════════════════════════════════════════════════
// ENUMS & BASIC TYPES
// ═══════════════════════════════════════════════════════════════════

export type FeedCategory =
  | 'VDK'
  | 'Mizan'
  | 'GV'
  | 'KV'
  | 'Mutabakat'
  | 'Enflasyon'
  | 'Mevzuat'
  | 'Hukuk'
  | 'Pratik'
  | 'Belge'
  | 'Vergus';

export type FeedSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type EvidenceKind =
  | 'mizan_row'        // Mizan satırı referansı
  | 'fis_detay'        // Fiş/yevmiye detayı
  | 'belge_ref'        // Belge referansı (fatura, dekont vb.)
  | 'ekstre_satir'     // Banka ekstresi satırı
  | 'beyanname_ref'    // Beyanname referansı
  | 'mevzuat_ref'      // Kanun/tebliğ referansı
  | 'vdk_kural'        // VDK kuralı
  | 'missing_doc'      // Eksik belge
  | 'calculation'      // Hesaplama detayı
  | 'external_source'; // Dış kaynak (RegWatch, vb.)

export type ActionKind =
  | 'navigate'         // Uygulama içi navigasyon
  | 'external'         // Dış link açma
  | 'modal'            // Modal açma
  | 'api_call'         // API çağrısı (resolve, snooze vb.)
  | 'download';        // Dosya indirme

// ═══════════════════════════════════════════════════════════════════
// SCOPE
// ═══════════════════════════════════════════════════════════════════

export interface FeedScope {
  smmm_id: string;
  client_id: string;
  period: string; // Format: YYYY-QN veya YYYY-MM
}

// ═══════════════════════════════════════════════════════════════════
// IMPACT
// ═══════════════════════════════════════════════════════════════════

export interface FeedImpact {
  amount_try?: number;  // Mutlak TL tutarı
  pct?: number;         // Yüzdesel etki (örn: %2.5 → 2.5)
  points?: number;      // VDK risk puanı etkisi
}

// ═══════════════════════════════════════════════════════════════════
// EVIDENCE REFERENCE (Structured)
// ═══════════════════════════════════════════════════════════════════

export interface EvidenceRef {
  kind: EvidenceKind;
  ref: string;           // Unique referans ID (örn: "mizan-2024-q4-100")
  label: string;         // İnsan okunabilir etiket
  period?: string;       // İlgili dönem (opsiyonel)
  account_code?: string; // Hesap kodu (mizan referansları için)
  amount?: number;       // İlgili tutar (opsiyonel)
  href?: string;         // Detay sayfasına link (opsiyonel)
}

// ═══════════════════════════════════════════════════════════════════
// FEED ACTION
// ═══════════════════════════════════════════════════════════════════

export interface FeedAction {
  id: string;            // Unique action identifier
  label: string;         // Button label
  kind: ActionKind;
  variant?: 'primary' | 'secondary' | 'danger';
  href?: string;         // For navigate/external actions
  payload?: Record<string, unknown>; // For api_call/modal actions
  // Legacy support
  action?: string;       // Deprecated: use id instead
}

// ═══════════════════════════════════════════════════════════════════
// FEED ITEM (Full Contract)
// ═══════════════════════════════════════════════════════════════════

export interface FeedItem {
  // Identity
  id: string;
  scope: FeedScope;
  dedupe_key: string;    // Required for deduplication

  // Classification
  category: FeedCategory;
  severity: FeedSeverity;
  score: number;         // 0-100, higher = more important

  // Impact Assessment
  impact: FeedImpact;

  // Content (Explainability Contract)
  title: string;
  summary: string;
  why: string;           // REQUIRED: Neden bu kart çıktı?

  // Evidence (Explainability Contract)
  evidence_refs: EvidenceRef[]; // REQUIRED: Min 1 kanıt

  // Actions (Explainability Contract)
  actions: FeedAction[]; // REQUIRED: Min 1 aksiyon

  // Lifecycle
  snoozeable: boolean;
  expires_at?: string;   // ISO date string
  created_at?: string;   // ISO date string

  // Legal basis (for Mevzuat/Hukuk categories)
  legal_basis_refs?: string[];
}

// ═══════════════════════════════════════════════════════════════════
// RAW FEED ITEM (Before pipeline processing)
// ═══════════════════════════════════════════════════════════════════

export interface RawFeedItem extends Omit<FeedItem, 'id'> {
  id?: string; // ID can be auto-generated
}

// ═══════════════════════════════════════════════════════════════════
// MATERIALITY PRESET
// ═══════════════════════════════════════════════════════════════════

export interface MaterialityPreset {
  name: string;
  // Mutlak eşikler (TL)
  absolute_threshold_try: number;
  // Oransal eşik (% cinsinden, örn: 0.5 = %0.5)
  relative_threshold_pct: number;
  // Minimum puan eşiği
  min_score: number;
  // Kritik istisna kategorileri (eşik bypass)
  critical_exception_categories: FeedCategory[];
  // Kritik istisna severity'leri (eşik bypass)
  critical_exception_severities: FeedSeverity[];
  // Kritik istisna evidence kind'leri (tutardan bağımsız geçer)
  critical_exception_evidence_kinds: EvidenceKind[];
}

/**
 * Kritik Evidence Kind'ler (tüm preset'lerde bypass)
 * Bu kind'ler tutardan bağımsız olarak materiality geçer
 */
export const CRITICAL_EVIDENCE_KINDS: EvidenceKind[] = [
  'missing_doc',  // Eksik belge her zaman kritik
  'vdk_kural',    // VDK kuralları her zaman önemli
];

// ═══════════════════════════════════════════════════════════════════
// FEED BUILD RESULT
// ═══════════════════════════════════════════════════════════════════

export interface FeedBuildResult {
  items: FeedItem[];
  stats: {
    total_raw: number;
    passed_explainability: number;
    passed_materiality: number;
    after_dedupe: number;
    final_count: number;
    others_count: number; // Items dropped due to daily limit
  };
}

// ═══════════════════════════════════════════════════════════════════
// UI CONFIGS
// ═══════════════════════════════════════════════════════════════════

// Severity configuration
export const SEVERITY_CONFIG: Record<FeedSeverity, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}> = {
  CRITICAL: {
    label: 'Kritik',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-l-red-500',
    icon: '🚨',
  },
  HIGH: {
    label: 'Yüksek',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-l-orange-500',
    icon: '⚠️',
  },
  MEDIUM: {
    label: 'Orta',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-l-amber-500',
    icon: '📋',
  },
  LOW: {
    label: 'Düşük',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-l-blue-500',
    icon: '📝',
  },
  INFO: {
    label: 'Bilgi',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-l-slate-300',
    icon: 'ℹ️',
  },
};

// Category configuration
export const CATEGORY_CONFIG: Record<FeedCategory, {
  label: string;
  icon: string;
  color: string;
}> = {
  VDK: { label: 'VDK Risk', icon: '🎯', color: 'text-red-600' },
  Mizan: { label: 'Mizan', icon: '📊', color: 'text-blue-600' },
  GV: { label: 'Geçici Vergi', icon: '💰', color: 'text-green-600' },
  KV: { label: 'Kurumlar Vergisi', icon: '🏢', color: 'text-purple-600' },
  Mutabakat: { label: 'Mutabakat', icon: '✓', color: 'text-emerald-600' },
  Enflasyon: { label: 'Enflasyon', icon: '📈', color: 'text-amber-600' },
  Mevzuat: { label: 'Mevzuat', icon: '📡', color: 'text-indigo-600' },
  Hukuk: { label: 'Şirketler Hukuku', icon: '⚖️', color: 'text-slate-600' },
  Pratik: { label: 'Pratik Bilgi', icon: '💡', color: 'text-cyan-600' },
  Belge: { label: 'Eksik Belge', icon: '📁', color: 'text-orange-600' },
  Vergus: { label: 'Vergi Stratejisi', icon: '✨', color: 'text-violet-600' },
};

// Evidence Kind labels
export const EVIDENCE_KIND_CONFIG: Record<EvidenceKind, {
  label: string;
  icon: string;
}> = {
  mizan_row: { label: 'Mizan Satırı', icon: '📊' },
  fis_detay: { label: 'Fiş Detayı', icon: '📝' },
  belge_ref: { label: 'Belge', icon: '📄' },
  ekstre_satir: { label: 'Ekstre Satırı', icon: '🏦' },
  beyanname_ref: { label: 'Beyanname', icon: '📋' },
  mevzuat_ref: { label: 'Mevzuat', icon: '⚖️' },
  vdk_kural: { label: 'VDK Kuralı', icon: '🎯' },
  missing_doc: { label: 'Eksik Belge', icon: '❓' },
  calculation: { label: 'Hesaplama', icon: '🔢' },
  external_source: { label: 'Dış Kaynak', icon: '🌐' },
};
