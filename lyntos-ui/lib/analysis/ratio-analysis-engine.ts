/**
 * Finansal Oran Analiz Motoru
 *
 * Mizan verilerinden finansal oranları hesaplar ve değerlendirir.
 * VDK eşik değerleriyle karşılaştırma yapar.
 */

import type {
  OranKategorisi,
  MizanHesapInput,
  RiskSeviyesi,
  Kanit,
} from '../types/vdk-types';
import { FINANSAL_ORANLAR, ORAN_ISTATISTIK } from './ratio-definitions';

// Hesaplanmış oran
export interface HesaplanmisOran {
  oranId: string;
  oranAd: string;
  kategori: OranKategorisi;
  deger: number | null;
  birim: string;
  normalMin: number;
  normalMax: number;
  seviye: RiskSeviyesi;
  yorum: string;
  vdkKKodu?: string;
  vdkRiski: boolean;
  formul: string;
  kanitlar: Kanit[];
}

// Oran analiz input
export interface OranAnalyzInput {
  mizanHesaplari: MizanHesapInput[];
  // Önceki dönem verileri (devir hızları için)
  oncekiDonemStok?: number;
  oncekiDonemAlacak?: number;
  oncekiDonemBorc?: number;
}

// Oran analiz output
export interface OranAnalyzOutput {
  toplamOran: number;
  hesaplananOran: number;
  sorunluOran: number;
  vdkRiskliOran: number;
  oranlar: HesaplanmisOran[];
  likiditeOzet: KategoriOzet;
  faaliyetOzet: KategoriOzet;
  maliYapiOzet: KategoriOzet;
  karlilikOzet: KategoriOzet;
  genelRiskSeviyesi: RiskSeviyesi;
  ozetMesaj: string;
}

