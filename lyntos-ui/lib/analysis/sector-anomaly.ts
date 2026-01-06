/**
 * Sektörel Anomali Tespit Motoru
 *
 * Mukellef finansal oranlarini sektor benchmark'lari ile karsilastirir.
 * VDK risk analizinde kullanilmak uzere sapmalari tespit eder.
 */

import type { RiskSeviyesi, MizanHesapInput } from '../types/vdk-types';
import {
  type SektorBenchmark,
  type SapmaSonucu,
  type OranAralik,
  SEKTOR_BENCHMARKS,
  hesaplaSapma,
  sapmaRiskSeviyesi,
} from './sector-benchmarks';

// Mukellef finansal oranlari
export interface MukellefOranlari {
  brutKarMarji?: number;
  netKarMarji?: number;
  cariOran?: number;
  asitTestOrani?: number;
  stokDevirHizi?: number;
  alacakDevirHizi?: number;
  borcDevirHizi?: number;
  kasaAktifOrani?: number;
  ortakCariFaizOrani?: number;
  kdvYukuOrani?: number;
  giderHasilatOrani?: number;
  finansmanGiderOrani?: number;
}

// Anomali tespit inputu
export interface AnomaliTespitInput {
  vkn: string;
  donem: string;
  naceKodu: string;
  oranlar: MukellefOranlari;
  mizanVerileri?: MizanHesapInput[];
}

// Anomali tespit outputu
export interface AnomaliTespitOutput {
  vkn: string;
  donem: string;
  naceKodu: string;
  sektorAdi: string;
  analizEdilen: number;
  normalSayisi: number;
  sapmaSayisi: number;
  kritikSapmaSayisi: number;
  toplamRiskPuani: number;
  ortalamaRiskPuani: number;
  genelRiskSeviyesi: RiskSeviyesi;
  sapmalar: SapmaSonucu[];
  ozetMesaj: string;
  oneriler: string[];
}

// Oran tanimlari
interface OranTanim {
  key: keyof MukellefOranlari;
  ad: string;
  benchmarkKey: keyof SektorBenchmark;
  aciklamaAltinda: string;
  aciklamaUstunde: string;
  riskCarpani: number; // Bazi oranlarin sapmasi daha kritik
}

