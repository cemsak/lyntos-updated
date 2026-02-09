/**
 * LYNTOS - Cari Mutabakat Type Definitions
 *
 * Tüm cari mutabakat tipleri tek yerde.
 * Backend endpoint'leri DEĞİŞTİRİLMEZ — bu tipler frontend-only.
 */

// ═══════════════════════════════════════════════════════════
// BACKEND RESPONSE TYPES (mevcut API'lerden)
// ═══════════════════════════════════════════════════════════

/** Backend'den dönen mutabakat satırı (GET /api/v2/cari-mutabakat/list) */
export interface MutabakatSatir {
  id?: number;
  hesap_kodu: string;
  hesap_adi?: string;
  karsi_taraf: string;
  ekstre_bakiye: number;
  mizan_bakiye: number;
  fark: number;
  fark_yuzde: number;
  durum: 'beklemede' | 'uyumlu' | 'farkli' | 'onaylandi';
  aging_gun: number;
  supheli_alacak_riski: boolean;
  onaylayan?: string;
  onay_tarihi?: string;
  source_file?: string;
  uploaded_at?: string;
}

/** Backend'den dönen özet (GET /api/v2/cari-mutabakat/ozet) */
export interface MutabakatOzet {
  veri_var: boolean;
  toplam_hesap: number;
  uyumlu: number;
  farkli: number;
  onaylanan: number;
  beklemede: number;
  toplam_fark: number;
  supheli_alacak_sayisi: number;
  son_yukleme: string | null;
  mevzuat_ref?: string;
}

// ═══════════════════════════════════════════════════════════
// ROOT CAUSE ANALYSIS (frontend-only)
// ═══════════════════════════════════════════════════════════

/** Fark nedeni otomatik belirleme sonuçları */
export type RootCause =
  | 'UYUMLU'           // Fark yok veya tolerans dahili
  | 'EKSTRE_EKSIK'     // Karşı taraftan ekstre gelmemiş
  | 'KAYITSIZ_HAREKET' // Mizan'da hesap yok/sıfır
  | 'CUT_OFF'          // Dönem sonu zamanlama farkı
  | 'YUVARLAMA'        // Kuruş/yuvarlama farkı
  | 'SUPHELI_ALACAK'   // VUK 323 - 365+ gün
  | 'BILINMEYEN_FARK'; // Otomatik belirlenemedi

export interface RootCauseResult {
  neden: RootCause;
  guvenilirlik: 'kesin' | 'tahmini';
  aciklama: string;
}

/** Root cause → UI eşleştirme */
export interface RootCauseConfig {
  kisaEtiket: string;
  uzunAciklama: string;
  badgeVariant: 'default' | 'success' | 'warning' | 'error' | 'info';
  icon: string; // lucide icon adı
}

export const ROOT_CAUSE_CONFIG: Record<RootCause, RootCauseConfig> = {
  UYUMLU: {
    kisaEtiket: 'Uyumlu',
    uzunAciklama: 'Mizan ve ekstre bakiyeleri eşleşiyor (±10 TL tolerans dahilinde).',
    badgeVariant: 'success',
    icon: 'CheckCircle2',
  },
  EKSTRE_EKSIK: {
    kisaEtiket: 'Ekstre Eksik',
    uzunAciklama: 'Karşı taraftan cari hesap ekstresi gelmemiş. Mizan\'da bakiye mevcut ancak karşılaştırma yapılamıyor.',
    badgeVariant: 'warning',
    icon: 'FileX',
  },
  KAYITSIZ_HAREKET: {
    kisaEtiket: 'Kayıtsız Hareket',
    uzunAciklama: 'Bu hesap kodu mizan\'da bulunmuyor veya bakiye sıfır. Ekstre\'de bakiye var — kayıtlanmamış hareket olabilir.',
    badgeVariant: 'error',
    icon: 'AlertTriangle',
  },
  CUT_OFF: {
    kisaEtiket: 'Zamanlama Farkı',
    uzunAciklama: 'Dönem sonu son günlerde hareket tespit edildi. Karşı tarafta farklı tarihte kayıtlanmış olabilir (cut-off farkı).',
    badgeVariant: 'info',
    icon: 'Clock',
  },
  YUVARLAMA: {
    kisaEtiket: 'Yuvarlama Farkı',
    uzunAciklama: 'Kuruş düzeyinde yuvarlama farkı tespit edildi. Düzeltme genellikle gerekmez.',
    badgeVariant: 'default',
    icon: 'ArrowUpDown',
  },
  SUPHELI_ALACAK: {
    kisaEtiket: 'Şüpheli Alacak',
    uzunAciklama: 'VUK Md. 323 — Bu alacak 365 günü aşmış durumda. Şüpheli ticari alacak karşılığı (TDHP 128/129) ayrılması değerlendirilmelidir.',
    badgeVariant: 'error',
    icon: 'ShieldAlert',
  },
  BILINMEYEN_FARK: {
    kisaEtiket: 'İnceleme Gerekli',
    uzunAciklama: 'Fark nedeni otomatik belirlenemedi. Muavin, banka ve kasa kanıtlarını inceleyerek karar veriniz.',
    badgeVariant: 'warning',
    icon: 'HelpCircle',
  },
};

