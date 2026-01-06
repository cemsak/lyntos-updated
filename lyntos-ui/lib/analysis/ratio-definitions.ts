/**
 * Finansal Oran Tanımları
 *
 * VDK'nın mükellef değerlendirmesinde kullandığı
 * standart finansal oranlar.
 *
 * Kaynak:
 * - VDK Analiz Rehberi
 * - TCMB Sektör Bilançoları
 * - Finansal Analiz Standartları
 */

import type { FinansalOran, OranKategorisi } from '../types/vdk-types';

export const FINANSAL_ORANLAR: Record<string, FinansalOran> = {
  // ═══════════════════════════════════════════════════════════════════
  // LİKİDİTE ORANLARI
  // ═══════════════════════════════════════════════════════════════════

  'LIK-01': {
    id: 'LIK-01',
    ad: 'Cari Oran',
    kategori: 'LIKIDITE',
    formul: 'Dönen Varlıklar / Kısa Vadeli Borçlar',
    formulKodu: 'donenVarliklar / kisaVadeliBorclar',
    birim: 'x',
    normalAralik: { min: 1.5, max: 3.0 },
    yorumlar: {
      dusuk: 'Kısa vadeli borç ödeme gücü zayıf. Nakit akışı sorunu olabilir.',
      normal: 'Kısa vadeli borç ödeme gücü yeterli.',
      yuksek: 'Varlıklar verimli kullanılmıyor olabilir. Atıl kaynak var.',
    },
    vdkKKodu: undefined,
  },

  'LIK-02': {
    id: 'LIK-02',
    ad: 'Likidite (Asit-Test) Oranı',
    kategori: 'LIKIDITE',
    formul: '(Dönen Varlıklar - Stoklar) / Kısa Vadeli Borçlar',
    formulKodu: '(donenVarliklar - stoklar) / kisaVadeliBorclar',
    birim: 'x',
    normalAralik: { min: 1.0, max: 2.0 },
    yorumlar: {
      dusuk: 'Stoklar dışındaki likit varlıklar yetersiz.',
      normal: 'Acil borç ödeme gücü yeterli.',
      yuksek: 'Nakit ve alacaklar fazla yüksek. Verimlilik sorunu.',
    },
    vdkKKodu: undefined,
  },

  'LIK-03': {
    id: 'LIK-03',
    ad: 'Nakit Oranı',
    kategori: 'LIKIDITE',
    formul: 'Hazır Değerler / Kısa Vadeli Borçlar',
    formulKodu: 'hazirDegerler / kisaVadeliBorclar',
    birim: 'x',
    normalAralik: { min: 0.2, max: 0.5 },
    yorumlar: {
      dusuk: 'Anında borç ödeme kapasitesi düşük.',
      normal: 'Nakit yeterliliği uygun.',
      yuksek: 'Aşırı nakit tutumu. Fırsat maliyeti var.',
    },
    vdkKKodu: undefined,
  },

  'LIK-04': {
    id: 'LIK-04',
    ad: 'Kasa/Aktif Oranı',
    kategori: 'LIKIDITE',
    formul: 'Kasa / Toplam Aktif',
    formulKodu: 'kasa / toplamAktif',
    birim: '%',
    normalAralik: { min: 0.0, max: 0.05 },
    yorumlar: {
      dusuk: 'Kasa oranı normal.',
      normal: 'Kasa oranı kabul edilebilir.',
      yuksek: 'YÜKSEK KASA! VDK K-01 riski. Kayıt dışı hasılat şüphesi.',
    },
    vdkKKodu: 'K-01',
  },

  // ═══════════════════════════════════════════════════════════════════
  // FAALİYET ORANLARI
  // ═══════════════════════════════════════════════════════════════════

  'FAA-01': {
    id: 'FAA-01',
    ad: 'Stok Devir Hızı',
    kategori: 'FAALIYET',
    formul: 'Satılan Malın Maliyeti / Ortalama Stok',
    formulKodu: 'smm / ortalamaStok',
    birim: 'x',
    normalAralik: { min: 4, max: 12 },
    yorumlar: {
      dusuk: 'Stoklar yavaş hareket ediyor. Atıl stok veya değer düşüklüğü riski.',
      normal: 'Stok yönetimi etkin.',
      yuksek:
        'Çok hızlı stok devri. Stok yetersizliği veya kayıt sorunu olabilir.',
    },
    vdkKKodu: 'K-11',
  },

  'FAA-02': {
    id: 'FAA-02',
    ad: 'Ortalama Stok Süresi',
    kategori: 'FAALIYET',
    formul: '365 / Stok Devir Hızı',
    formulKodu: '365 / stokDevirHizi',
    birim: 'gun',
    normalAralik: { min: 30, max: 90 },
    yorumlar: {
      dusuk: 'Stoklar çok hızlı tükeniyor.',
      normal: 'Stok tutma süresi normal.',
      yuksek: 'Stoklar çok uzun tutuluyor. Değer düşüklüğü riski.',
    },
    vdkKKodu: undefined,
  },

  'FAA-03': {
    id: 'FAA-03',
    ad: 'Alacak Devir Hızı',
    kategori: 'FAALIYET',
    formul: 'Net Satışlar / Ortalama Ticari Alacaklar',
    formulKodu: 'netSatislar / ortalamaAlacaklar',
    birim: 'x',
    normalAralik: { min: 4, max: 12 },
    yorumlar: {
      dusuk: 'Alacak tahsilatı yavaş. Şüpheli alacak riski.',
      normal: 'Alacak tahsilatı etkin.',
      yuksek: 'Çok hızlı tahsilat veya düşük vadeli satış.',
    },
    vdkKKodu: undefined,
  },

  'FAA-04': {
    id: 'FAA-04',
    ad: 'Ortalama Tahsilat Süresi',
    kategori: 'FAALIYET',
    formul: '365 / Alacak Devir Hızı',
    formulKodu: '365 / alacakDevirHizi',
    birim: 'gun',
    normalAralik: { min: 30, max: 90 },
    yorumlar: {
      dusuk: 'Çok kısa tahsilat süresi.',
      normal: 'Tahsilat süresi normal.',
      yuksek:
        'Tahsilat süresi uzun! VDK K-13 riski. Şüpheli alacak kontrolü yapın.',
    },
    vdkKKodu: 'K-13',
  },

  'FAA-05': {
    id: 'FAA-05',
    ad: 'Borç Devir Hızı',
    kategori: 'FAALIYET',
    formul: 'SMM / Ortalama Ticari Borçlar',
    formulKodu: 'smm / ortalamaBorclar',
    birim: 'x',
    normalAralik: { min: 4, max: 12 },
    yorumlar: {
      dusuk: 'Tedarikçi ödemeleri yavaş. Nakit akışı sorunu olabilir.',
      normal: 'Tedarikçi ödemeleri normal.',
      yuksek: 'Çok hızlı ödeme. Nakit yönetimi gözden geçirilmeli.',
    },
    vdkKKodu: undefined,
  },

  'FAA-06': {
    id: 'FAA-06',
    ad: 'Ortalama Ödeme Süresi',
    kategori: 'FAALIYET',
    formul: '365 / Borç Devir Hızı',
    formulKodu: '365 / borcDevirHizi',
    birim: 'gun',
    normalAralik: { min: 30, max: 90 },
    yorumlar: {
      dusuk: 'Tedarikçilere çok hızlı ödeme.',
      normal: 'Ödeme süresi normal.',
      yuksek: 'Ödeme süresi uzun. Tedarikçi ilişkileri risk altında.',
    },
    vdkKKodu: undefined,
  },

  'FAA-07': {
    id: 'FAA-07',
    ad: 'Net Çalışma Sermayesi Devir Hızı',
    kategori: 'FAALIYET',
    formul: 'Net Satışlar / Net Çalışma Sermayesi',
    formulKodu: 'netSatislar / netCalismaSermayesi',
    birim: 'x',
    normalAralik: { min: 2, max: 8 },
    yorumlar: {
      dusuk: 'Çalışma sermayesi verimli kullanılmıyor.',
      normal: 'Çalışma sermayesi verimliliği normal.',
      yuksek: 'Çalışma sermayesi yetersiz olabilir.',
    },
    vdkKKodu: undefined,
  },

  'FAA-08': {
    id: 'FAA-08',
    ad: 'Aktif Devir Hızı',
    kategori: 'FAALIYET',
    formul: 'Net Satışlar / Toplam Aktif',
    formulKodu: 'netSatislar / toplamAktif',
    birim: 'x',
    normalAralik: { min: 0.5, max: 2.0 },
    yorumlar: {
      dusuk: 'Varlıklar verimli kullanılmıyor.',
      normal: 'Varlık verimliliği normal.',
      yuksek: 'Çok yoğun varlık kullanımı.',
    },
    vdkKKodu: undefined,
  },

  // ═══════════════════════════════════════════════════════════════════
  // MALİ YAPI ORANLARI
  // ═══════════════════════════════════════════════════════════════════

  'MAL-01': {
    id: 'MAL-01',
    ad: 'Borç/Özkaynak Oranı',
    kategori: 'MALI_YAPI',
    formul: 'Toplam Borçlar / Özkaynaklar',
    formulKodu: 'toplamBorclar / ozkaynaklar',
    birim: 'x',
    normalAralik: { min: 0.0, max: 2.0 },
    yorumlar: {
      dusuk: 'Düşük borçluluk. Finansal risk düşük.',
      normal: 'Borçluluk oranı kabul edilebilir.',
      yuksek: 'Yüksek borçluluk! Finansal risk yüksek.',
    },
    vdkKKodu: undefined,
  },

  'MAL-02': {
    id: 'MAL-02',
    ad: 'Kaldıraç Oranı',
    kategori: 'MALI_YAPI',
    formul: 'Toplam Borçlar / Toplam Aktif',
    formulKodu: 'toplamBorclar / toplamAktif',
    birim: '%',
    normalAralik: { min: 0.3, max: 0.6 },
    yorumlar: {
      dusuk: 'Düşük borç kullanımı.',
      normal: 'Borç/varlık oranı normal.',
      yuksek: 'Yüksek borç! Ödeme güçlüğü riski.',
    },
    vdkKKodu: undefined,
  },

  'MAL-03': {
    id: 'MAL-03',
    ad: 'Özkaynak Oranı',
    kategori: 'MALI_YAPI',
    formul: 'Özkaynaklar / Toplam Aktif',
    formulKodu: 'ozkaynaklar / toplamAktif',
    birim: '%',
    normalAralik: { min: 0.4, max: 0.7 },
    yorumlar: {
      dusuk: 'Özkaynak yetersiz. Sermaye artışı gerekebilir.',
      normal: 'Özkaynak oranı yeterli.',
      yuksek: 'Güçlü özkaynak yapısı.',
    },
    vdkKKodu: undefined,
  },

  'MAL-04': {
    id: 'MAL-04',
    ad: 'Ortaklardan Alacaklar/Sermaye',
    kategori: 'MALI_YAPI',
    formul: 'Ortaklardan Alacaklar / Sermaye',
    formulKodu: 'ortakAlacak / sermaye',
    birim: '%',
    normalAralik: { min: 0.0, max: 0.1 },
    yorumlar: {
      dusuk: 'Ortaklardan alacak düşük.',
      normal: 'Ortaklardan alacak kabul edilebilir.',
      yuksek:
        'YÜKSEK ORTAK ALACAĞI! VDK K-04 riski. Örtülü sermaye şüphesi.',
    },
    vdkKKodu: 'K-04',
  },

  'MAL-05': {
    id: 'MAL-05',
    ad: 'Ortaklara Borçlar/Özkaynak',
    kategori: 'MALI_YAPI',
    formul: 'Ortaklara Borçlar / Özkaynaklar',
    formulKodu: 'ortakBorc / ozkaynaklar',
    birim: 'x',
    normalAralik: { min: 0.0, max: 2.0 },
    yorumlar: {
      dusuk: 'Ortaklara borç düşük.',
      normal: 'Ortaklara borç kabul edilebilir.',
      yuksek: 'YÜKSEK ORTAK BORCU! VDK K-05 riski. 3:1 aşımı örtülü sermaye!',
    },
    vdkKKodu: 'K-05',
  },

  'MAL-06': {
    id: 'MAL-06',
    ad: 'Kısa Vadeli Borç/Toplam Borç',
    kategori: 'MALI_YAPI',
    formul: 'Kısa Vadeli Borçlar / Toplam Borçlar',
    formulKodu: 'kisaVadeliBorclar / toplamBorclar',
    birim: '%',
    normalAralik: { min: 0.4, max: 0.7 },
    yorumlar: {
      dusuk: 'Borçlar uzun vadeli ağırlıklı.',
      normal: 'Borç vade yapısı dengeli.',
      yuksek: 'Kısa vadeli borç yüksek! Likidite baskısı.',
    },
    vdkKKodu: undefined,
  },

  'MAL-07': {
    id: 'MAL-07',
    ad: 'Finansman Gideri/Satış',
    kategori: 'MALI_YAPI',
    formul: 'Finansman Giderleri / Net Satışlar',
    formulKodu: 'finansmanGideri / netSatislar',
    birim: '%',
    normalAralik: { min: 0.0, max: 0.05 },
    yorumlar: {
      dusuk: 'Finansman maliyeti düşük.',
      normal: 'Finansman giderleri normal.',
      yuksek: 'Yüksek finansman gideri! Karlılığı etkiliyor.',
    },
    vdkKKodu: undefined,
  },

  // ═══════════════════════════════════════════════════════════════════
  // KARLILIK ORANLARI
  // ═══════════════════════════════════════════════════════════════════

  'KAR-01': {
    id: 'KAR-01',
    ad: 'Brüt Kar Marjı',
    kategori: 'KARLILIK',
    formul: 'Brüt Kar / Net Satışlar',
    formulKodu: 'brutKar / netSatislar',
    birim: '%',
    normalAralik: { min: 0.15, max: 0.4 },
    yorumlar: {
      dusuk: 'DÜŞÜK BRÜT KAR! VDK K-07 riski. Maliyet şişirmesi şüphesi.',
      normal: 'Brüt kar marjı normal.',
      yuksek: 'Yüksek brüt kar marjı.',
    },
    vdkKKodu: 'K-07',
  },

  'KAR-02': {
    id: 'KAR-02',
    ad: 'Faaliyet Kar Marjı',
    kategori: 'KARLILIK',
    formul: 'Faaliyet Karı / Net Satışlar',
    formulKodu: 'faaliyetKari / netSatislar',
    birim: '%',
    normalAralik: { min: 0.05, max: 0.2 },
    yorumlar: {
      dusuk: 'Faaliyet karlılığı düşük.',
      normal: 'Faaliyet karlılığı normal.',
      yuksek: 'Yüksek faaliyet karlılığı.',
    },
    vdkKKodu: undefined,
  },

  'KAR-03': {
    id: 'KAR-03',
    ad: 'Net Kar Marjı',
    kategori: 'KARLILIK',
    formul: 'Net Kar / Net Satışlar',
    formulKodu: 'netKar / netSatislar',
    birim: '%',
    normalAralik: { min: 0.03, max: 0.15 },
    yorumlar: {
      dusuk: 'Düşük net kar! Enflasyon döneminde şüpheli.',
      normal: 'Net kar marjı normal.',
      yuksek: 'Yüksek net kar marjı.',
    },
    vdkKKodu: undefined,
  },

  'KAR-04': {
    id: 'KAR-04',
    ad: 'Aktif Karlılığı (ROA)',
    kategori: 'KARLILIK',
    formul: 'Net Kar / Toplam Aktif',
    formulKodu: 'netKar / toplamAktif',
    birim: '%',
    normalAralik: { min: 0.03, max: 0.15 },
    yorumlar: {
      dusuk: 'Varlıklar karlı kullanılmıyor.',
      normal: 'Aktif karlılığı normal.',
      yuksek: 'Varlıklar verimli kullanılıyor.',
    },
    vdkKKodu: undefined,
  },

  'KAR-05': {
    id: 'KAR-05',
    ad: 'Özkaynak Karlılığı (ROE)',
    kategori: 'KARLILIK',
    formul: 'Net Kar / Özkaynaklar',
    formulKodu: 'netKar / ozkaynaklar',
    birim: '%',
    normalAralik: { min: 0.05, max: 0.25 },
    yorumlar: {
      dusuk: 'Özkaynak karlılığı düşük.',
      normal: 'Özkaynak karlılığı normal.',
      yuksek: 'Yüksek özkaynak karlılığı.',
    },
    vdkKKodu: undefined,
  },

  'KAR-06': {
    id: 'KAR-06',
    ad: 'FAVÖK Marjı',
    kategori: 'KARLILIK',
    formul: 'FAVÖK / Net Satışlar',
    formulKodu: 'favok / netSatislar',
    birim: '%',
    normalAralik: { min: 0.08, max: 0.25 },
    yorumlar: {
      dusuk: 'Operasyonel karlılık düşük.',
      normal: 'FAVÖK marjı normal.',
      yuksek: 'Güçlü operasyonel karlılık.',
    },
    vdkKKodu: undefined,
  },
};