const ORAN_TANIMLARI: OranTanim[] = [
  {
    key: 'brutKarMarji',
    ad: 'Brüt Kar Marjı',
    benchmarkKey: 'brutKarMarji',
    aciklamaAltinda: 'Sektör ortalamasının altında brüt kar - maliyet yapısı veya fiyatlama sorunu olabilir',
    aciklamaUstunde: 'Sektör ortalamasının üstünde brüt kar - fatura düzeni veya maliyet eksikliği sorgulanabilir',
    riskCarpani: 1.2,
  },
  {
    key: 'netKarMarji',
    ad: 'Net Kar Marjı',
    benchmarkKey: 'netKarMarji',
    aciklamaAltinda: 'Düşük net kar - gider yapısı veya kayıt dışı incelenebilir',
    aciklamaUstunde: 'Yüksek net kar - gider eksikliği veya belge sorunu olabilir',
    riskCarpani: 1.3,
  },
  {
    key: 'cariOran',
    ad: 'Cari Oran',
    benchmarkKey: 'cariOran',
    aciklamaAltinda: 'Düşük likidite - ödeme güçlüğü riski',
    aciklamaUstunde: 'Aşırı yüksek cari oran - varlık verimsizliği',
    riskCarpani: 0.8,
  },
  {
    key: 'asitTestOrani',
    ad: 'Asit Test Oranı',
    benchmarkKey: 'asitTestOrani',
    aciklamaAltinda: 'Stoğa bağımlı likidite - nakit akış riski',
    aciklamaUstunde: 'Stoksuz yüksek likidite - sektör dışı faaliyet şüphesi',
    riskCarpani: 0.8,
  },
  {
    key: 'stokDevirHizi',
    ad: 'Stok Devir Hızı',
    benchmarkKey: 'stokDevirHizi',
    aciklamaAltinda: 'Yavaş stok devri - değer düşüklüğü veya fire riski',
    aciklamaUstunde: 'Çok hızlı stok devri - stok kayıt dışılığı sorgulanabilir',
    riskCarpani: 1.0,
  },
  {
    key: 'alacakDevirHizi',
    ad: 'Alacak Devir Hızı',
    benchmarkKey: 'alacakDevirHizi',
    aciklamaAltinda: 'Yavaş tahsilat - şüpheli alacak riski',
    aciklamaUstunde: 'Çok hızlı tahsilat - nakit satış ağırlıklı (kayıt dışı riski)',
    riskCarpani: 1.0,
  },
  {
    key: 'borcDevirHizi',
    ad: 'Borç Devir Hızı',
    benchmarkKey: 'borcDevirHizi',
    aciklamaAltinda: 'Yavaş ödeme - tedarikçi ilişki sorunu',
    aciklamaUstunde: 'Çok hızlı ödeme - ortaklardan kaynak kullanımı şüphesi',
    riskCarpani: 0.9,
  },
  {
    key: 'kasaAktifOrani',
    ad: 'Kasa/Aktif Oranı',
    benchmarkKey: 'kasaAktifOrani',
    aciklamaAltinda: 'Düşük kasa - normal, risk yok',
    aciklamaUstunde: 'Yüksek kasa - K-01 riski, nakit yönetim sorunu',
    riskCarpani: 1.5, // VDK K-01 ile doğrudan ilişkili
  },
  {
    key: 'ortakCariFaizOrani',
    ad: 'Ortak Cari Faiz Oranı',
    benchmarkKey: 'ortakCariFaizOrani',
    aciklamaAltinda: 'Düşük ortak cari faizi - normal',
    aciklamaUstunde: 'Yüksek ortak borçlanması - K-05 örtülü sermaye riski',
    riskCarpani: 1.4, // VDK K-05 ile doğrudan ilişkili
  },
  {
    key: 'kdvYukuOrani',
    ad: 'KDV Yükü Oranı',
    benchmarkKey: 'kdvYukuOrani',
    aciklamaAltinda: 'Düşük KDV yükü - indirim fazlalığı, sahte fatura riski',
    aciklamaUstunde: 'Yüksek KDV yükü - indirim yetersizliği (normal olabilir)',
    riskCarpani: 1.3, // VDK öncelikli
  },
  {
    key: 'giderHasilatOrani',
    ad: 'Gider/Hasılat Oranı',
    benchmarkKey: 'giderHasilatOrani',
    aciklamaAltinda: 'Düşük gider - belgelendirilmemiş gider, kayıt dışı satış şüphesi',
    aciklamaUstunde: 'Yüksek gider - fiktif gider veya verimsizlik',
    riskCarpani: 1.2,
  },
  {
    key: 'finansmanGiderOrani',
    ad: 'Finansman Gideri Oranı',
    benchmarkKey: 'finansmanGiderOrani',
    aciklamaAltinda: 'Düşük finansman gideri - normal',
    aciklamaUstunde: 'Yüksek finansman gideri - örtülü sermaye veya transfer fiyatlandırma riski',
    riskCarpani: 1.1,
  },
];

/**
 * Mizandan oranlari hesapla
 */
export const hesaplaMizanOranlari = (mizan: MizanHesapInput[]): MukellefOranlari => {
  const getHesap = (kod: string): number => {
    const hesap = mizan.find((h) => h.kod === kod);
    return hesap ? Math.abs(hesap.bakiye) : 0;
  };

  const getGrup = (prefix: string): number => {
    return mizan
      .filter((h) => h.kod.startsWith(prefix))
      .reduce((sum, h) => sum + Math.abs(h.bakiye), 0);
  };

  // Temel kalemler
  const kasa = getHesap('100');
  const bankalar = getHesap('102');
  const ticariAlacaklar = getGrup('12');
  const stoklar = getGrup('15');
  const donenVarliklar = getGrup('1');
  const duranVarliklar = getGrup('2');
  const toplamAktif = donenVarliklar + duranVarliklar;

  const kisaVadeliBorc = getGrup('3');
  const uzunVadeliBorc = getGrup('4');
  const ortakBorclari = getHesap('331') + getHesap('431');
  const ozkaynak = getGrup('5');

  const netSatislar = getHesap('600');
  const satisMaliyeti = getHesap('620') + getHesap('621') + getHesap('622');
  const brutKar = netSatislar - satisMaliyeti;
  const faaaliyetGiderleri = getGrup('63') + getGrup('64') + getGrup('65') + getGrup('66');
  const finansmanGideri = getHesap('660') + getHesap('661');
  const donemKari = getHesap('590') || getHesap('690');

  const kdvHesaplanan = getHesap('391');
  const kdvIndirilecek = getHesap('191');

  // Oranlar
  const oranlar: MukellefOranlari = {};

  if (netSatislar > 0) {
    oranlar.brutKarMarji = (brutKar / netSatislar) * 100;
    oranlar.netKarMarji = (donemKari / netSatislar) * 100;
    oranlar.giderHasilatOrani = (faaaliyetGiderleri / netSatislar) * 100;
    oranlar.finansmanGiderOrani = (finansmanGideri / netSatislar) * 100;
    oranlar.kdvYukuOrani = ((kdvHesaplanan - kdvIndirilecek) / netSatislar) * 100;
  }

  if (kisaVadeliBorc > 0) {
    oranlar.cariOran = donenVarliklar / kisaVadeliBorc;
    oranlar.asitTestOrani = (donenVarliklar - stoklar) / kisaVadeliBorc;
  }

  if (stoklar > 0 && satisMaliyeti > 0) {
    oranlar.stokDevirHizi = satisMaliyeti / stoklar;
  }

  if (ticariAlacaklar > 0 && netSatislar > 0) {
    oranlar.alacakDevirHizi = netSatislar / ticariAlacaklar;
  }

  if (kisaVadeliBorc > 0 && satisMaliyeti > 0) {
    oranlar.borcDevirHizi = satisMaliyeti / kisaVadeliBorc;
  }

  if (toplamAktif > 0) {
    oranlar.kasaAktifOrani = ((kasa + bankalar) / toplamAktif) * 100;
  }

  if (ozkaynak > 0) {
    oranlar.ortakCariFaizOrani = (ortakBorclari / ozkaynak) * 100;
  }

  return oranlar;
};

