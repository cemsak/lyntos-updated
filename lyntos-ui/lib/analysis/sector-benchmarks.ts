/**
 * Sektörel Benchmark Veritabani
 *
 * VDK analiz motorunda kullanilan sektor bazli finansal oran karsilastirmalari.
 * NACE Rev.2 kodlarina gore 17 sektor tanimlanmistir.
 * Veriler: VDK istatistikleri, TUIK sektor ortalamasi, SMMM deneyimleri.
 */

import type { RiskSeviyesi } from '../types/vdk-types';

// Oran araligi
export interface OranAralik {
  min: number;
  max: number;
  ortalama: number;
}

// Sektor benchmark
export interface SektorBenchmark {
  naceKodu: string;
  sektorAdi: string;
  kategori: 'TICARET' | 'URETIM' | 'INSAAT' | 'HIZMET' | 'SAGLIK' | 'EMLAK' | 'MESLEKI';
  brutKarMarji: OranAralik;
  netKarMarji: OranAralik;
  cariOran: OranAralik;
  asitTestOrani: OranAralik;
  stokDevirHizi: OranAralik;
  alacakDevirHizi: OranAralik;
  borcDevirHizi: OranAralik;
  kasaAktifOrani: OranAralik;
  ortakCariFaizOrani: OranAralik;
  kdvYukuOrani: OranAralik;
  giderHasilatOrani: OranAralik;
  finansmanGiderOrani: OranAralik;
  aciklama: string;
  ozelRiskler: string[];
}

// Sapma sonucu
export interface SapmaSonucu {
  oranAdi: string;
  mukellefDegeri: number;
  sektorMin: number;
  sektorMax: number;
  sektorOrtalama: number;
  sapmaYuzdesi: number;
  sapmaTuru: 'ALTINDA' | 'NORMAL' | 'USTUNDE';
  riskSeviyesi: RiskSeviyesi;
  aciklama: string;
}

/**
 * 17 Sektor Benchmark Verileri
 * NACE Rev.2 kodlarina gore
 */