// Oran kategorileri
export const ORAN_KATEGORILERI: {
  kategori: OranKategorisi;
  ad: string;
  aciklama: string;
  ikon: string;
}[] = [
  {
    kategori: 'LIKIDITE',
    ad: 'Likidite Oranları',
    aciklama: 'Kısa vadeli borç ödeme gücü',
    ikon: '💧',
  },
  {
    kategori: 'FAALIYET',
    ad: 'Faaliyet Oranları',
    aciklama: 'Varlık yönetimi etkinliği',
    ikon: '⚙️',
  },
  {
    kategori: 'MALI_YAPI',
    ad: 'Mali Yapı Oranları',
    aciklama: 'Finansal yapı ve borçluluk',
    ikon: '🏛️',
  },
  {
    kategori: 'KARLILIK',
    ad: 'Karlılık Oranları',
    aciklama: 'Kar elde etme gücü',
    ikon: '📈',
  },
];

// Kategoriye göre oranları getir
export const getOranlarByKategori = (
  kategori: OranKategorisi
): FinansalOran[] => {
  return Object.values(FINANSAL_ORANLAR).filter((o) => o.kategori === kategori);
};

// VDK K-Kodu ilişkili oranları getir
export const getVdkIliskiliOranlar = (): FinansalOran[] => {
  return Object.values(FINANSAL_ORANLAR).filter(
    (o) => o.vdkKKodu !== undefined
  );
};

// Oran istatistikleri
export const ORAN_ISTATISTIK = {
  toplamOran: Object.keys(FINANSAL_ORANLAR).length,
  kategoriler: {
    likidite: Object.values(FINANSAL_ORANLAR).filter(
      (o) => o.kategori === 'LIKIDITE'
    ).length,
    faaliyet: Object.values(FINANSAL_ORANLAR).filter(
      (o) => o.kategori === 'FAALIYET'
    ).length,
    maliYapi: Object.values(FINANSAL_ORANLAR).filter(
      (o) => o.kategori === 'MALI_YAPI'
    ).length,
    karlilik: Object.values(FINANSAL_ORANLAR).filter(
      (o) => o.kategori === 'KARLILIK'
    ).length,
  },
  vdkIliskili: Object.values(FINANSAL_ORANLAR).filter(
    (o) => o.vdkKKodu !== undefined
  ).length,
};
