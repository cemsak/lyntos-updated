/**
 * LYNTOS Şirketler Hukuku Tipleri
 * Faz 1 - Vergi Avantajı Odaklı Dönüşüm
 */

export interface SirketIslemi {
  id: string;
  kod: string;
  ad: string;
  aciklama: string;
  sirketTuru: ('A.Ş.' | 'Ltd.Şti.' | 'Koop.')[];
  gerekliEvraklar: string[];
  ttkMadde: string;
  damgaVergisiOrani: number;
  tahminiSure: string;
  zorlukDerecesi: 1 | 2 | 3 | 4 | 5;
  notlar: string[];
  onemliHususlar: string[];
  kategori: 'kurulus' | 'sermaye' | 'yapisal' | 'devir' | 'tasfiye';
  // Vergi avantajı alanları
  vergiAvantaji: string;
  enAzVergiYolu: string;
  kvkIstisna: string;
  kdvIstisna: string;
}

export interface TTK376Sonuc {
  durum: 'saglikli' | 'yari_kayip' | 'ucte_iki_kayip' | 'borca_batik';
  kayipOrani: number;
  yariEsik: number;
  ucteBirEsik: number;
  oneri: string;
  ttkMadde: string;
  aksiyonSuresi: string | null;
}

export interface HarcHesapSonuc {
  damgaVergisi: number;
  tesciHarci: number;
  ilanHarci: number;
  noterMasrafi: number;
  toplam: number;
}

export type CorporateTab = 'dashboard' | 'islemler' | 'ttk376' | 'hesaplayici' | 'ticaret-sicili';

export type StatCardColor = 'success' | 'warning' | 'primary' | 'info' | 'blue' | 'danger';

export interface SektorTesviki {
  id: string;
  sektor: string;
  tesvik: string;
  avantaj: string;
  kvOrani: string;
  kosullar: string[];
  yasalDayanak: string;
  /** NACE kodları (eşleştirme için). Boş ise tüm sektörlere uygulanır */
  naceKodlari?: string[];
  /** Sektör anahtar kelimeleri (eşleştirme için) */
  sektorAnahtarKelimeleri?: string[];
}

export interface TicaretSicilBilgi {
  islemTuru: string;
  tesciHarci: number;
  ilanHarci: number;
  noterMasrafi: number;
  ttsgZorunlu: boolean;
  gerekliEvraklar: string[];
}