export const SEKTOR_BENCHMARKS: Record<string, SektorBenchmark> = {
  // ============ TICARET SEKTORU ============
  'G-47': {
    naceKodu: 'G-47',
    sektorAdi: 'Perakende Ticaret',
    kategori: 'TICARET',
    brutKarMarji: { min: 8, max: 25, ortalama: 15 },
    netKarMarji: { min: 1, max: 8, ortalama: 3 },
    cariOran: { min: 0.8, max: 2.0, ortalama: 1.2 },
    asitTestOrani: { min: 0.3, max: 1.0, ortalama: 0.5 },
    stokDevirHizi: { min: 4, max: 12, ortalama: 8 },
    alacakDevirHizi: { min: 8, max: 24, ortalama: 12 },
    borcDevirHizi: { min: 4, max: 10, ortalama: 6 },
    kasaAktifOrani: { min: 0.5, max: 5, ortalama: 2 },
    ortakCariFaizOrani: { min: 0, max: 15, ortalama: 5 },
    kdvYukuOrani: { min: 0.5, max: 3, ortalama: 1.5 },
    giderHasilatOrani: { min: 75, max: 95, ortalama: 85 },
    finansmanGiderOrani: { min: 0.5, max: 4, ortalama: 2 },
    aciklama: 'Market, magazacilik, e-ticaret dahil',
    ozelRiskler: ['Nakit islem yogunlugu', 'Stok sayim farki', 'Fire oranlari'],
  },

  'G-46': {
    naceKodu: 'G-46',
    sektorAdi: 'Toptan Ticaret',
    kategori: 'TICARET',
    brutKarMarji: { min: 5, max: 18, ortalama: 10 },
    netKarMarji: { min: 0.5, max: 5, ortalama: 2 },
    cariOran: { min: 1.0, max: 2.5, ortalama: 1.4 },
    asitTestOrani: { min: 0.5, max: 1.5, ortalama: 0.8 },
    stokDevirHizi: { min: 6, max: 18, ortalama: 10 },
    alacakDevirHizi: { min: 4, max: 12, ortalama: 6 },
    borcDevirHizi: { min: 4, max: 10, ortalama: 6 },
    kasaAktifOrani: { min: 0.3, max: 3, ortalama: 1 },
    ortakCariFaizOrani: { min: 0, max: 20, ortalama: 8 },
    kdvYukuOrani: { min: 0.3, max: 2, ortalama: 1 },
    giderHasilatOrani: { min: 82, max: 97, ortalama: 90 },
    finansmanGiderOrani: { min: 1, max: 5, ortalama: 2.5 },
    aciklama: 'Distributorluk, acentelik, toptancilik',
    ozelRiskler: ['Riskli tedarikci zincirleri', 'Yuksek vadeli alislar', 'Transfer fiyatlandirmasi'],
  },

  'G-45': {
    naceKodu: 'G-45',
    sektorAdi: 'Motorlu Tasit Ticareti',
    kategori: 'TICARET',
    brutKarMarji: { min: 4, max: 12, ortalama: 7 },
    netKarMarji: { min: 0.5, max: 3, ortalama: 1.5 },
    cariOran: { min: 0.9, max: 1.8, ortalama: 1.2 },
    asitTestOrani: { min: 0.2, max: 0.8, ortalama: 0.4 },
    stokDevirHizi: { min: 2, max: 8, ortalama: 4 },
    alacakDevirHizi: { min: 6, max: 18, ortalama: 10 },
    borcDevirHizi: { min: 3, max: 8, ortalama: 5 },
    kasaAktifOrani: { min: 0.2, max: 2, ortalama: 0.8 },
    ortakCariFaizOrani: { min: 0, max: 25, ortalama: 10 },
    kdvYukuOrani: { min: 0.5, max: 2.5, ortalama: 1.2 },
    giderHasilatOrani: { min: 88, max: 98, ortalama: 93 },
    finansmanGiderOrani: { min: 1.5, max: 6, ortalama: 3 },
    aciklama: 'Otomobil, motorsiklet, yedek parca',
    ozelRiskler: ['Yuksek stok maliyeti', 'Vade farki geliri', 'Bayi performansi'],
  },

  // ============ URETIM SEKTORU ============
  'C-10': {
    naceKodu: 'C-10',
    sektorAdi: 'Gida Urunleri Imalati',
    kategori: 'URETIM',
    brutKarMarji: { min: 10, max: 30, ortalama: 18 },
    netKarMarji: { min: 2, max: 10, ortalama: 5 },
    cariOran: { min: 1.0, max: 2.2, ortalama: 1.4 },
    asitTestOrani: { min: 0.4, max: 1.2, ortalama: 0.7 },
    stokDevirHizi: { min: 8, max: 24, ortalama: 12 },
    alacakDevirHizi: { min: 6, max: 15, ortalama: 9 },
    borcDevirHizi: { min: 4, max: 10, ortalama: 6 },
    kasaAktifOrani: { min: 0.3, max: 3, ortalama: 1.2 },
    ortakCariFaizOrani: { min: 0, max: 12, ortalama: 4 },
    kdvYukuOrani: { min: 0.2, max: 1.5, ortalama: 0.6 },
    giderHasilatOrani: { min: 70, max: 90, ortalama: 82 },
    finansmanGiderOrani: { min: 0.5, max: 3, ortalama: 1.5 },
    aciklama: 'Firin, kasap, sut, konserve, icecek',
    ozelRiskler: ['Fire kayiplari', 'Miad takibi', 'HACCP maliyetleri'],
  },

  'C-13': {
    naceKodu: 'C-13',
    sektorAdi: 'Tekstil Urunleri Imalati',
    kategori: 'URETIM',
    brutKarMarji: { min: 12, max: 35, ortalama: 22 },
    netKarMarji: { min: 2, max: 12, ortalama: 6 },
    cariOran: { min: 1.1, max: 2.5, ortalama: 1.6 },
    asitTestOrani: { min: 0.4, max: 1.3, ortalama: 0.7 },
    stokDevirHizi: { min: 3, max: 10, ortalama: 5 },
    alacakDevirHizi: { min: 4, max: 12, ortalama: 6 },
    borcDevirHizi: { min: 3, max: 8, ortalama: 5 },
    kasaAktifOrani: { min: 0.2, max: 2.5, ortalama: 1 },
    ortakCariFaizOrani: { min: 0, max: 18, ortalama: 6 },
    kdvYukuOrani: { min: 0.3, max: 2, ortalama: 0.8 },
    giderHasilatOrani: { min: 65, max: 88, ortalama: 78 },
    finansmanGiderOrani: { min: 1, max: 5, ortalama: 2.5 },
    aciklama: 'Dokuma, orgu, kumas, iplik',
    ozelRiskler: ['Fason uretim takibi', 'Ihracat KDV iadesi', 'Sezonluk stok'],
  },

  'C-14': {
    naceKodu: 'C-14',
    sektorAdi: 'Giyim Esyalari Imalati',
    kategori: 'URETIM',
    brutKarMarji: { min: 15, max: 45, ortalama: 28 },
    netKarMarji: { min: 3, max: 15, ortalama: 8 },
    cariOran: { min: 1.0, max: 2.3, ortalama: 1.5 },
    asitTestOrani: { min: 0.3, max: 1.2, ortalama: 0.6 },
    stokDevirHizi: { min: 2, max: 8, ortalama: 4 },
    alacakDevirHizi: { min: 4, max: 12, ortalama: 7 },
    borcDevirHizi: { min: 3, max: 8, ortalama: 5 },
    kasaAktifOrani: { min: 0.3, max: 3, ortalama: 1.2 },
    ortakCariFaizOrani: { min: 0, max: 15, ortalama: 5 },
    kdvYukuOrani: { min: 0.3, max: 2, ortalama: 1 },
    giderHasilatOrani: { min: 55, max: 85, ortalama: 72 },
    finansmanGiderOrani: { min: 0.5, max: 4, ortalama: 2 },
    aciklama: 'Hazir giyim, konfeksiyon, dis giyim',
    ozelRiskler: ['Marka degeri amortismani', 'Sezon sonu indirimleri', 'Ihracat tevkifati'],
  },

  'C-24': {
    naceKodu: 'C-24',
    sektorAdi: 'Ana Metal Sanayii',
    kategori: 'URETIM',
    brutKarMarji: { min: 8, max: 22, ortalama: 14 },
    netKarMarji: { min: 1, max: 8, ortalama: 4 },
    cariOran: { min: 1.0, max: 2.0, ortalama: 1.4 },
    asitTestOrani: { min: 0.5, max: 1.3, ortalama: 0.8 },
    stokDevirHizi: { min: 4, max: 12, ortalama: 7 },
    alacakDevirHizi: { min: 5, max: 14, ortalama: 8 },
    borcDevirHizi: { min: 4, max: 10, ortalama: 6 },
    kasaAktifOrani: { min: 0.2, max: 2, ortalama: 0.8 },
    ortakCariFaizOrani: { min: 0, max: 20, ortalama: 8 },
    kdvYukuOrani: { min: 0.4, max: 2, ortalama: 1 },
    giderHasilatOrani: { min: 78, max: 94, ortalama: 86 },
    finansmanGiderOrani: { min: 1.5, max: 6, ortalama: 3 },
    aciklama: 'Demir-celik, aluminyum, bakir',
    ozelRiskler: ['Hurda alimi belgeleme', 'Enerji maliyeti', 'Cevre harcamalari'],
  },

  // ============ INSAAT SEKTORU ============
  'F-41': {
    naceKodu: 'F-41',
    sektorAdi: 'Bina Insaati',
    kategori: 'INSAAT',
    brutKarMarji: { min: 10, max: 30, ortalama: 18 },
    netKarMarji: { min: 3, max: 15, ortalama: 8 },
    cariOran: { min: 0.8, max: 1.8, ortalama: 1.1 },
    asitTestOrani: { min: 0.3, max: 1.0, ortalama: 0.5 },
    stokDevirHizi: { min: 0.5, max: 2, ortalama: 1 },
    alacakDevirHizi: { min: 1, max: 4, ortalama: 2 },
    borcDevirHizi: { min: 2, max: 6, ortalama: 3 },
    kasaAktifOrani: { min: 0.5, max: 5, ortalama: 2 },
    ortakCariFaizOrani: { min: 0, max: 30, ortalama: 12 },
    kdvYukuOrani: { min: 0.2, max: 1.5, ortalama: 0.6 },
    giderHasilatOrani: { min: 70, max: 90, ortalama: 82 },
    finansmanGiderOrani: { min: 2, max: 8, ortalama: 4 },
    aciklama: 'Konut, is merkezi, AVM insaati',
    ozelRiskler: ['Kat karsiligi muhasebe', 'Hakediş-fatura zamanlama', 'Taşeron takibi'],
  },

  'F-42': {
    naceKodu: 'F-42',
    sektorAdi: 'Bayindirlik Insaati',
    kategori: 'INSAAT',
    brutKarMarji: { min: 8, max: 20, ortalama: 13 },
    netKarMarji: { min: 2, max: 10, ortalama: 5 },
    cariOran: { min: 0.9, max: 1.6, ortalama: 1.2 },
    asitTestOrani: { min: 0.4, max: 1.0, ortalama: 0.6 },
    stokDevirHizi: { min: 2, max: 6, ortalama: 3 },
    alacakDevirHizi: { min: 2, max: 6, ortalama: 3 },
    borcDevirHizi: { min: 2, max: 5, ortalama: 3 },
    kasaAktifOrani: { min: 0.3, max: 3, ortalama: 1 },
    ortakCariFaizOrani: { min: 0, max: 25, ortalama: 10 },
    kdvYukuOrani: { min: 0.1, max: 1, ortalama: 0.4 },
    giderHasilatOrani: { min: 80, max: 92, ortalama: 87 },
    finansmanGiderOrani: { min: 1, max: 5, ortalama: 2.5 },
    aciklama: 'Yol, kopru, baraj, altyapi',
    ozelRiskler: ['Kamu ihalesi SGK', 'Tevkifatli faturalama', 'Konsorsiyum muhasebesi'],
  },

  // ============ HIZMET SEKTORU ============
  'I-56': {
    naceKodu: 'I-56',
    sektorAdi: 'Yiyecek Icecek Hizmetleri',
    kategori: 'HIZMET',
    brutKarMarji: { min: 50, max: 75, ortalama: 62 },
    netKarMarji: { min: 3, max: 15, ortalama: 8 },
    cariOran: { min: 0.6, max: 1.5, ortalama: 0.9 },
    asitTestOrani: { min: 0.3, max: 1.0, ortalama: 0.5 },
    stokDevirHizi: { min: 20, max: 60, ortalama: 36 },
    alacakDevirHizi: { min: 20, max: 50, ortalama: 30 },
    borcDevirHizi: { min: 8, max: 18, ortalama: 12 },
    kasaAktifOrani: { min: 1, max: 10, ortalama: 4 },
    ortakCariFaizOrani: { min: 0, max: 20, ortalama: 8 },
    kdvYukuOrani: { min: 0.5, max: 3, ortalama: 1.5 },
    giderHasilatOrani: { min: 25, max: 50, ortalama: 38 },
    finansmanGiderOrani: { min: 0.5, max: 4, ortalama: 2 },
    aciklama: 'Restoran, kafe, fast-food, catering',
    ozelRiskler: ['Nakit satis kayit disi', 'Personel giderleri', 'Kira/ciro orani'],
  },

  'I-55': {
    naceKodu: 'I-55',
    sektorAdi: 'Konaklama',
    kategori: 'HIZMET',
    brutKarMarji: { min: 45, max: 70, ortalama: 55 },
    netKarMarji: { min: 5, max: 20, ortalama: 12 },
    cariOran: { min: 0.5, max: 1.4, ortalama: 0.8 },
    asitTestOrani: { min: 0.3, max: 1.0, ortalama: 0.5 },
    stokDevirHizi: { min: 15, max: 40, ortalama: 25 },
    alacakDevirHizi: { min: 10, max: 30, ortalama: 18 },
    borcDevirHizi: { min: 6, max: 15, ortalama: 10 },
    kasaAktifOrani: { min: 0.5, max: 5, ortalama: 2 },
    ortakCariFaizOrani: { min: 0, max: 25, ortalama: 10 },
    kdvYukuOrani: { min: 0.5, max: 2.5, ortalama: 1.2 },
    giderHasilatOrani: { min: 30, max: 55, ortalama: 45 },
    finansmanGiderOrani: { min: 2, max: 8, ortalama: 4 },
    aciklama: 'Otel, pansiyon, tatil koyu',
    ozelRiskler: ['Sezonluk doluluk', 'Amortisman yuku', 'Tour operator alacaklari'],
  },

  'J-62': {
    naceKodu: 'J-62',
    sektorAdi: 'Bilgisayar Programlama',
    kategori: 'HIZMET',
    brutKarMarji: { min: 30, max: 60, ortalama: 45 },
    netKarMarji: { min: 8, max: 25, ortalama: 15 },
    cariOran: { min: 1.2, max: 3.0, ortalama: 1.8 },
    asitTestOrani: { min: 1.0, max: 2.5, ortalama: 1.5 },
    stokDevirHizi: { min: 0, max: 2, ortalama: 0.5 },
    alacakDevirHizi: { min: 4, max: 12, ortalama: 6 },
    borcDevirHizi: { min: 6, max: 15, ortalama: 10 },
    kasaAktifOrani: { min: 2, max: 15, ortalama: 7 },
    ortakCariFaizOrani: { min: 0, max: 10, ortalama: 3 },
    kdvYukuOrani: { min: 0.5, max: 3, ortalama: 1.5 },
    giderHasilatOrani: { min: 40, max: 70, ortalama: 55 },
    finansmanGiderOrani: { min: 0, max: 2, ortalama: 0.5 },
    aciklama: 'Yazilim gelistirme, IT danismanlik',
    ozelRiskler: ['AR-GE indirimi belgeleme', 'Yurtdisi hizmet ihracati', 'Freelance odemeler'],
  },

  'H-49': {
    naceKodu: 'H-49',
    sektorAdi: 'Kara Tasimaciligi',
    kategori: 'HIZMET',
    brutKarMarji: { min: 12, max: 30, ortalama: 20 },
    netKarMarji: { min: 2, max: 10, ortalama: 5 },
    cariOran: { min: 0.8, max: 1.6, ortalama: 1.1 },
    asitTestOrani: { min: 0.5, max: 1.2, ortalama: 0.7 },
    stokDevirHizi: { min: 10, max: 30, ortalama: 18 },
    alacakDevirHizi: { min: 6, max: 15, ortalama: 9 },
    borcDevirHizi: { min: 4, max: 10, ortalama: 6 },
    kasaAktifOrani: { min: 0.5, max: 4, ortalama: 1.5 },
    ortakCariFaizOrani: { min: 0, max: 15, ortalama: 5 },
    kdvYukuOrani: { min: 0.3, max: 2, ortalama: 1 },
    giderHasilatOrani: { min: 70, max: 88, ortalama: 80 },
    finansmanGiderOrani: { min: 1, max: 5, ortalama: 2.5 },
    aciklama: 'Nakliye, lojistik, kargo',
    ozelRiskler: ['Akaryakit gider belgesi', 'Arac amortisman', 'Sofor SGK'],
  },

  // ============ SAGLIK SEKTORU ============
  'Q-86': {
    naceKodu: 'Q-86',
    sektorAdi: 'Insan Sagligi Hizmetleri',
    kategori: 'SAGLIK',
    brutKarMarji: { min: 25, max: 55, ortalama: 38 },
    netKarMarji: { min: 5, max: 20, ortalama: 12 },
    cariOran: { min: 1.0, max: 2.5, ortalama: 1.5 },
    asitTestOrani: { min: 0.7, max: 2.0, ortalama: 1.2 },
    stokDevirHizi: { min: 8, max: 24, ortalama: 14 },
    alacakDevirHizi: { min: 4, max: 12, ortalama: 7 },
    borcDevirHizi: { min: 6, max: 15, ortalama: 10 },
    kasaAktifOrani: { min: 1, max: 8, ortalama: 3 },
    ortakCariFaizOrani: { min: 0, max: 12, ortalama: 4 },
    kdvYukuOrani: { min: 0, max: 1, ortalama: 0.3 },
    giderHasilatOrani: { min: 45, max: 75, ortalama: 62 },
    finansmanGiderOrani: { min: 0.5, max: 4, ortalama: 2 },
    aciklama: 'Hastane, klinik, muayenehane',
    ozelRiskler: ['SGK fatura kesintileri', 'Tibbi sarf stok', 'Hekim ucretleri'],
  },

  // ============ EMLAK SEKTORU ============
  'L-68': {
    naceKodu: 'L-68',
    sektorAdi: 'Gayrimenkul Faaliyetleri',
    kategori: 'EMLAK',
    brutKarMarji: { min: 20, max: 50, ortalama: 35 },
    netKarMarji: { min: 10, max: 35, ortalama: 22 },
    cariOran: { min: 0.6, max: 1.5, ortalama: 0.9 },
    asitTestOrani: { min: 0.4, max: 1.2, ortalama: 0.7 },
    stokDevirHizi: { min: 0.2, max: 1, ortalama: 0.5 },
    alacakDevirHizi: { min: 2, max: 8, ortalama: 4 },
    borcDevirHizi: { min: 1, max: 4, ortalama: 2 },
    kasaAktifOrani: { min: 0.5, max: 5, ortalama: 2 },
    ortakCariFaizOrani: { min: 0, max: 35, ortalama: 15 },
    kdvYukuOrani: { min: 0.1, max: 1, ortalama: 0.4 },
    giderHasilatOrani: { min: 50, max: 80, ortalama: 65 },
    finansmanGiderOrani: { min: 3, max: 12, ortalama: 6 },
    aciklama: 'Kira, emlak alim-satim, yonetim',
    ozelRiskler: ['Kira geliri beyani', 'Deger artis kazanci', 'Kat irtifaki zamanlama'],
  },

  // ============ MESLEKI HIZMETLER ============
  'M-69': {
    naceKodu: 'M-69',
    sektorAdi: 'Hukuk ve Muhasebe',
    kategori: 'MESLEKI',
    brutKarMarji: { min: 40, max: 70, ortalama: 55 },
    netKarMarji: { min: 15, max: 40, ortalama: 28 },
    cariOran: { min: 1.5, max: 4.0, ortalama: 2.5 },
    asitTestOrani: { min: 1.2, max: 3.5, ortalama: 2.2 },
    stokDevirHizi: { min: 0, max: 1, ortalama: 0.2 },
    alacakDevirHizi: { min: 4, max: 12, ortalama: 7 },
    borcDevirHizi: { min: 8, max: 20, ortalama: 12 },
    kasaAktifOrani: { min: 3, max: 20, ortalama: 10 },
    ortakCariFaizOrani: { min: 0, max: 8, ortalama: 2 },
    kdvYukuOrani: { min: 0.5, max: 3, ortalama: 1.5 },
    giderHasilatOrani: { min: 30, max: 60, ortalama: 45 },
    finansmanGiderOrani: { min: 0, max: 2, ortalama: 0.5 },
    aciklama: 'Avukatlik, SMMM, YMM',
    ozelRiskler: ['Serbest meslek makbuzu', 'Stopaj hesaplama', 'Mesleki sorumluluk sigortasi'],
  },

  'M-70': {
    naceKodu: 'M-70',
    sektorAdi: 'Yonetim Danismanligi',
    kategori: 'MESLEKI',
    brutKarMarji: { min: 35, max: 65, ortalama: 50 },
    netKarMarji: { min: 12, max: 35, ortalama: 22 },
    cariOran: { min: 1.3, max: 3.5, ortalama: 2.0 },
    asitTestOrani: { min: 1.0, max: 3.0, ortalama: 1.8 },
    stokDevirHizi: { min: 0, max: 1, ortalama: 0.1 },
    alacakDevirHizi: { min: 3, max: 10, ortalama: 5 },
    borcDevirHizi: { min: 6, max: 18, ortalama: 10 },
    kasaAktifOrani: { min: 2, max: 15, ortalama: 8 },
    ortakCariFaizOrani: { min: 0, max: 10, ortalama: 3 },
    kdvYukuOrani: { min: 0.5, max: 3, ortalama: 1.5 },
    giderHasilatOrani: { min: 35, max: 65, ortalama: 50 },
    finansmanGiderOrani: { min: 0, max: 2, ortalama: 0.5 },
    aciklama: 'Strateji, operasyon, HR danismanligi',
    ozelRiskler: ['Proje bazli gelir tanima', 'Yurtdisi hizmet', 'Personel prim sistemi'],
  },

  'M-71': {
    naceKodu: 'M-71',
    sektorAdi: 'Mimarlik ve Muhendislik',
    kategori: 'MESLEKI',
    brutKarMarji: { min: 30, max: 55, ortalama: 42 },
    netKarMarji: { min: 8, max: 25, ortalama: 16 },
    cariOran: { min: 1.2, max: 3.0, ortalama: 1.8 },
    asitTestOrani: { min: 1.0, max: 2.5, ortalama: 1.5 },
    stokDevirHizi: { min: 0, max: 2, ortalama: 0.5 },
    alacakDevirHizi: { min: 3, max: 10, ortalama: 5 },
    borcDevirHizi: { min: 5, max: 15, ortalama: 8 },
    kasaAktifOrani: { min: 2, max: 12, ortalama: 6 },
    ortakCariFaizOrani: { min: 0, max: 12, ortalama: 4 },
    kdvYukuOrani: { min: 0.5, max: 2.5, ortalama: 1.2 },
    giderHasilatOrani: { min: 45, max: 70, ortalama: 58 },
    finansmanGiderOrani: { min: 0, max: 3, ortalama: 1 },
    aciklama: 'Proje, keşif, teknik musavirlik',
    ozelRiskler: ['Hakediş zamanlama', 'Mesleki sigorta', 'Alt yuklenici yonetimi'],
  },
};

