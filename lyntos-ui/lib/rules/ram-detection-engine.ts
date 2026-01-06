/**
 * RAM Tespit Motoru
 *
 * Mizan ve beyanname verilerini RAM pattern'lerine gore analiz eder.
 * SMMM hatalarini tespit eder ve duzeltme onerileri sunar.
 */

import type {
  RamKategori,
  MizanHesapInput,
  RiskSeviyesi,
  Kanit,
} from '../types/vdk-types';
import { RAM_PATTERNS, RAM_ISTATISTIK } from './ram-patterns';

// RAM tespit sonucu
export interface RamTespitSonucu {
  patternId: string;
  patternAd: string;
  kategori: RamKategori;
  tespit: boolean;
  seviye: RiskSeviyesi;
  mesaj: string;
  detay: string;
  dogru: string;
  otomatikDuzeltme: boolean;
  duzeltmeOnerisi?: string;
  mevzuat: string[];
  kanitlar: Kanit[];
}

// RAM analiz input
export interface RamAnalyzInput {
  mizanHesaplari: MizanHesapInput[];
  kvBeyanTicariBilancoKari?: number;
  gv4DonemMatrah?: number;
  kvMatrah?: number;
  bagisIndirimi?: number;
  kkegBagis?: number;
  kkegToplam?: number;
  sgkTahakkuk?: number;
  sgkOdeme?: number;
  binekOtoAlimi?: boolean;
  kdvIndirimKaydi?: boolean;
  netSatislar?: number;
  brutSatisHasilati?: number;
  eFaturaKullanicisi?: boolean;
  baBsToplami?: number;
  beyannameToplami?: number;
  defterSinifi?: 'ISLETME' | 'BILANCO';
}

// RAM analiz output
export interface RamAnalyzOutput {
  toplamKontrol: number;
  tespitSayisi: number;
  kritikSayisi: number;
  yuksekSayisi: number;
  ortaSayisi: number;
  tespitler: RamTespitSonucu[];
  kritikTespitler: RamTespitSonucu[];
  otomatikDuzeltmeOlanlar: RamTespitSonucu[];
  riskSeviyesi: RiskSeviyesi;
  ozetMesaj: string;
}

/**
 * Mizan hesap bakiyesini getir
 */
const getHesapBakiye = (
  mizanHesaplari: MizanHesapInput[],
  hesapKodu: string
): number => {
  const hesap = mizanHesaplari.find((h) => h.kod === hesapKodu);
  return hesap ? hesap.bakiye : 0;
};

/**
 * Hesap grubu toplami
 */
const getHesapGrupToplami = (
  mizanHesaplari: MizanHesapInput[],
  prefix: string
): number => {
  return mizanHesaplari
    .filter((h) => h.kod.startsWith(prefix))
    .reduce((sum, h) => sum + Math.abs(h.bakiye), 0);
};

/**
 * RAM-B01: KV Beyannamesinde Net Kar Hatasi
 */
const kontrolRamB01 = (input: RamAnalyzInput): RamTespitSonucu | null => {
  const pattern = RAM_PATTERNS['RAM-B01'];
  const { mizanHesaplari, kvBeyanTicariBilancoKari, kkegToplam } = input;

  const gelirTablosu590 = Math.abs(getHesapBakiye(mizanHesaplari, '590'));
  const beklenenDeger = gelirTablosu590 + (kkegToplam || 0);

  if (kvBeyanTicariBilancoKari === undefined) return null;

  const fark = Math.abs(kvBeyanTicariBilancoKari - beklenenDeger);
  const tespit = fark > 100; // 100 TL tolerans

  if (!tespit) return null;

  return {
    patternId: pattern.id,
    patternAd: pattern.ad,
    kategori: pattern.kategori,
    tespit: true,
    seviye: 'KRITIK',
    mesaj: `KV beyannamesinde ticari bilanco kari yanlis yazilmis!`,
    detay: `Beyannamede: ${kvBeyanTicariBilancoKari?.toLocaleString('tr-TR')} TL, Olmasi gereken: ${beklenenDeger.toLocaleString('tr-TR')} TL (590: ${gelirTablosu590.toLocaleString('tr-TR')} + KKEG: ${(kkegToplam || 0).toLocaleString('tr-TR')})`,
    dogru: pattern.dogru,
    otomatikDuzeltme: pattern.otomatikDuzeltme,
    duzeltmeOnerisi: `Ticari Bilanco Kari = ${beklenenDeger.toLocaleString('tr-TR')} TL olmali`,
    mevzuat: pattern.mevzuat,
    kanitlar: [
      { tip: 'HESAP', aciklama: '590 Donem Net Kari', deger: gelirTablosu590 },
      { tip: 'HESAP', aciklama: 'KKEG Toplami', deger: kkegToplam || 0 },
      {
        tip: 'FORMUL',
        aciklama: 'Ticari Bilanco Kari = 590 + KKEG',
        deger: beklenenDeger,
      },
    ],
  };
};