/**
 * Tek bir oran icin sapma analizi yap
 */
const analizOran = (
  tanim: OranTanim,
  mukellefDegeri: number | undefined,
  benchmark: SektorBenchmark
): SapmaSonucu | null => {
  if (mukellefDegeri === undefined || mukellefDegeri === null) return null;

  const aralik = benchmark[tanim.benchmarkKey] as OranAralik;
  if (!aralik) return null;

  const { sapmaYuzdesi, sapmaTuru } = hesaplaSapma(mukellefDegeri, aralik);
  const temelRisk = sapmaRiskSeviyesi(sapmaYuzdesi, sapmaTuru);

  // Risk carpani uygula
  let riskSeviyesi = temelRisk;
  if (tanim.riskCarpani > 1.2 && sapmaYuzdesi > 30) {
    if (temelRisk === 'ORTA') riskSeviyesi = 'YUKSEK';
    else if (temelRisk === 'YUKSEK') riskSeviyesi = 'KRITIK';
  }

  const aciklama =
    sapmaTuru === 'ALTINDA'
      ? tanim.aciklamaAltinda
      : sapmaTuru === 'USTUNDE'
        ? tanim.aciklamaUstunde
        : 'Sektör ortalaması dahilinde';

  return {
    oranAdi: tanim.ad,
    mukellefDegeri: Math.round(mukellefDegeri * 100) / 100,
    sektorMin: aralik.min,
    sektorMax: aralik.max,
    sektorOrtalama: aralik.ortalama,
    sapmaYuzdesi,
    sapmaTuru,
    riskSeviyesi,
    aciklama,
  };
};

/**
 * Sektorel anomali tespiti ana fonksiyonu
 */
