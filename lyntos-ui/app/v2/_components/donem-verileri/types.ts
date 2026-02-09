// ════════════════════════════════════════════════════════════════════════════
// LYNTOS V2 - DÖNEM VERİLERİ TİP SİSTEMİ
// Son Güncelleme: 2026-01-06
// ════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// BELGE TİPLERİ
// ─────────────────────────────────────────────────────────────────────────────

export type BelgeTipi =
  // ZORUNLU - Her Dönem (Q1-Q4)
  | 'e_defter_yevmiye'       // E-Defter Yevmiye
  | 'e_defter_kebir'         // E-Defter Defteri Kebir
  | 'mizan_ayrintili'        // Ayrıntılı Mizan
  | 'e_fatura_listesi'       // E-Fatura/E-Arşiv Listesi
  | 'banka_ekstresi'         // Banka Ekstreleri
  | 'vergi_tahakkuk'         // Vergi Tahakkukları

  // BEYANNAMELER
  | 'beyan_kdv'              // KDV Beyannamesi (1 No'lu)
  | 'beyan_kdv2'             // Sorumlu Sıfatıyla KDV (2 No'lu)
  | 'beyan_muhtasar'         // Muhtasar ve Prim Hizmet
  | 'beyan_damga'            // Damga Vergisi
  | 'beyan_gecici'           // Geçici Vergi
  | 'beyan_kurumlar'         // Kurumlar Vergisi
  | 'beyan_gelir'            // Gelir Vergisi
  | 'beyan_otv'              // ÖTV Beyanı

  // OPSİYONEL - Mali Tablolar
  | 'bilanco'                // Bilanço
  | 'gelir_tablosu'          // Gelir Tablosu
  | 'nakit_akim'             // Nakit Akım Tablosu
  | 'ozkaynak_degisim'       // Özkaynak Değişim Tablosu

  // LEGACY - Backward compatibility
  | 'MIZAN'
  | 'E_DEFTER'

  // CARİ HESAP
  | 'cari_hesap_ekstresi'  // Cari Hesap Ekstresi

  // DİĞER - Sınıflandırılamayan belgeler
  | 'diger';

// ─────────────────────────────────────────────────────────────────────────────
// BELGE KATEGORİLERİ
// ─────────────────────────────────────────────────────────────────────────────

export type BelgeKategorisi =
  | 'defter'      // E-Defter, Mizan
  | 'fatura'      // E-Fatura, E-Arşiv
  | 'banka'       // Banka Ekstreleri
  | 'beyanname'   // Tüm Beyannameler
  | 'tahakkuk'    // Vergi Tahakkukları
  | 'mali_tablo'; // Bilanço, Gelir Tablosu, vs.

// ─────────────────────────────────────────────────────────────────────────────
// BELGE PERİYODU
// ─────────────────────────────────────────────────────────────────────────────

export type BelgePeriyodu = 'aylik' | 'ceyreklik' | 'yillik';

// ─────────────────────────────────────────────────────────────────────────────
// BELGE DURUMU
// ─────────────────────────────────────────────────────────────────────────────

export type BelgeDurum =
  | 'yuklendi'        // Dosya yüklendi
  | 'eksik'           // Henüz yüklenmedi
  | 'suresi_yaklasti' // Son 7 gün
  | 'suresi_gecti'    // Süresi geçti
  | 'bekliyor';       // İşleniyor

// Legacy compatibility
export type BelgeDurumu = 'VAR' | 'EKSIK' | 'BEKLIYOR';

// ─────────────────────────────────────────────────────────────────────────────
// BELGE TANIMI
// ─────────────────────────────────────────────────────────────────────────────