/**
 * RAM-M01: Donem Sonu Hesaplari Calistirilmamis
 */
const kontrolRamM01 = (input: RamAnalyzInput): RamTespitSonucu | null => {
  const pattern = RAM_PATTERNS['RAM-M01'];
  const { mizanHesaplari } = input;

  const hesap690 = getHesapBakiye(mizanHesaplari, '690');
  const hesap691 = getHesapBakiye(mizanHesaplari, '691');
  const hesap692 = getHesapBakiye(mizanHesaplari, '692');

  const toplam = Math.abs(hesap690) + Math.abs(hesap691) + Math.abs(hesap692);
  const tespit = toplam > 0;

  if (!tespit) return null;

  return {
    patternId: pattern.id,
    patternAd: pattern.ad,
    kategori: pattern.kategori,
    tespit: true,
    seviye: 'KRITIK',
    mesaj: 'Donem sonu hesaplari (690-691-692) kapatilmamis!',
    detay: `690: ${hesap690.toLocaleString('tr-TR')} TL, 691: ${hesap691.toLocaleString('tr-TR')} TL, 692: ${hesap692.toLocaleString('tr-TR')} TL`,
    dogru: pattern.dogru,
    otomatikDuzeltme: pattern.otomatikDuzeltme,
    duzeltmeOnerisi: '690, 691, 692 hesaplarini 590 hesaba kapatin',
    mevzuat: pattern.mevzuat,
    kanitlar: [
      { tip: 'HESAP', aciklama: '690 Donem Kari veya Zarari', deger: hesap690 },
      { tip: 'HESAP', aciklama: '691 Donem Kari V. ve Yak.', deger: hesap691 },
      {
        tip: 'HESAP',
        aciklama: '692 Donem Net Kari veya Zarari',
        deger: hesap692,
      },
    ],
  };
};

/**
 * RAM-M02: Aktif-Pasif Dengesizligi
 */
const kontrolRamM02 = (input: RamAnalyzInput): RamTespitSonucu | null => {
  const pattern = RAM_PATTERNS['RAM-M02'];
  const { mizanHesaplari } = input;

  // Aktif: 1xx + 2xx
  const toplamAktif =
    getHesapGrupToplami(mizanHesaplari, '1') +
    getHesapGrupToplami(mizanHesaplari, '2');

  // Pasif: 3xx + 4xx + 5xx
  const toplamPasif =
    getHesapGrupToplami(mizanHesaplari, '3') +
    getHesapGrupToplami(mizanHesaplari, '4') +
    getHesapGrupToplami(mizanHesaplari, '5');

  const fark = Math.abs(toplamAktif - toplamPasif);
  const tespit = fark > 1; // 1 TL tolerans

  if (!tespit) return null;

  return {
    patternId: pattern.id,
    patternAd: pattern.ad,
    kategori: pattern.kategori,
    tespit: true,
    seviye: 'KRITIK',
    mesaj: 'BILANCO DENKLIGI BOZUK! Aktif != Pasif',
    detay: `Toplam Aktif: ${toplamAktif.toLocaleString('tr-TR')} TL, Toplam Pasif: ${toplamPasif.toLocaleString('tr-TR')} TL, Fark: ${fark.toLocaleString('tr-TR')} TL`,
    dogru: pattern.dogru,
    otomatikDuzeltme: false,
    mevzuat: pattern.mevzuat,
    kanitlar: [
      { tip: 'HESAP', aciklama: 'Toplam Aktif (1xx + 2xx)', deger: toplamAktif },
      {
        tip: 'HESAP',
        aciklama: 'Toplam Pasif (3xx + 4xx + 5xx)',
        deger: toplamPasif,
      },
      { tip: 'FORMUL', aciklama: 'Fark', deger: fark },
    ],
  };
};

/**
 * RAM-M03: Birikmis Amortisman Fazlaligi
 */