// ═══════════════════════════════════════════════════════════
// SMMM KARAR SİSTEMİ (frontend-only)
// ═══════════════════════════════════════════════════════════

/** SMMM'nin her satır için verdiği karar */
export type SmmmKarar = 'RESMI' | 'DEFTER_DISI' | 'BILINMIYOR';

export interface SmmmKararData {
  karar: SmmmKarar;
  not: string;
  tarih: string;
}

/** Karar → UI eşleştirme */
export interface SmmmKararConfig {
  label: string;
  tooltip: string;
  badgeVariant: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export const SMMM_KARAR_CONFIG: Record<SmmmKarar, SmmmKararConfig> = {
  RESMI: {
    label: 'Resmi',
    tooltip: 'Bu fark resmi kayıtlarda yer almaktadır. Resmi Mutabakat Raporu\'na dahil edilecektir.',
    badgeVariant: 'info',
  },
  DEFTER_DISI: {
    label: 'Defter Dışı',
    tooltip: 'Bu fark defter dışı (informal/kişisel) nedenlerden kaynaklanmaktadır. Risk hesaplamalarına ve KPI\'lara dahil EDİLMEZ.',
    badgeVariant: 'default',
  },
  BILINMIYOR: {
    label: 'Bilinmiyor',
    tooltip: 'Henüz karar verilmemiş. Kanıtları inceleyerek RESMİ veya DEFTER_DIŞI olarak sınıflandırınız.',
    badgeVariant: 'warning',
  },
};

// ═══════════════════════════════════════════════════════════
// EVIDENCE (KANIT) TYPES
// ═══════════════════════════════════════════════════════════

/** Kanıt bloğu türleri */
export type EvidenceBlockType = 'defter' | 'banka' | 'kasa' | 'mahsup';

/** Kanıt bloğu yükleme durumu */
export interface EvidenceBlockState<T = unknown> {
  loading: boolean;
  data: T | null;
  error: string | null;
  kayitSayisi: number;
}

/** Defter (muavin) kaydı - kebir API'den */
export interface DefterKaydi {
  id: number;
  tarih: string;
  fis_no: string | null;
  aciklama: string | null;
  borc: number;
  alacak: number;
  bakiye: number;
  bakiye_turu: string;
}

/** Banka hareketi - banka API'den */
export interface BankaHareketi {
  id: number;
  tarih: string;
  aciklama: string | null;
  tutar: number;
  bakiye: number;
  banka_adi: string | null;
  hesap_kodu: string;
}

/** Kasa hareketi - kebir API'den (100.xxx) */
export interface KasaHareketi {
  id: number;
  tarih: string;
  fis_no: string | null;
  aciklama: string | null;
  borc: number;
  alacak: number;
  bakiye: number;
}

/** Mahsup fişi - yevmiye API'den */
export interface MahsupFisi {
  id: number;
  fis_no: string;
  tarih: string;
  fis_aciklama: string | null;
  hesap_kodu: string;
  hesap_adi: string | null;
  tutar: number;
  borc_alacak: string;
}

/** Tüm kanıtlar birleşik */
export interface EvidenceData {
  defter: EvidenceBlockState<DefterKaydi[]>;
  banka: EvidenceBlockState<BankaHareketi[]>;
  kasa: EvidenceBlockState<KasaHareketi[]>;
  mahsup: EvidenceBlockState<MahsupFisi[]>;
}

// ═══════════════════════════════════════════════════════════
// ENRICHED ROW (frontend zenginleştirilmiş satır)
// ═══════════════════════════════════════════════════════════

/** Backend verisine frontend analizi eklemiş satır */
export interface EnrichedMutabakatSatir extends MutabakatSatir {
  rootCause: RootCauseResult;
  smmmKarar: SmmmKararData;
}

// ═══════════════════════════════════════════════════════════
// FİLTRE & SAYFA STATE
// ═══════════════════════════════════════════════════════════

export type MutabakatFiltre = 'tumu' | 'farkli' | 'onaylanan' | 'supheli';

/** Tolerans: 10 TL altı farklar uyumlu kabul edilir */
export const MUTABAKAT_TOLERANS_TL = 10;

/** VUK Md. 323: 365 günü aşan alacaklar için şüpheli alacak */
export const SUPHELI_ALACAK_GUN_ESIGI = 365;

/** Cut-off farkı tespiti: dönem sonu son 5 gün */
export const CUT_OFF_GUN_ESIGI = 5;

/** Yuvarlama farkı tespiti: bu değerin altındaki farklar yuvarlama kabul edilir */
export const YUVARLAMA_FARK_ESIGI = 1.0;

// ═══════════════════════════════════════════════════════════
// RAPOR TYPES
// ═══════════════════════════════════════════════════════════

export type RaporTipi = 'resmi' | 'defter_disi' | 'acik_konular';

export interface RaporMeta {
  tipi: RaporTipi;
  baslik: string;
  aciklama: string;
  satir_sayisi: number;
}