export interface BelgeTanimi {
  tip: BelgeTipi;
  ad: string;                    // Türkçe görünen ad
  kisaAd: string;                // Kısa ad (badge için)
  aciklama: string;              // SMMM için açıklama
  zorunlu: boolean;              // Zorunlu mu?
  periyot: BelgePeriyodu;
  kategori: BelgeKategorisi;
  beyanSonGun?: number;          // Beyan son günü (ay içinde)
  kaynak: string;                // Nereden gelir (GİB, Banka, vs)
  format: string[];              // Kabul edilen formatlar
  icon?: string;                 // Lucide icon adı
  // Legacy fields
  label_tr?: string;
  gerekliMi?: boolean;
  aciklama_tr?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// BELGE DURUMU (STATE)
// ─────────────────────────────────────────────────────────────────────────────

export interface BelgeDurumState {
  tanim: BelgeTanimi;
  durum: BelgeDurum;
  dosya?: {
    id: string;
    ad: string;
    boyut: string;
    yuklemeTarihi: Date;
    format: string;
  };
  sonTarih?: Date;
  kalanGun?: number;
  notlar?: string;
}

// Legacy interface
export interface BelgeDurumData {
  tip: BelgeTipi;
  durum: BelgeDurumu;
  yuklemeTarihi?: string;
  dosyaAdi?: string;
  fileId?: string;
  hatalar?: string[];
  uyarilar?: string[];
}

export interface DonemVerileriResult {
  belgeler: BelgeDurumData[];
  tamamlanmaYuzdesi: number;
  eksikSayisi: number;
  varSayisi: number;
  bekleyenSayisi: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// BELGE TANIMLARI - TAM LİSTE
// ─────────────────────────────────────────────────────────────────────────────

export const BELGE_TANIMLARI: Record<BelgeTipi, BelgeTanimi> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // ZORUNLU - DEFTERLER
  // ═══════════════════════════════════════════════════════════════════════════
  e_defter_yevmiye: {
    tip: 'e_defter_yevmiye',
    ad: 'E-Defter Yevmiye',
    kisaAd: 'Yevmiye',
    aciklama: 'Aylık e-defter yevmiye beratı. GİB e-Defter uygulamasından indirilir.',
    zorunlu: true,
    periyot: 'aylik',
    kategori: 'defter',
    kaynak: 'GİB e-Defter',
    format: ['xml', 'zip'],
    icon: 'BookOpen',
    label_tr: 'E-Defter Yevmiye',
    gerekliMi: true,
    aciklama_tr: 'Aylık e-defter yevmiye beratı',
  },
  e_defter_kebir: {
    tip: 'e_defter_kebir',
    ad: 'E-Defter Defteri Kebir',
    kisaAd: 'Kebir',
    aciklama: 'Aylık e-defter defteri kebir beratı. GİB e-Defter uygulamasından indirilir.',
    zorunlu: true,
    periyot: 'aylik',
    kategori: 'defter',
    kaynak: 'GİB e-Defter',
    format: ['xml', 'zip'],
    icon: 'Book',
    label_tr: 'E-Defter Kebir',
    gerekliMi: true,
    aciklama_tr: 'Aylık e-defter defteri kebir beratı',
  },
  mizan_ayrintili: {
    tip: 'mizan_ayrintili',
    ad: 'Ayrıntılı Mizan',
    kisaAd: 'Mizan',
    aciklama: 'Dönem sonu ayrıntılı mizan. Muhasebe yazılımından Excel formatında alınır.',
    zorunlu: true,
    periyot: 'aylik',
    kategori: 'defter',
    kaynak: 'Muhasebe Yazılımı',
    format: ['xlsx', 'xls', 'csv'],
    icon: 'Table',
    label_tr: 'Ayrıntılı Mizan',
    gerekliMi: true,
    aciklama_tr: 'Dönem sonu ayrıntılı mizan raporu',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ÖNERİLEN - FATURALAR (Anomali analizi için)
  // ═══════════════════════════════════════════════════════════════════════════
  e_fatura_listesi: {
    tip: 'e_fatura_listesi',
    ad: 'E-Fatura Listesi',
    kisaAd: 'E-Fatura',
    aciklama: 'Dönem e-fatura ve e-arşiv listesi. Anomali tespiti için önerilir.',
    zorunlu: false,  // ÖNERİLEN - anomali analizi için kullanılır
    periyot: 'aylik',
    kategori: 'fatura',
    kaynak: 'GİB e-Fatura',
    format: ['xml', 'xlsx', 'zip'],
    icon: 'FileText',
    label_tr: 'E-Fatura Listesi',
    gerekliMi: false,  // ÖNERİLEN - detaylı cross-check için
    aciklama_tr: 'Anomali tespiti için önerilir',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ZORUNLU - BANKA
  // ═══════════════════════════════════════════════════════════════════════════
  banka_ekstresi: {
    tip: 'banka_ekstresi',
    ad: 'Banka Ekstreleri',
    kisaAd: 'Banka',
    aciklama: 'Tüm banka hesaplarının dönem ekstresi. Her banka için ayrı dosya.',
    zorunlu: true,
    periyot: 'aylik',
    kategori: 'banka',
    kaynak: 'Bankalar',
    format: ['pdf', 'xlsx', 'csv', 'mt940'],
    icon: 'Building2',
    label_tr: 'Banka Ekstresi',
    gerekliMi: true,
    aciklama_tr: 'Banka hesap ekstresi',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ZORUNLU - TAHAKKUK
  // ═══════════════════════════════════════════════════════════════════════════
  vergi_tahakkuk: {
    tip: 'vergi_tahakkuk',
    ad: 'Vergi Tahakkukları',
    kisaAd: 'Tahakkuk',
    aciklama: 'Dönem vergi tahakkuk belgeleri. GİB Dijital Vergi Dairesinden alınır.',
    zorunlu: true,
    periyot: 'aylik',
    kategori: 'tahakkuk',
    kaynak: 'GİB',
    format: ['pdf'],
    icon: 'Receipt',
    label_tr: 'Vergi Tahakkukları',
    gerekliMi: true,
    aciklama_tr: 'Dönem vergi tahakkuk belgeleri',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BEYANNAMELER
  // ═══════════════════════════════════════════════════════════════════════════
  beyan_kdv: {
    tip: 'beyan_kdv',
    ad: 'KDV Beyannamesi (1 No\'lu)',
    kisaAd: 'KDV',
    aciklama: 'Aylık KDV beyannamesi. Her ayın 28\'inde beyan, aynı ayın 28\'inde ödeme.',
    zorunlu: true,
    periyot: 'aylik',
    kategori: 'beyanname',
    beyanSonGun: 28,
    kaynak: 'GİB e-Beyanname',
    format: ['pdf', 'xml'],
    icon: 'FileSpreadsheet',
    label_tr: 'KDV Beyannamesi',
    gerekliMi: true,
    aciklama_tr: 'Aylık KDV beyannamesi (PDF)',
  },
  beyan_kdv2: {
    tip: 'beyan_kdv2',
    ad: 'Sorumlu Sıfatıyla KDV (2 No\'lu)',
    kisaAd: 'KDV-2',
    aciklama: 'Sorumlu sıfatıyla verilen KDV beyannamesi. Tevkifat yapılan firmalar için.',
    zorunlu: false,
    periyot: 'aylik',
    kategori: 'beyanname',
    beyanSonGun: 28,
    kaynak: 'GİB e-Beyanname',
    format: ['pdf', 'xml'],
    icon: 'FileSpreadsheet',
    label_tr: 'Sorumlu Sıfatıyla KDV',
    gerekliMi: false,
    aciklama_tr: 'Tevkifat yapılan firmalar için',
  },
  beyan_muhtasar: {
    tip: 'beyan_muhtasar',
    ad: 'Muhtasar ve Prim Hizmet',
    kisaAd: 'Muhtasar',
    aciklama: 'Muhtasar ve prim hizmet beyannamesi. Her ayın 26\'sında beyan ve ödeme.',
    zorunlu: true,
    periyot: 'aylik',
    kategori: 'beyanname',
    beyanSonGun: 26,
    kaynak: 'GİB e-Beyanname',
    format: ['pdf', 'xml'],
    icon: 'Users',
    label_tr: 'Muhtasar',
    gerekliMi: true,
    aciklama_tr: 'Muhtasar ve prim hizmet beyannamesi',
  },
  beyan_damga: {
    tip: 'beyan_damga',
    ad: 'Damga Vergisi',
    kisaAd: 'Damga',
    aciklama: 'Aylık damga vergisi beyannamesi. Sürekli damga vergisi mükellefleri için.',
    zorunlu: false,
    periyot: 'aylik',
    kategori: 'beyanname',
    beyanSonGun: 26,
    kaynak: 'GİB e-Beyanname',
    format: ['pdf', 'xml'],
    icon: 'Stamp',
    label_tr: 'Damga Vergisi',
    gerekliMi: false,
    aciklama_tr: 'Aylık damga vergisi beyannamesi',
  },
  beyan_gecici: {
    tip: 'beyan_gecici',
    ad: 'Geçici Vergi Beyannamesi',
    kisaAd: 'Geçici V.',
    aciklama: 'Çeyreklik geçici vergi beyannamesi. Q1: 17 Mayıs, Q2: 17 Ağustos, Q3: 17 Kasım, Q4: 17 Şubat.',
    zorunlu: true,
    periyot: 'ceyreklik',
    kategori: 'beyanname',
    kaynak: 'GİB e-Beyanname',
    format: ['pdf', 'xml'],
    icon: 'CalendarClock',
    label_tr: 'Geçici Vergi',
    gerekliMi: true,
    aciklama_tr: 'Çeyreklik geçici vergi beyannamesi',
  },
  beyan_kurumlar: {
    tip: 'beyan_kurumlar',
    ad: 'Kurumlar Vergisi Beyannamesi',
    kisaAd: 'Kurumlar',
    aciklama: 'Yıllık kurumlar vergisi beyannamesi. Her yıl 30 Nisan\'da beyan ve ödeme.',
    zorunlu: true,
    periyot: 'yillik',
    kategori: 'beyanname',
    kaynak: 'GİB e-Beyanname',
    format: ['pdf', 'xml'],
    icon: 'Building',
    label_tr: 'Kurumlar Vergisi',
    gerekliMi: false,
    aciklama_tr: 'Yıllık kurumlar vergisi beyannamesi',
  },
  beyan_gelir: {
    tip: 'beyan_gelir',
    ad: 'Gelir Vergisi Beyannamesi',
    kisaAd: 'Gelir',
    aciklama: 'Yıllık gelir vergisi beyannamesi. Gerçek kişi mükellefler için.',
    zorunlu: false,
    periyot: 'yillik',
    kategori: 'beyanname',
    kaynak: 'GİB e-Beyanname',
    format: ['pdf', 'xml'],
    icon: 'User',
    label_tr: 'Gelir Vergisi',
    gerekliMi: false,
    aciklama_tr: 'Yıllık gelir vergisi beyannamesi',
  },
  beyan_otv: {
    tip: 'beyan_otv',
    ad: 'ÖTV Beyannamesi',
    kisaAd: 'ÖTV',
    aciklama: 'Özel tüketim vergisi beyannamesi. ÖTV mükellefleri için.',
    zorunlu: false,
    periyot: 'aylik',
    kategori: 'beyanname',
    kaynak: 'GİB e-Beyanname',
    format: ['pdf', 'xml'],
    icon: 'Fuel',
    label_tr: 'ÖTV Beyannamesi',
    gerekliMi: false,
    aciklama_tr: 'Özel tüketim vergisi beyannamesi',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OPSİYONEL - MALİ TABLOLAR
  // ═══════════════════════════════════════════════════════════════════════════
  bilanco: {
    tip: 'bilanco',
    ad: 'Bilanço',
    kisaAd: 'Bilanço',
    aciklama: 'Dönem sonu bilanço. Çeyreklik veya yıllık olarak hazırlanır.',
    zorunlu: false,
    periyot: 'ceyreklik',
    kategori: 'mali_tablo',
    kaynak: 'Muhasebe Yazılımı',
    format: ['xlsx', 'pdf'],
    icon: 'Scale',
    label_tr: 'Bilanço',
    gerekliMi: false,
    aciklama_tr: 'Dönem sonu bilanço tablosu',
  },
  gelir_tablosu: {
    tip: 'gelir_tablosu',
    ad: 'Gelir Tablosu',
    kisaAd: 'Gelir Tab.',
    aciklama: 'Dönem sonu gelir tablosu. Çeyreklik veya yıllık olarak hazırlanır.',
    zorunlu: false,
    periyot: 'ceyreklik',
    kategori: 'mali_tablo',
    kaynak: 'Muhasebe Yazılımı',
    format: ['xlsx', 'pdf'],
    icon: 'TrendingUp',
    label_tr: 'Gelir Tablosu',
    gerekliMi: false,
    aciklama_tr: 'Dönem sonu gelir tablosu',
  },
  nakit_akim: {
    tip: 'nakit_akim',
    ad: 'Nakit Akım Tablosu',
    kisaAd: 'Nakit Akım',
    aciklama: 'Dönem nakit akım tablosu. Büyük işletmeler için zorunlu.',
    zorunlu: false,
    periyot: 'ceyreklik',
    kategori: 'mali_tablo',
    kaynak: 'Muhasebe Yazılımı',
    format: ['xlsx', 'pdf'],
    icon: 'Banknote',
    label_tr: 'Nakit Akım Tablosu',
    gerekliMi: false,
    aciklama_tr: 'Dönem nakit akım tablosu',
  },
  ozkaynak_degisim: {
    tip: 'ozkaynak_degisim',
    ad: 'Özkaynak Değişim Tablosu',
    kisaAd: 'Özkaynak',
    aciklama: 'Özkaynak değişim tablosu. Enflasyon muhasebesi için gerekli.',
    zorunlu: false,
    periyot: 'yillik',
    kategori: 'mali_tablo',
    kaynak: 'Muhasebe Yazılımı / LYNTOS',
    format: ['xlsx', 'pdf'],
    icon: 'PieChart',
    label_tr: 'Özkaynak Değişim Tablosu',
    gerekliMi: false,
    aciklama_tr: 'Enflasyon muhasebesi için gerekli',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LEGACY - Backward Compatibility
  // ═══════════════════════════════════════════════════════════════════════════
  MIZAN: {
    tip: 'MIZAN',
    ad: 'Mizan',
    kisaAd: 'Mizan',
    aciklama: 'Dönem sonu mizan raporu (Excel/CSV)',
    zorunlu: true,
    periyot: 'aylik',
    kategori: 'defter',
    kaynak: 'Muhasebe Yazılımı',
    format: ['xlsx', 'csv'],
    icon: 'Table',
    label_tr: 'Mizan',
    gerekliMi: true,
    aciklama_tr: 'Dönem sonu mizan raporu (Excel/CSV)',
  },
  E_DEFTER: {
    tip: 'E_DEFTER',
    ad: 'E-Defter Beratı',
    kisaAd: 'E-Defter',
    aciklama: 'Aylık e-defter berat dosyası (XML)',
    zorunlu: true,
    periyot: 'aylik',
    kategori: 'defter',
    kaynak: 'GİB e-Defter',
    format: ['xml', 'zip'],
    icon: 'BookOpen',
    label_tr: 'E-Defter Beratı',
    gerekliMi: true,
    aciklama_tr: 'Aylık e-defter berat dosyası (XML)',
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // CARİ HESAP
  // ═══════════════════════════════════════════════════════════════════════════
  cari_hesap_ekstresi: {
    tip: 'cari_hesap_ekstresi',
    ad: 'Cari Hesap Ekstresi',
    kisaAd: 'Cari',
    aciklama: 'Cari hesap mutabakat ekstreleri. 120/320 hesaplar için detaylı ekstreler.',
    zorunlu: false,
    periyot: 'ceyreklik',
    kategori: 'banka',
    kaynak: 'Muhasebe Yazılımı',
    format: ['xlsx', 'csv', 'pdf'],
    icon: 'ArrowRightLeft',
    label_tr: 'Cari Hesap Ekstresi',
    gerekliMi: false,
    aciklama_tr: 'Cari hesap mutabakat ekstreleri',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DİĞER - Sınıflandırılamayan Belgeler
  // ═══════════════════════════════════════════════════════════════════════════
  diger: {
    tip: 'diger',
    ad: 'Diğer Belgeler',
    kisaAd: 'Diğer',
    aciklama: 'Sınıflandırılamayan veya özel belgeler.',
    zorunlu: false,
    periyot: 'aylik',
    kategori: 'defter',
    kaynak: 'Çeşitli',
    format: ['pdf', 'xlsx', 'csv', 'xml', 'zip'],
    icon: 'File',
    label_tr: 'Diğer Belgeler',
    gerekliMi: false,
    aciklama_tr: 'Sınıflandırılamayan belgeler',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// YARDIMCI FONKSİYONLAR
// ─────────────────────────────────────────────────────────────────────────────

export function getZorunluBelgeler(): BelgeTanimi[] {
  return Object.values(BELGE_TANIMLARI).filter(b => b.zorunlu);
}

export function getOpsiyonelBelgeler(): BelgeTanimi[] {
  return Object.values(BELGE_TANIMLARI).filter(b => !b.zorunlu);
}

export function getBelgelerByKategori(kategori: BelgeKategorisi): BelgeTanimi[] {
  return Object.values(BELGE_TANIMLARI).filter(b => b.kategori === kategori);
}

export function getBelgelerByPeriyot(periyot: BelgePeriyodu): BelgeTanimi[] {
  return Object.values(BELGE_TANIMLARI).filter(b => b.periyot === periyot);
}

export function getDonemBelgeleri(donemTipi: 'aylik' | 'ceyreklik' | 'yillik'): BelgeTanimi[] {
  if (donemTipi === 'aylik') {
    return Object.values(BELGE_TANIMLARI).filter(b => b.periyot === 'aylik');
  }

  if (donemTipi === 'ceyreklik') {
    return Object.values(BELGE_TANIMLARI).filter(
      b => b.periyot === 'aylik' || b.periyot === 'ceyreklik'
    );
  }

  return Object.values(BELGE_TANIMLARI);
}

// ─────────────────────────────────────────────────────────────────────────────
// TARİH HESAPLAMA
// ─────────────────────────────────────────────────────────────────────────────

export function hesaplaBeyanSonGun(donem: string, gun: number): Date {
  const [yil, ay] = donem.split('-').map(Number);
  return new Date(yil, ay, gun);
}

export function hesaplaGeciciVergiSonGun(donem: string): Date {
  const match = donem.match(/(\d{4})-Q(\d)/);
  if (!match) return new Date();

  const yil = parseInt(match[1]);
  const ceyrek = match[2];

  const sonGunler: Record<string, Date> = {
    '1': new Date(yil, 4, 17),
    '2': new Date(yil, 7, 17),
    '3': new Date(yil, 10, 17),
    '4': new Date(yil + 1, 1, 17),
  };

  return sonGunler[ceyrek] || new Date();
}

export function hesaplaKurumlarVergiSonGun(yil: number): Date {
  return new Date(yil + 1, 3, 30);
}

// ═══════════════════════════════════════════════════════════════════════════
// SADELEŞTİRİLMİŞ BELGE KATEGORİLERİ (SMMM UI İÇİN)
// Son Güncelleme: 2026-01-07
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SMMM'lerin gördüğü basitleştirilmiş kategori sistemi.
 * Tüm beyannameler tek "beyannameler" altında toplanır.
 * Mizan ve Ayrıntılı Mizan tek "mizan" olarak görünür.
 */
export type BelgeKategorisiUI =
  | 'mizan'           // Mizan (ayrıntılı dahil)
  | 'e_defter'        // E-Defter Yevmiye + Kebir
  | 'beyannameler'    // TÜM beyannameler (KDV, Muhtasar, Geçici, vs.)
  | 'e_fatura'        // E-Fatura/E-Arşiv listesi
  | 'banka'           // Banka ekstreleri
  | 'tahakkuk'        // Vergi tahakkukları
  | 'mali_tablolar'   // Bilanço, Gelir Tablosu (opsiyonel)
  | 'cari_hesap';     // Cari Hesap Ekstresi (opsiyonel)

export interface BelgeKategorisiTanim {
  kategori: BelgeKategorisiUI;
  ad: string;
  kisaAd: string;
  aciklama: string;
  icon: string;
  zorunlu: boolean;
  altTipler: BelgeTipi[];
  spikyTip?: BelgeTipi; // Upload modal açılınca hangi tip seçilsin
}

export const BELGE_KATEGORILERI_UI: Record<BelgeKategorisiUI, BelgeKategorisiTanim> = {
  mizan: {
    kategori: 'mizan',
    ad: 'Mizan',
    kisaAd: 'Mizan',
    aciklama: 'Dönem sonu mizan. Sistem ayrıntılı/özet otomatik algılar.',
    icon: 'Table',
    zorunlu: true,
    altTipler: ['mizan_ayrintili', 'MIZAN'],
    spikyTip: 'mizan_ayrintili',
  },
  e_defter: {
    kategori: 'e_defter',
    ad: 'E-Defter Beratı',
    kisaAd: 'E-Defter',
    aciklama: 'E-Defter yevmiye ve kebir beratları (ZIP/XML).',
    icon: 'BookOpen',
    zorunlu: true,
    altTipler: ['e_defter_yevmiye', 'e_defter_kebir', 'E_DEFTER'],
    spikyTip: 'E_DEFTER',
  },
  beyannameler: {
    kategori: 'beyannameler',
    ad: 'Beyannameler',
    kisaAd: 'Beyanname',
    aciklama: 'Tüm beyannameler. Sistem KDV/Muhtasar/Geçici otomatik algılar.',
    icon: 'FileSpreadsheet',
    zorunlu: true,
    altTipler: [
      'beyan_kdv', 'beyan_kdv2', 'beyan_muhtasar', 'beyan_damga',
      'beyan_gecici', 'beyan_kurumlar', 'beyan_gelir', 'beyan_otv'
    ],
    spikyTip: 'beyan_kdv',
  },
  e_fatura: {
    kategori: 'e_fatura',
    ad: 'E-Fatura Listesi',
    kisaAd: 'E-Fatura',
    aciklama: 'Anomali tespiti için önerilir.',
    icon: 'FileText',
    zorunlu: false,  // ÖNERİLEN - anomali analizi için
    altTipler: ['e_fatura_listesi'],
    spikyTip: 'e_fatura_listesi',
  },
  banka: {
    kategori: 'banka',
    ad: 'Banka Ekstreleri',
    kisaAd: 'Banka',
    aciklama: 'Tüm hesapların dönem ekstresi.',
    icon: 'Building2',
    zorunlu: true,
    altTipler: ['banka_ekstresi'],
    spikyTip: 'banka_ekstresi',
  },
  tahakkuk: {
    kategori: 'tahakkuk',
    ad: 'Vergi Tahakkukları',
    kisaAd: 'Tahakkuk',
    aciklama: 'GİB vergi tahakkuk belgeleri.',
    icon: 'Receipt',
    zorunlu: true,
    altTipler: ['vergi_tahakkuk'],
    spikyTip: 'vergi_tahakkuk',
  },
  mali_tablolar: {
    kategori: 'mali_tablolar',
    ad: 'Mali Tablolar',
    kisaAd: 'Mali Tab.',
    aciklama: 'Bilanço, Gelir Tablosu ve diğer mali tablolar.',
    icon: 'PieChart',
    zorunlu: false,
    altTipler: ['bilanco', 'gelir_tablosu', 'nakit_akim', 'ozkaynak_degisim'],
    spikyTip: 'bilanco',
  },
  cari_hesap: {
    kategori: 'cari_hesap',
    ad: 'Cari Hesap Ekstresi',
    kisaAd: 'Cari',
    aciklama: 'Cari hesap mutabakat için.',
    icon: 'ArrowRightLeft',
    zorunlu: false,
    altTipler: ['cari_hesap_ekstresi'],
    spikyTip: 'cari_hesap_ekstresi',
  },
};

/**
 * BelgeTipi'nden kategori bul
 */
export function getKategoriFromBelgeTipi(tip: BelgeTipi): BelgeKategorisiUI | null {
  for (const [kategori, tanim] of Object.entries(BELGE_KATEGORILERI_UI)) {
    if (tanim.altTipler.includes(tip)) {
      return kategori as BelgeKategorisiUI;
    }
  }
  return null;
}

/**
 * Kategorideki tüm BelgeTipi'leri getir
 */
export function getBelgeTipleriByKategori(kategori: BelgeKategorisiUI): BelgeTipi[] {
  return BELGE_KATEGORILERI_UI[kategori]?.altTipler || [];
}

/**
 * Zorunlu kategorileri getir
 */
export function getZorunluKategoriler(): BelgeKategorisiUI[] {
  return (Object.keys(BELGE_KATEGORILERI_UI) as BelgeKategorisiUI[])
    .filter(k => BELGE_KATEGORILERI_UI[k].zorunlu);
}

/**
 * Opsiyonel kategorileri getir
 */
export function getOpsiyonelKategoriler(): BelgeKategorisiUI[] {
  return (Object.keys(BELGE_KATEGORILERI_UI) as BelgeKategorisiUI[])
    .filter(k => !BELGE_KATEGORILERI_UI[k].zorunlu);
}

// ─────────────────────────────────────────────────────────────────────────────
// DÖNEM TİPİ TESPİTİ
// ─────────────────────────────────────────────────────────────────────────────

export function tespitDonemTipi(donem: string): 'aylik' | 'ceyreklik' | 'yillik' {
  if (donem.includes('Q')) return 'ceyreklik';
  if (donem.length === 4) return 'yillik';
  return 'aylik';
}