const kontrolRamM03 = (input: RamAnalyzInput): RamTespitSonucu | null => {
  const pattern = RAM_PATTERNS['RAM-M03'];
  const { mizanHesaplari } = input;

  // Duran varliklar (250-255)
  const duranVarliklar =
    getHesapBakiye(mizanHesaplari, '250') +
    getHesapBakiye(mizanHesaplari, '251') +
    getHesapBakiye(mizanHesaplari, '252') +
    getHesapBakiye(mizanHesaplari, '253') +
    getHesapBakiye(mizanHesaplari, '254') +
    getHesapBakiye(mizanHesaplari, '255');

  // Birikmis amortismanlar (257-258)
  const birAmort =
    Math.abs(getHesapBakiye(mizanHesaplari, '257')) +
    Math.abs(getHesapBakiye(mizanHesaplari, '258'));

  if (duranVarliklar === 0) return null;

  const tespit = birAmort > duranVarliklar;

  if (!tespit) return null;

  return {
    patternId: pattern.id,
    patternAd: pattern.ad,
    kategori: pattern.kategori,
    tespit: true,
    seviye: 'KRITIK',
    mesaj: 'Birikmis amortisman duran varliklardan fazla!',
    detay: `Duran Varliklar: ${duranVarliklar.toLocaleString('tr-TR')} TL, Birikmis Amortisman: ${birAmort.toLocaleString('tr-TR')} TL`,
    dogru: pattern.dogru,
    otomatikDuzeltme: false,
    mevzuat: pattern.mevzuat,
    kanitlar: [
      {
        tip: 'HESAP',
        aciklama: 'Duran Varliklar (250-255)',
        deger: duranVarliklar,
      },
      { tip: 'HESAP', aciklama: 'Birikmis Amortisman (257-258)', deger: birAmort },
    ],
  };
};

/**
 * RAM-V02: Odenmemis SGK Primi Gideri
 */
const kontrolRamV02 = (input: RamAnalyzInput): RamTespitSonucu | null => {
  const pattern = RAM_PATTERNS['RAM-V02'];
  const { sgkTahakkuk, sgkOdeme } = input;

  if (sgkTahakkuk === undefined || sgkOdeme === undefined) return null;

  const odenmemisSgk = sgkTahakkuk - sgkOdeme;
  const tespit = odenmemisSgk > 100; // 100 TL tolerans

  if (!tespit) return null;

  return {
    patternId: pattern.id,
    patternAd: pattern.ad,
    kategori: pattern.kategori,
    tespit: true,
    seviye: 'YUKSEK',
    mesaj: 'Odenmemis SGK primi gider yazilmis!',
    detay: `SGK Tahakkuku: ${sgkTahakkuk.toLocaleString('tr-TR')} TL, Odenen: ${sgkOdeme.toLocaleString('tr-TR')} TL, Odenmemis: ${odenmemisSgk.toLocaleString('tr-TR')} TL`,
    dogru: pattern.dogru,
    otomatikDuzeltme: pattern.otomatikDuzeltme,
    duzeltmeOnerisi: `${odenmemisSgk.toLocaleString('tr-TR')} TL tutarinda KKEG ekleyin`,
    mevzuat: pattern.mevzuat,
    kanitlar: [
      { tip: 'HESAP', aciklama: 'SGK Tahakkuku', deger: sgkTahakkuk },
      { tip: 'HESAP', aciklama: 'Odenen SGK', deger: sgkOdeme },
      { tip: 'FORMUL', aciklama: 'Odenmemis (KKEG olmali)', deger: odenmemisSgk },
    ],
  };
};

/**
 * RAM-S01: Defter Tutma Haddi Sinif Degisikligi
 */
const kontrolRamS01 = (input: RamAnalyzInput): RamTespitSonucu | null => {
  const pattern = RAM_PATTERNS['RAM-S01'];
  const { netSatislar, defterSinifi } = input;

  if (netSatislar === undefined || defterSinifi === undefined) return null;

  // 2024 yili defter tutma haddi (yaklasik deger)
  const defterTutmaHaddi = 1_500_000; // TL

  const tespit = netSatislar > defterTutmaHaddi && defterSinifi === 'ISLETME';

  if (!tespit) return null;

  return {
    patternId: pattern.id,
    patternAd: pattern.ad,
    kategori: pattern.kategori,
    tespit: true,
    seviye: 'KRITIK',
    mesaj: 'Defter tutma haddi asilmis, bilanco esasina gecilmeli!',
    detay: `Net Satislar: ${netSatislar.toLocaleString('tr-TR')} TL, Haddi: ${defterTutmaHaddi.toLocaleString('tr-TR')} TL`,
    dogru: pattern.dogru,
    otomatikDuzeltme: false,
    mevzuat: pattern.mevzuat,
    kanitlar: [
      { tip: 'HESAP', aciklama: 'Net Satislar', deger: netSatislar },
      { tip: 'ESIK', aciklama: 'Defter Tutma Haddi', deger: defterTutmaHaddi },
    ],
  };
};

/**
 * RAM-D01: Ba-Bs Bildirim Tutarsizligi
 */
