// LYNTOS Operations Types - Kaizen Approach
// Sprint 5.6: Operations Modernization

// Aksiyon oncelik seviyeleri
export type AksiyonOncelik = 'acil' | 'normal' | 'bilgi';

// Aksiyon kaynaklari
export type AksiyonKaynak =
  | 'vergi_takvimi'    // Beyan/odeme deadline
  | 'eksik_belge'      // Donem belgesi eksik
  | 'vdk_risk'         // VDK kriteri FAIL/WARNING
  | 'regwatch'         // Mevzuat degisikligi
  | 'mutabakat'        // Cross-check uyumsuzlugu
  | 'hatirlatma';      // Manuel hatirlatma

// Aksiyon tipleri (ne yapilacak)
export type AksiyonTipi =
  | 'yukle'            // Belge yukle
  | 'hazirla'          // Beyan hazirla
  | 'incele'           // Analiz/detay incele
  | 'oku'              // Mevzuat oku
  | 'onayla'           // Onay ver
  | 'duzelt';          // Duzeltme yap

// 8D Problem durumu
export type ProblemDurumu =
  | 'd0_farkedildi'    // Problem fark edildi
  | 'd1_ekip'          // Ekip/sorumlu atandi
  | 'd2_tanimlandi'    // Problem tanimlandi
  | 'd3_gecici'        // Gecici onlem alindi
  | 'd4_kok_neden'     // Kok neden bulundu
  | 'd5_cozum_secildi' // Kalici cozum secildi
  | 'd6_uygulandi'     // Cozum uygulandi
  | 'd7_onleme'        // Tekrar onleme yapildi
  | 'd8_kapandi';      // Problem kapandi

// Ana aksiyon interface
export interface AksiyonItem {
  id: string;

  // Temel bilgiler
  baslik: string;
  aciklama: string;
  detay?: string;

  // Mukellef (varsa)
  mukellef?: {
    id: string;
    ad: string;
  };

  // Oncelik ve kaynak
  oncelik: AksiyonOncelik;
  kaynak: AksiyonKaynak;

  // Zaman bilgisi
  sonTarih?: Date;
  kalanGun?: number;
  tahminiDakika: number;

  // Aksiyon
  aksiyonTipi: AksiyonTipi;
  aksiyonUrl: string;
  aksiyonLabel: string;

  // 8D Problem takibi (opsiyonel)
  problemDurumu?: ProblemDurumu;

  // Iliskili veri
  iliskiliVeri?: {
    tip: 'belge' | 'vdk_kriter' | 'mevzuat' | 'mutabakat';
    id: string;
    ekBilgi?: Record<string, unknown>;
  };

  // Kaizen metrikleri
  olusturmaTarihi: Date;
  tekrarSayisi?: number; // Bu problem daha once kac kez olustu?
}

// Aksiyon ozet istatistikleri
export interface AksiyonStats {
  toplam: number;
  acil: number;
  normal: number;
  bilgi: number;
  tahminiToplamDakika: number;
  bugunTamamlanan: number;
  buHaftaTamamlanan: number;
  buHaftaHedef: number;
}

// 8D Badge renkleri - LIGHT MODE ONLY
export const PROBLEM_DURUMU_CONFIG: Record<ProblemDurumu, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  d0_farkedildi: { label: 'D0', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  d1_ekip: { label: 'D1', color: 'text-red-700', bgColor: 'bg-red-50' },
  d2_tanimlandi: { label: 'D2', color: 'text-orange-700', bgColor: 'bg-orange-50' },
  d3_gecici: { label: 'D3', color: 'text-amber-700', bgColor: 'bg-amber-50' },
  d4_kok_neden: { label: 'D4', color: 'text-yellow-700', bgColor: 'bg-yellow-50' },
  d5_cozum_secildi: { label: 'D5', color: 'text-lime-700', bgColor: 'bg-lime-50' },
  d6_uygulandi: { label: 'D6', color: 'text-green-700', bgColor: 'bg-green-50' },
  d7_onleme: { label: 'D7', color: 'text-teal-700', bgColor: 'bg-teal-50' },
  d8_kapandi: { label: 'D8', color: 'text-emerald-700', bgColor: 'bg-emerald-50' },
};

// Oncelik config - LIGHT MODE ONLY - BEYAZ TEMALI
export const ONCELIK_CONFIG: Record<AksiyonOncelik, {
  label: string;
  labelTr: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  acil: {
    label: 'ACIL',
    labelTr: 'Hemen yapılmalı',
    icon: '🔴',
    color: 'text-red-700',
    bgColor: 'bg-white',
    borderColor: 'border-red-300',
  },
  normal: {
    label: 'NORMAL',
    labelTr: 'Bu hafta',
    icon: '🟡',
    color: 'text-slate-700',
    bgColor: 'bg-white',
    borderColor: 'border-slate-200',
  },
  bilgi: {
    label: 'BILGI',
    labelTr: 'Bilginize',
    icon: '🔵',
    color: 'text-blue-700',
    bgColor: 'bg-white',
    borderColor: 'border-blue-200',
  },
};

// Kaynak ikonlari
export const KAYNAK_ICONS: Record<AksiyonKaynak, string> = {
  vergi_takvimi: '📅',
  eksik_belge: '📄',
  vdk_risk: '⚠️',
  regwatch: '📡',
  mutabakat: '🔄',
  hatirlatma: '🔔',
};