export const detectSektorelAnomali = (input: AnomaliTespitInput): AnomaliTespitOutput => {
  const benchmark = SEKTOR_BENCHMARKS[input.naceKodu];

  if (!benchmark) {
    return {
      vkn: input.vkn,
      donem: input.donem,
      naceKodu: input.naceKodu,
      sektorAdi: 'Bilinmeyen Sektör',
      analizEdilen: 0,
      normalSayisi: 0,
      sapmaSayisi: 0,
      kritikSapmaSayisi: 0,
      toplamRiskPuani: 0,
      ortalamaRiskPuani: 0,
      genelRiskSeviyesi: 'DUSUK',
      sapmalar: [],
      ozetMesaj: `NACE kodu ${input.naceKodu} için benchmark verisi bulunamadı`,
      oneriler: ['Sektör kodunu kontrol edin veya yakın bir sektör seçin'],
    };
  }

  // Mizandan oranlar hesapla (varsa)
  let oranlar = input.oranlar;
  if (input.mizanVerileri && input.mizanVerileri.length > 0) {
    const mizanOranlari = hesaplaMizanOranlari(input.mizanVerileri);
    oranlar = { ...mizanOranlari, ...input.oranlar }; // Manuel girilenler oncelikli
  }

  // Tum oranlari analiz et
  const sapmalar: SapmaSonucu[] = [];
  for (const tanim of ORAN_TANIMLARI) {
    const deger = oranlar[tanim.key];
    const sonuc = analizOran(tanim, deger, benchmark);
    if (sonuc) {
      sapmalar.push(sonuc);
    }
  }

  // Istatistikler
  const analizEdilen = sapmalar.length;
  const normalSayisi = sapmalar.filter((s) => s.sapmaTuru === 'NORMAL').length;
  const sapmaSayisi = sapmalar.filter((s) => s.sapmaTuru !== 'NORMAL').length;
  const kritikSapmaSayisi = sapmalar.filter(
    (s) => s.riskSeviyesi === 'KRITIK' || s.riskSeviyesi === 'YUKSEK'
  ).length;

  // Risk puani hesapla
  const RISK_PUAN: Record<RiskSeviyesi, number> = {
    DUSUK: 10,
    ORTA: 40,
    YUKSEK: 70,
    KRITIK: 100,
  };

  const toplamRiskPuani = sapmalar
    .filter((s) => s.sapmaTuru !== 'NORMAL')
    .reduce((sum, s) => sum + RISK_PUAN[s.riskSeviyesi], 0);

  const ortalamaRiskPuani =
    sapmaSayisi > 0 ? Math.round(toplamRiskPuani / sapmaSayisi) : 0;

  // Genel risk seviyesi
  let genelRiskSeviyesi: RiskSeviyesi;
  if (kritikSapmaSayisi >= 3 || ortalamaRiskPuani >= 80) {
    genelRiskSeviyesi = 'KRITIK';
  } else if (kritikSapmaSayisi >= 1 || ortalamaRiskPuani >= 60) {
    genelRiskSeviyesi = 'YUKSEK';
  } else if (sapmaSayisi >= 4 || ortalamaRiskPuani >= 35) {
    genelRiskSeviyesi = 'ORTA';
  } else {
    genelRiskSeviyesi = 'DUSUK';
  }

  // Ozet mesaj
  let ozetMesaj: string;
  if (genelRiskSeviyesi === 'KRITIK') {
    ozetMesaj = `KRİTİK: ${kritikSapmaSayisi} kritik sapma tespit edildi. VDK incelemesi olasılığı yüksek!`;
  } else if (genelRiskSeviyesi === 'YUKSEK') {
    ozetMesaj = `UYARI: Sektör ortalamalarından ${sapmaSayisi} önemli sapma mevcut.`;
  } else if (genelRiskSeviyesi === 'ORTA') {
    ozetMesaj = `ORTA RİSK: Bazı finansal oranlarda sektör dışı değerler görülüyor.`;
  } else {
    ozetMesaj = `DÜŞÜK RİSK: Finansal oranlar genel olarak sektör ortalamaları dahilinde.`;
  }

  // Oneriler
  const oneriler: string[] = [];
  const kritikSapmalar = sapmalar.filter((s) => s.riskSeviyesi === 'KRITIK');
  const yuksekSapmalar = sapmalar.filter((s) => s.riskSeviyesi === 'YUKSEK');

  kritikSapmalar.forEach((s) => {
    oneriler.push(`${s.oranAdi}: ${s.aciklama}`);
  });

  yuksekSapmalar.slice(0, 3).forEach((s) => {
    if (oneriler.length < 5) {
      oneriler.push(`${s.oranAdi}: ${s.aciklama}`);
    }
  });

  // Sektor ozel riskleri ekle
  if (kritikSapmaSayisi > 0 && benchmark.ozelRiskler.length > 0) {
    oneriler.push(`Sektöre özel dikkat: ${benchmark.ozelRiskler[0]}`);
  }

  return {
    vkn: input.vkn,
    donem: input.donem,
    naceKodu: input.naceKodu,
    sektorAdi: benchmark.sektorAdi,
    analizEdilen,
    normalSayisi,
    sapmaSayisi,
    kritikSapmaSayisi,
    toplamRiskPuani,
    ortalamaRiskPuani,
    genelRiskSeviyesi,
    sapmalar,
    ozetMesaj,
    oneriler,
  };
};

/**
 * Sektor anomali risk rengini dondur
 */
export const getAnomaliRiskRenk = (seviye: RiskSeviyesi): string => {
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
 * Sapma turu badge rengi
 */
export const getSapmaTuruRenk = (tur: 'ALTINDA' | 'NORMAL' | 'USTUNDE'): string => {
  switch (tur) {
    case 'ALTINDA':
      return 'blue';
    case 'NORMAL':
      return 'green';
    case 'USTUNDE':
      return 'red';
    default:
      return 'gray';
  }
};

/**
 * Sapma turu Turkce aciklama
 */
export const getSapmaTuruAciklama = (tur: 'ALTINDA' | 'NORMAL' | 'USTUNDE'): string => {
  switch (tur) {
    case 'ALTINDA':
      return 'Sektör minimumunun altında';
    case 'NORMAL':
      return 'Sektör ortalaması dahilinde';
    case 'USTUNDE':
      return 'Sektör maksimumunun üstünde';
    default:
      return 'Bilinmiyor';
  }
};
