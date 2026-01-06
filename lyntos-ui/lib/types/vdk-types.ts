/**
 * VDK (Vergi Denetim Kurulu) Risk Analiz Sistemi Tip Tanımlari
 *
 * Bu dosya VDK-RAS, KURGAN ve RAM sistemlerinde kullanilan
 * tum tip tanimlarini icerir.
 *
 * Kaynak: VDK 2024 Faaliyet Raporu
 */

// Risk seviyeleri
export type RiskSeviyesi = 'DUSUK' | 'ORTA' | 'YUKSEK' | 'KRITIK';

// VDK oncelik seviyeleri
export type VdkOncelik = 'DUSUK' | 'ORTA' | 'YUKSEK' | 'KRITIK';

// KURGAN aksiyon tipleri
export type KurganAksiyon = 'TAKIP' | 'BILGI_ISTEME' | 'IZAHA_DAVET' | 'INCELEME';

// RAM pattern kategorileri
export type RamKategori = 'BEYANNAME' | 'MUHASEBE' | 'VERGI' | 'SINIF' | 'BELGE';

// Esik deger yapisi
export interface EsikDeger {
  uyari?: number;
  kritik: number;
}

// K-Kodu tanimi
export interface KKodu {
  kod: string; // "K-01", "K-02", etc.
  ad: string; // Kisa ad
  aciklama: string; // Detayli aciklama
  kategori: KKoduKategori; // Hangi kategoriye ait
  esik: EsikDeger; // Esik degerleri
  formul: string; // Hesaplama formulu (human readable)
  formulKodu?: string; // Hesaplama formulu (kod)
  vdkOncelik: VdkOncelik; // VDK icin oncelik
  kurganIliskili: boolean; // KURGAN sisteminde kullaniliyor mu?
  yaptirimRiski: string; // Olasi yaptirim
  oneri: string; // SMMM icin oneri
  mevzuat: string[]; // Ilgili mevzuat maddeleri
  pistatik?: boolean; // Parametrik istatistik gerekiyor mu?
  sektorelKarsilastirma?: boolean; // Sektorel karsilastirma gerekiyor mu?
}

// K-Kodu kategorileri
export type KKoduKategori =
  | 'LIKIDITE' // Kasa, banka, nakit
  | 'ORTAKLAR' // Ortaklardan alacak/borc
  | 'SATISLAR' // Satislar ve gelirler
  | 'STOK' // Stok ve maliyet
  | 'ALACAK_BORC' // Alacak ve borc yonetimi
  | 'DURAN_VARLIK' // Duran varliklar ve amortisman
  | 'GIDERLER' // Giderler ve KKEG
  | 'BEYANNAME' // Beyanname uyumu
  | 'SAHTE_BELGE'; // Sahte belge riskleri

// KURGAN senaryosu
export interface KurganSenaryo {
  id: string; // "KRG-01", "KRG-02", etc.
  ad: string;
  aciklama: string;
  tetikleyiciler: string[]; // Hangi durumlar tetikler
  riskPuani: number; // 0-100 arasi
  aksiyon: KurganAksiyon;
  suresi: string | null; // "30 gun", "15 gun", null
  mevzuat: string[];
  ornekler?: string[];
}

// RAM pattern
export interface RamPattern {
  id: string; // "RAM-B01", "RAM-M01", etc.
  kategori: RamKategori;
  ad: string;
  aciklama: string;
  tespit: string; // Tespit formulu (human readable)
  tespitKodu?: string; // Tespit formulu (kod)
  dogru: string; // Dogru uygulama
  otomatikDuzeltme: boolean;
  duzeltmeAksiyonu?: string; // Otomatik duzeltme aksiyonu
  oncelik: VdkOncelik;
  mevzuat: string[];
}

// Sektorel benchmark
export interface SektorBenchmark {
  naceKodu: string; // "G-47", "C-10", etc.
  ad: string;
  brutKarMarji: OranAralik | null;
  netKarMarji: OranAralik | null;
  cariOran: OranAralik | null;
  stokDevirHizi: OranAralik | null;
  kasaAktifOrani: { max: number } | null;
  alacakDevirHizi: OranAralik | null;
  borcOzkaynakOrani: OranAralik | null;
}

// Oran araligi
export interface OranAralik {
  min: number;
  ortalama: number;
  max: number;
}

// Finansal oran tanimi
export interface FinansalOran {
  id: string;
  ad: string;
  kategori: OranKategorisi;
  formul: string; // Human readable
  formulKodu: string; // Hesaplama kodu
  birim: '%' | 'x' | 'gun' | 'TL';
  normalAralik: { min: number; max: number };
  yorumlar: {
    dusuk: string;
    normal: string;
    yuksek: string;
  };
  vdkKKodu?: string; // Iliskili K-kodu
}

// Oran kategorileri
export type OranKategorisi = 'LIKIDITE' | 'FAALIYET' | 'MALI_YAPI' | 'KARLILIK';

// Kural degerlendirme sonucu
export interface KuralDegerlendirmeSonucu {
  kuralId: string;
  kuralAd: string;
  deger: number | null;
  esikDeger: number;
  seviye: RiskSeviyesi;
  mesaj: string;
  oneri: string;
  mevzuat: string[];
  vdkRiski: boolean;
  kurganRiski: boolean;
  kanitlar: Kanit[];
}

// Kanit (evidence)
export interface Kanit {
  tip: 'HESAP' | 'FORMUL' | 'ESIK' | 'MEVZUAT' | 'SEKTOR';
  aciklama: string;
  deger?: string | number;
  kaynak?: string;
}

// Mizan hesap yapisi (rule engine icin)
export interface MizanHesapInput {
  kod: string;
  ad: string;
  borc: number;
  alacak: number;
  bakiye: number;
}

// Rule engine input
export interface RuleEngineInput {
  mizanHesaplari: MizanHesapInput[];
  sektorKodu?: string;
  donemBasi?: Date;
  donemSonu?: Date;
  oncekiDonemMizan?: MizanHesapInput[];
}

// Rule engine output
export interface RuleEngineOutput {
  toplamRiskPuani: number;
  riskSeviyesi: RiskSeviyesi;
  sonuclar: KuralDegerlendirmeSonucu[];
  kritikSonuclar: KuralDegerlendirmeSonucu[];
  uyariSonuclar: KuralDegerlendirmeSonucu[];
  normalSonuclar: KuralDegerlendirmeSonucu[];
  ozet: {
    toplamKontrol: number;
    kritikSayisi: number;
    uyariSayisi: number;
    normalSayisi: number;
  };
}