const kontrolRamD01 = (input: RamAnalyzInput): RamTespitSonucu | null => {
  const pattern = RAM_PATTERNS['RAM-D01'];
  const { baBsToplami, beyannameToplami } = input;

  if (baBsToplami === undefined || beyannameToplami === undefined) return null;
  if (beyannameToplami === 0) return null;

  const fark = Math.abs(baBsToplami - beyannameToplami);
  const farkOrani = fark / beyannameToplami;
  const tespit = farkOrani > 0.05; // %5 esik

  if (!tespit) return null;

  return {
    patternId: pattern.id,
    patternAd: pattern.ad,
    kategori: pattern.kategori,
    tespit: true,
    seviye: 'YUKSEK',
    mesaj: 'Ba-Bs bildirimleri ile beyanname arasinda tutarsizlik!',
    detay: `Ba-Bs Toplami: ${baBsToplami.toLocaleString('tr-TR')} TL, Beyanname: ${beyannameToplami.toLocaleString('tr-TR')} TL, Fark: %${(farkOrani * 100).toFixed(1)}`,
    dogru: pattern.dogru,
    otomatikDuzeltme: false,
    mevzuat: pattern.mevzuat,
    kanitlar: [
      { tip: 'HESAP', aciklama: 'Ba-Bs Toplami', deger: baBsToplami },
      { tip: 'HESAP', aciklama: 'Beyanname Toplami', deger: beyannameToplami },
      {
        tip: 'FORMUL',
        aciklama: 'Fark Orani',
        deger: `%${(farkOrani * 100).toFixed(2)}`,
      },
    ],
  };
};

/**
 * Ana RAM analiz fonksiyonu
 */
export const analyzeRamPatterns = (input: RamAnalyzInput): RamAnalyzOutput => {
  const tespitler: RamTespitSonucu[] = [];

  // Tum kontrolleri calistir
  const kontrolFonksiyonlari = [
    kontrolRamB01,
    kontrolRamM01,
    kontrolRamM02,
    kontrolRamM03,
    kontrolRamV02,
    kontrolRamS01,
    kontrolRamD01,
    // Diger kontroller eklenebilir...
  ];

  for (const kontrolFn of kontrolFonksiyonlari) {
    const sonuc = kontrolFn(input);
    if (sonuc) {
      tespitler.push(sonuc);
    }
  }

  // Sonuclari kategorize et
  const kritikTespitler = tespitler.filter((t) => t.seviye === 'KRITIK');
  const yuksekTespitler = tespitler.filter((t) => t.seviye === 'YUKSEK');
  const ortaTespitler = tespitler.filter((t) => t.seviye === 'ORTA');
  const otomatikDuzeltmeOlanlar = tespitler.filter((t) => t.otomatikDuzeltme);

  // Genel risk seviyesi
  let riskSeviyesi: RiskSeviyesi;
  if (kritikTespitler.length >= 2) riskSeviyesi = 'KRITIK';
  else if (kritikTespitler.length >= 1) riskSeviyesi = 'YUKSEK';
  else if (yuksekTespitler.length >= 2) riskSeviyesi = 'ORTA';
  else riskSeviyesi = 'DUSUK';

  // Ozet mesaj
  let ozetMesaj = '';
  if (riskSeviyesi === 'KRITIK') {
    ozetMesaj = `KRITIK: ${kritikTespitler.length} adet kritik hata tespit edildi. Derhal duzeltilmeli!`;
  } else if (riskSeviyesi === 'YUKSEK') {
    ozetMesaj = `UYARI: ${tespitler.length} adet hata tespit edildi. Incelenmeli.`;
  } else if (riskSeviyesi === 'ORTA') {
    ozetMesaj = `ORTA: Bazi duzeltmeler gerekli.`;
  } else {
    ozetMesaj = `DUSUK RISK: Belirgin hata tespit edilmedi.`;
  }

  return {
    toplamKontrol: RAM_ISTATISTIK.toplamPattern,
    tespitSayisi: tespitler.length,
    kritikSayisi: kritikTespitler.length,
    yuksekSayisi: yuksekTespitler.length,
    ortaSayisi: ortaTespitler.length,
    tespitler,
    kritikTespitler,
    otomatikDuzeltmeOlanlar,
    riskSeviyesi,
    ozetMesaj,
  };
};

// Helper: RAM seviye rengini dondur
export const getRamSeviyeRenk = (seviye: RiskSeviyesi): string => {
  switch (seviye) {
    case 'KRITIK':
      return 'red';
    case 'YUKSEK':
      return 'orange';
    case 'ORTA':
      return 'yellow';
    case 'DUSUK':
      return 'green';
    default:
      return 'gray';
  }
};

// Helper: Kategori ikonunu dondur
export const getRamKategoriIkon = (kategori: RamKategori): string => {
  const ikonlar: Record<RamKategori, string> = {
    BEYANNAME: '📋',
    MUHASEBE: '📒',
    VERGI: '💰',
    SINIF: '📊',
    BELGE: '📄',
  };
  return ikonlar[kategori] || '📌';
};