// Kategori özet
export interface KategoriOzet {
  kategori: OranKategorisi;
  toplamOran: number;
  sorunluOran: number;
  ortalamaSeviye: RiskSeviyesi;
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
 * Hesap grubu toplamı (borç bakiyeli)
 */
const getHesapGrupToplamiBorcBakiye = (
  mizanHesaplari: MizanHesapInput[],
  prefix: string
): number => {
  return mizanHesaplari
    .filter((h) => h.kod.startsWith(prefix))
    .reduce((sum, h) => sum + Math.max(0, h.bakiye), 0);
};

/**
 * Hesap grubu toplamı (alacak bakiyeli, mutlak değer)
 */
const getHesapGrupToplamiAlacakBakiye = (
  mizanHesaplari: MizanHesapInput[],
  prefix: string
): number => {
  return mizanHesaplari
    .filter((h) => h.kod.startsWith(prefix))
    .reduce((sum, h) => sum + Math.abs(Math.min(0, h.bakiye)), 0);
};

/**
 * Risk seviyesi belirle
 */
const belirleRiskSeviyesi = (
  deger: number,
  normalMin: number,
  normalMax: number,
  tersOran: boolean = false // Düşük değer mi kötü?
): RiskSeviyesi => {
  if (deger >= normalMin && deger <= normalMax) {
    return 'DUSUK';
  }

  if (tersOran) {
    // Düşük değer kötü (örn: cari oran, karlılık)
    if (deger < normalMin * 0.5) return 'KRITIK';
    if (deger < normalMin) return 'YUKSEK';
    return 'ORTA';
  } else {
    // Yüksek değer kötü (örn: borçluluk)
    if (deger > normalMax * 2) return 'KRITIK';
    if (deger > normalMax * 1.5) return 'YUKSEK';
    if (deger > normalMax) return 'ORTA';
    if (deger < normalMin * 0.5) return 'ORTA';
    return 'DUSUK';
  }
};

/**
 * Yorum seç
 */
const secYorum = (
  deger: number,
  normalMin: number,
  normalMax: number,
  yorumlar: { dusuk: string; normal: string; yuksek: string }
): string => {
  if (deger < normalMin) return yorumlar.dusuk;
  if (deger > normalMax) return yorumlar.yuksek;
  return yorumlar.normal;
};

/**
 * Mizan'dan temel değerleri hesapla
 */
const hesaplaTemelDegerler = (mizanHesaplari: MizanHesapInput[]) => {
  // Dönen Varlıklar (1xx)
  const donenVarliklar = getHesapGrupToplamiBorcBakiye(mizanHesaplari, '1');

  // Duran Varlıklar (2xx)
  const duranVarliklar = getHesapGrupToplamiBorcBakiye(mizanHesaplari, '2');

  // Toplam Aktif
  const toplamAktif = donenVarliklar + duranVarliklar;

  // Kısa Vadeli Borçlar (3xx)
  const kisaVadeliBorclar = getHesapGrupToplamiAlacakBakiye(mizanHesaplari, '3');

  // Uzun Vadeli Borçlar (4xx)
  const uzunVadeliBorclar = getHesapGrupToplamiAlacakBakiye(mizanHesaplari, '4');

  // Toplam Borçlar
  const toplamBorclar = kisaVadeliBorclar + uzunVadeliBorclar;

  // Özkaynaklar (5xx)
  const ozkaynaklar = getHesapGrupToplamiAlacakBakiye(mizanHesaplari, '5');

  // Kasa (100)
  const kasa = getHesapBakiye(mizanHesaplari, '100');

  // Bankalar (102, 103)
  const bankalar =
    getHesapBakiye(mizanHesaplari, '102') +
    getHesapBakiye(mizanHesaplari, '103');

  // Hazır Değerler (10x)
  const hazirDegerler = getHesapGrupToplamiBorcBakiye(mizanHesaplari, '10');

  // Stoklar (15x)
  const stoklar = getHesapGrupToplamiBorcBakiye(mizanHesaplari, '15');

  // Ticari Alacaklar (120)
  const ticariAlacaklar = getHesapBakiye(mizanHesaplari, '120');

  // Ticari Borçlar (320)
  const ticariBorclar = Math.abs(getHesapBakiye(mizanHesaplari, '320'));

  // Ortaklardan Alacaklar (131)
  const ortakAlacak = getHesapBakiye(mizanHesaplari, '131');

  // Ortaklara Borçlar (331)
  const ortakBorc = Math.abs(getHesapBakiye(mizanHesaplari, '331'));

  // Sermaye (500)
  const sermaye = Math.abs(getHesapBakiye(mizanHesaplari, '500'));

  // Net Satışlar (600)
  const netSatislar = Math.abs(getHesapBakiye(mizanHesaplari, '600'));

  // SMM (621)
  const smm = Math.abs(getHesapBakiye(mizanHesaplari, '621'));

  // Brüt Kar
  const brutKar = netSatislar - smm;

  // Faaliyet Giderleri (63x)
  const faaliyetGiderleri =
    Math.abs(getHesapBakiye(mizanHesaplari, '630')) +
    Math.abs(getHesapBakiye(mizanHesaplari, '631')) +
    Math.abs(getHesapBakiye(mizanHesaplari, '632'));

  // Faaliyet Karı
  const faaliyetKari = brutKar - faaliyetGiderleri;

  // Finansman Giderleri (660)
  const finansmanGideri = Math.abs(getHesapBakiye(mizanHesaplari, '660'));

  // Net Kar (590)
  const netKar = Math.abs(getHesapBakiye(mizanHesaplari, '590'));

  // Amortisman (730-731) - FAVÖK için
  const amortisman =
    Math.abs(getHesapBakiye(mizanHesaplari, '730')) +
    Math.abs(getHesapBakiye(mizanHesaplari, '731'));

  // FAVÖK (EBITDA)
  const favok = faaliyetKari + amortisman;

  // Net Çalışma Sermayesi
  const netCalismaSermayesi = donenVarliklar - kisaVadeliBorclar;

  return {
    donenVarliklar,
    duranVarliklar,
    toplamAktif,
    kisaVadeliBorclar,
    uzunVadeliBorclar,
    toplamBorclar,
    ozkaynaklar,
    kasa,
    bankalar,
    hazirDegerler,
    stoklar,
    ticariAlacaklar,
    ticariBorclar,
    ortakAlacak,
    ortakBorc,
    sermaye,
    netSatislar,
    smm,
    brutKar,
    faaliyetGiderleri,
    faaliyetKari,
    finansmanGideri,
    netKar,
    amortisman,
    favok,
    netCalismaSermayesi,
  };
};

/**
 * Tüm oranları hesapla
 */
export const analyzeFinansalOranlar = (
  input: OranAnalyzInput
): OranAnalyzOutput => {
  const { mizanHesaplari, oncekiDonemStok, oncekiDonemAlacak, oncekiDonemBorc } =
    input;
  const degerler = hesaplaTemelDegerler(mizanHesaplari);

  const hesaplananOranlar: HesaplanmisOran[] = [];

  // Ortalama stok (önceki dönem varsa)
  const ortalamaStok = oncekiDonemStok
    ? (degerler.stoklar + oncekiDonemStok) / 2
    : degerler.stoklar;

  // Ortalama alacak
  const ortalamaAlacak = oncekiDonemAlacak
    ? (degerler.ticariAlacaklar + oncekiDonemAlacak) / 2
    : degerler.ticariAlacaklar;

  // Ortalama borç
  const ortalamaBorc = oncekiDonemBorc
    ? (degerler.ticariBorclar + oncekiDonemBorc) / 2
    : degerler.ticariBorclar;

  // Her oran için hesaplama
  for (const [oranId, oranDef] of Object.entries(FINANSAL_ORANLAR)) {
    let deger: number | null = null;
    const kanitlar: Kanit[] = [];

    // Oran hesaplama
    switch (oranId) {
      case 'LIK-01': // Cari Oran
        if (degerler.kisaVadeliBorclar > 0) {
          deger = degerler.donenVarliklar / degerler.kisaVadeliBorclar;
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Dönen Varlıklar',
            deger: degerler.donenVarliklar,
          });
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Kısa Vadeli Borçlar',
            deger: degerler.kisaVadeliBorclar,
          });
        }
        break;

      case 'LIK-02': // Likidite Oranı
        if (degerler.kisaVadeliBorclar > 0) {
          deger =
            (degerler.donenVarliklar - degerler.stoklar) /
            degerler.kisaVadeliBorclar;
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Dönen Varlıklar - Stoklar',
            deger: degerler.donenVarliklar - degerler.stoklar,
          });
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Kısa Vadeli Borçlar',
            deger: degerler.kisaVadeliBorclar,
          });
        }
        break;

      case 'LIK-03': // Nakit Oranı
        if (degerler.kisaVadeliBorclar > 0) {
          deger = degerler.hazirDegerler / degerler.kisaVadeliBorclar;
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Hazır Değerler',
            deger: degerler.hazirDegerler,
          });
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Kısa Vadeli Borçlar',
            deger: degerler.kisaVadeliBorclar,
          });
        }
        break;

      case 'LIK-04': // Kasa/Aktif Oranı
        if (degerler.toplamAktif > 0) {
          deger = degerler.kasa / degerler.toplamAktif;
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Kasa',
            deger: degerler.kasa,
          });
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Toplam Aktif',
            deger: degerler.toplamAktif,
          });
        }
        break;

      case 'FAA-01': // Stok Devir Hızı
        if (ortalamaStok > 0) {
          deger = degerler.smm / ortalamaStok;
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'SMM',
            deger: degerler.smm,
          });
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Ortalama Stok',
            deger: ortalamaStok,
          });
        }
        break;

      case 'FAA-02': // Ortalama Stok Süresi
        if (ortalamaStok > 0 && degerler.smm > 0) {
          const stokDevir = degerler.smm / ortalamaStok;
          deger = 365 / stokDevir;
        }
        break;

      case 'FAA-03': // Alacak Devir Hızı
        if (ortalamaAlacak > 0) {
          deger = degerler.netSatislar / ortalamaAlacak;
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Net Satışlar',
            deger: degerler.netSatislar,
          });
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Ortalama Alacaklar',
            deger: ortalamaAlacak,
          });
        }
        break;

      case 'FAA-04': // Ortalama Tahsilat Süresi
        if (ortalamaAlacak > 0 && degerler.netSatislar > 0) {
          const alacakDevir = degerler.netSatislar / ortalamaAlacak;
          deger = 365 / alacakDevir;
        }
        break;

      case 'FAA-05': // Borç Devir Hızı
        if (ortalamaBorc > 0) {
          deger = degerler.smm / ortalamaBorc;
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'SMM',
            deger: degerler.smm,
          });
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Ortalama Borçlar',
            deger: ortalamaBorc,
          });
        }
        break;

      case 'FAA-06': // Ortalama Ödeme Süresi
        if (ortalamaBorc > 0 && degerler.smm > 0) {
          const borcDevir = degerler.smm / ortalamaBorc;
          deger = 365 / borcDevir;
        }
        break;

      case 'FAA-07': // Net Çalışma Sermayesi Devir Hızı
        if (degerler.netCalismaSermayesi > 0) {
          deger = degerler.netSatislar / degerler.netCalismaSermayesi;
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Net Satışlar',
            deger: degerler.netSatislar,
          });
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Net Çalışma Sermayesi',
            deger: degerler.netCalismaSermayesi,
          });
        }
        break;

      case 'FAA-08': // Aktif Devir Hızı
        if (degerler.toplamAktif > 0) {
          deger = degerler.netSatislar / degerler.toplamAktif;
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Net Satışlar',
            deger: degerler.netSatislar,
          });
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Toplam Aktif',
            deger: degerler.toplamAktif,
          });
        }
        break;

      case 'MAL-01': // Borç/Özkaynak
        if (degerler.ozkaynaklar > 0) {
          deger = degerler.toplamBorclar / degerler.ozkaynaklar;
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Toplam Borçlar',
            deger: degerler.toplamBorclar,
          });
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Özkaynaklar',
            deger: degerler.ozkaynaklar,
          });
        }
        break;

      case 'MAL-02': // Kaldıraç Oranı
        if (degerler.toplamAktif > 0) {
          deger = degerler.toplamBorclar / degerler.toplamAktif;
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Toplam Borçlar',
            deger: degerler.toplamBorclar,
          });
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Toplam Aktif',
            deger: degerler.toplamAktif,
          });
        }
        break;

      case 'MAL-03': // Özkaynak Oranı
        if (degerler.toplamAktif > 0) {
          deger = degerler.ozkaynaklar / degerler.toplamAktif;
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Özkaynaklar',
            deger: degerler.ozkaynaklar,
          });
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Toplam Aktif',
            deger: degerler.toplamAktif,
          });
        }
        break;

      case 'MAL-04': // Ortaklardan Alacaklar/Sermaye
        if (degerler.sermaye > 0) {
          deger = degerler.ortakAlacak / degerler.sermaye;
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Ortaklardan Alacaklar',
            deger: degerler.ortakAlacak,
          });
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Sermaye',
            deger: degerler.sermaye,
          });
        }
        break;

      case 'MAL-05': // Ortaklara Borçlar/Özkaynak
        if (degerler.ozkaynaklar > 0) {
          deger = degerler.ortakBorc / degerler.ozkaynaklar;
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Ortaklara Borçlar',
            deger: degerler.ortakBorc,
          });
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Özkaynaklar',
            deger: degerler.ozkaynaklar,
          });
        }
        break;

      case 'MAL-06': // Kısa Vadeli Borç/Toplam Borç
        if (degerler.toplamBorclar > 0) {
          deger = degerler.kisaVadeliBorclar / degerler.toplamBorclar;
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Kısa Vadeli Borçlar',
            deger: degerler.kisaVadeliBorclar,
          });
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Toplam Borçlar',
            deger: degerler.toplamBorclar,
          });
        }
        break;

      case 'MAL-07': // Finansman Gideri/Satış
        if (degerler.netSatislar > 0) {
          deger = degerler.finansmanGideri / degerler.netSatislar;
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Finansman Giderleri',
            deger: degerler.finansmanGideri,
          });
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Net Satışlar',
            deger: degerler.netSatislar,
          });
        }
        break;

      case 'KAR-01': // Brüt Kar Marjı
        if (degerler.netSatislar > 0) {
          deger = degerler.brutKar / degerler.netSatislar;
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Brüt Kar',
            deger: degerler.brutKar,
          });
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Net Satışlar',
            deger: degerler.netSatislar,
          });
        }
        break;

      case 'KAR-02': // Faaliyet Kar Marjı
        if (degerler.netSatislar > 0) {
          deger = degerler.faaliyetKari / degerler.netSatislar;
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Faaliyet Karı',
            deger: degerler.faaliyetKari,
          });
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Net Satışlar',
            deger: degerler.netSatislar,
          });
        }
        break;

      case 'KAR-03': // Net Kar Marjı
        if (degerler.netSatislar > 0) {
          deger = degerler.netKar / degerler.netSatislar;
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Net Kar',
            deger: degerler.netKar,
          });
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Net Satışlar',
            deger: degerler.netSatislar,
          });
        }
        break;

      case 'KAR-04': // ROA
        if (degerler.toplamAktif > 0) {
          deger = degerler.netKar / degerler.toplamAktif;
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Net Kar',
            deger: degerler.netKar,
          });
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Toplam Aktif',
            deger: degerler.toplamAktif,
          });
        }
        break;

      case 'KAR-05': // ROE
        if (degerler.ozkaynaklar > 0) {
          deger = degerler.netKar / degerler.ozkaynaklar;
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Net Kar',
            deger: degerler.netKar,
          });
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Özkaynaklar',
            deger: degerler.ozkaynaklar,
          });
        }
        break;

      case 'KAR-06': // FAVÖK Marjı
        if (degerler.netSatislar > 0) {
          deger = degerler.favok / degerler.netSatislar;
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'FAVÖK',
            deger: degerler.favok,
          });
          kanitlar.push({
            tip: 'HESAP',
            aciklama: 'Net Satışlar',
            deger: degerler.netSatislar,
          });
        }
        break;
    }

    // Oran hesaplandıysa sonuç oluştur
    if (deger !== null) {
      const tersOran = [
        'LIK-01',
        'LIK-02',
        'LIK-03',
        'FAA-01',
        'FAA-03',
        'KAR-01',
        'KAR-02',
        'KAR-03',
        'KAR-04',
        'KAR-05',
        'KAR-06',
        'MAL-03',
      ].includes(oranId);
      const seviye = belirleRiskSeviyesi(
        deger,
        oranDef.normalAralik.min,
        oranDef.normalAralik.max,
        tersOran
      );
      const yorum = secYorum(
        deger,
        oranDef.normalAralik.min,
        oranDef.normalAralik.max,
        oranDef.yorumlar
      );

      hesaplananOranlar.push({
        oranId,
        oranAd: oranDef.ad,
        kategori: oranDef.kategori,
        deger,
        birim: oranDef.birim,
        normalMin: oranDef.normalAralik.min,
        normalMax: oranDef.normalAralik.max,
        seviye,
        yorum,
        vdkKKodu: oranDef.vdkKKodu,
        vdkRiski: oranDef.vdkKKodu !== undefined && seviye !== 'DUSUK',
        formul: oranDef.formul,
        kanitlar,
      });
    }
  }

  // Kategori özetleri
  const hesaplaKategoriOzet = (kategori: OranKategorisi): KategoriOzet => {
    const kategoriOranlar = hesaplananOranlar.filter(
      (o) => o.kategori === kategori
    );
    const sorunluOranlar = kategoriOranlar.filter((o) => o.seviye !== 'DUSUK');

    let ortalamaSeviye: RiskSeviyesi = 'DUSUK';
    if (sorunluOranlar.some((o) => o.seviye === 'KRITIK'))
      ortalamaSeviye = 'KRITIK';
    else if (sorunluOranlar.some((o) => o.seviye === 'YUKSEK'))
      ortalamaSeviye = 'YUKSEK';
    else if (sorunluOranlar.length > 0) ortalamaSeviye = 'ORTA';

    return {
      kategori,
      toplamOran: kategoriOranlar.length,
      sorunluOran: sorunluOranlar.length,
      ortalamaSeviye,
    };
  };

  const likiditeOzet = hesaplaKategoriOzet('LIKIDITE');
  const faaliyetOzet = hesaplaKategoriOzet('FAALIYET');
  const maliYapiOzet = hesaplaKategoriOzet('MALI_YAPI');
  const karlilikOzet = hesaplaKategoriOzet('KARLILIK');

  // Sorunlu ve VDK riskli oranları say
  const sorunluOranlar = hesaplananOranlar.filter((o) => o.seviye !== 'DUSUK');
  const vdkRiskliOranlar = hesaplananOranlar.filter((o) => o.vdkRiski);

  // Genel risk seviyesi
  let genelRiskSeviyesi: RiskSeviyesi;
  if (hesaplananOranlar.some((o) => o.seviye === 'KRITIK'))
    genelRiskSeviyesi = 'KRITIK';
  else if (
    vdkRiskliOranlar.length >= 2 ||
    sorunluOranlar.filter((o) => o.seviye === 'YUKSEK').length >= 2
  )
    genelRiskSeviyesi = 'YUKSEK';
  else if (sorunluOranlar.length >= 3) genelRiskSeviyesi = 'ORTA';
  else genelRiskSeviyesi = 'DUSUK';

  // Özet mesaj
  let ozetMesaj = '';
  if (genelRiskSeviyesi === 'KRITIK') {
    ozetMesaj = `KRİTİK: ${vdkRiskliOranlar.length} adet VDK riskli oran tespit edildi!`;
  } else if (genelRiskSeviyesi === 'YUKSEK') {
    ozetMesaj = `UYARI: Bazı oranlarda VDK dikkatini çekebilecek sapmalar var.`;
  } else if (genelRiskSeviyesi === 'ORTA') {
    ozetMesaj = `ORTA: Bazı oranlarda normal aralık dışı değerler var.`;
  } else {
    ozetMesaj = `DÜŞÜK RİSK: Finansal oranlar genel olarak normal aralıkta.`;
  }

  return {
    toplamOran: ORAN_ISTATISTIK.toplamOran,
    hesaplananOran: hesaplananOranlar.length,
    sorunluOran: sorunluOranlar.length,
    vdkRiskliOran: vdkRiskliOranlar.length,
    oranlar: hesaplananOranlar,
    likiditeOzet,
    faaliyetOzet,
    maliYapiOzet,
    karlilikOzet,
    genelRiskSeviyesi,
    ozetMesaj,
  };
};

/**
 * Oran değerini formatlı string'e çevir
 */
export const formatOranDeger = (deger: number, birim: string): string => {
  switch (birim) {
    case '%':
      return `${(deger * 100).toFixed(1)}%`;
    case 'x':
      return `${deger.toFixed(2)}x`;
    case 'gun':
      return `${Math.round(deger)} gün`;
    case 'TL':
      return `${deger.toLocaleString('tr-TR')} TL`;
    default:
      return deger.toFixed(2);
  }
};

/**
 * Seviye rengini döndür
 */
export const getOranSeviyeRenk = (seviye: RiskSeviyesi): string => {
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

/**
 * Kategori ikonunu döndür
 */
export const getKategoriIkon = (kategori: OranKategorisi): string => {
  switch (kategori) {
    case 'LIKIDITE':
      return '💧';
    case 'FAALIYET':
      return '⚙️';
    case 'MALI_YAPI':
      return '🏛️';
    case 'KARLILIK':
      return '📈';
    default:
      return '📊';
  }
};