/**
 * Sektor benchmark istatistikleri
 */
export const SEKTOR_BENCHMARK_ISTATISTIK = {
  toplamSektor: Object.keys(SEKTOR_BENCHMARKS).length,
  kategoriler: {
    TICARET: Object.values(SEKTOR_BENCHMARKS).filter((s) => s.kategori === 'TICARET').length,
    URETIM: Object.values(SEKTOR_BENCHMARKS).filter((s) => s.kategori === 'URETIM').length,
    INSAAT: Object.values(SEKTOR_BENCHMARKS).filter((s) => s.kategori === 'INSAAT').length,
    HIZMET: Object.values(SEKTOR_BENCHMARKS).filter((s) => s.kategori === 'HIZMET').length,
    SAGLIK: Object.values(SEKTOR_BENCHMARKS).filter((s) => s.kategori === 'SAGLIK').length,
    EMLAK: Object.values(SEKTOR_BENCHMARKS).filter((s) => s.kategori === 'EMLAK').length,
    MESLEKI: Object.values(SEKTOR_BENCHMARKS).filter((s) => s.kategori === 'MESLEKI').length,
  },
};

/**
 * NACE koduna gore benchmark getir
 */
export const getSektorBenchmark = (naceKodu: string): SektorBenchmark | undefined => {
  return SEKTOR_BENCHMARKS[naceKodu];
};

/**
 * Kategoriye gore sektorleri getir
 */
export const getSektorlerByKategori = (
  kategori: SektorBenchmark['kategori']
): SektorBenchmark[] => {
  return Object.values(SEKTOR_BENCHMARKS).filter((s) => s.kategori === kategori);
};

/**
 * Tum sektor kodlarini getir
 */
export const getAllSektorKodlari = (): string[] => {
  return Object.keys(SEKTOR_BENCHMARKS);
};

/**
 * Oran sapmasini hesapla
 */
export const hesaplaSapma = (
  mukellefDegeri: number,
  aralik: OranAralik
): { sapmaYuzdesi: number; sapmaTuru: 'ALTINDA' | 'NORMAL' | 'USTUNDE' } => {
  if (mukellefDegeri < aralik.min) {
    const sapma = ((aralik.min - mukellefDegeri) / aralik.min) * 100;
    return { sapmaYuzdesi: Math.round(sapma * 10) / 10, sapmaTuru: 'ALTINDA' };
  }
  if (mukellefDegeri > aralik.max) {
    const sapma = ((mukellefDegeri - aralik.max) / aralik.max) * 100;
    return { sapmaYuzdesi: Math.round(sapma * 10) / 10, sapmaTuru: 'USTUNDE' };
  }
  return { sapmaYuzdesi: 0, sapmaTuru: 'NORMAL' };
};

/**
 * Sapmadan risk seviyesi belirle
 */
export const sapmaRiskSeviyesi = (
  sapmaYuzdesi: number,
  sapmaTuru: 'ALTINDA' | 'NORMAL' | 'USTUNDE'
): RiskSeviyesi => {
  if (sapmaTuru === 'NORMAL') return 'DUSUK';
  if (sapmaYuzdesi >= 100) return 'KRITIK';
  if (sapmaYuzdesi >= 50) return 'YUKSEK';
  if (sapmaYuzdesi >= 25) return 'ORTA';
  return 'DUSUK';
};
