/**
 * VDK Kural Motoru
 *
 * Mizan verilerini VDK K-kodlarina gore degerlendirir.
 * Her kural icin risk seviyesi ve oneri uretir.
 */

import type {
  RuleEngineInput,
  RuleEngineOutput,
  KuralDegerlendirmeSonucu,
  RiskSeviyesi,
  MizanHesapInput,
} from '../types/vdk-types';
import { VDK_K_CODES, K_KODU_ISTATISTIK } from './vdk-k-codes';

/**
 * Mizan verilerinden hesap bakiyesi getir
 */
export const getHesapBakiye = (
  mizanHesaplari: MizanHesapInput[],
  hesapKodu: string
): number => {
  const hesap = mizanHesaplari.find((h) => h.kod === hesapKodu);
  return hesap ? hesap.bakiye : 0;
};

/**
 * Mizan verilerinden hesap grubu toplami getir (orn: 1xx, 2xx)
 */
export const getHesapGrupToplami = (
  mizanHesaplari: MizanHesapInput[],
  prefix: string
): number => {
  return mizanHesaplari
    .filter((h) => h.kod.startsWith(prefix))
    .reduce((sum, h) => sum + Math.abs(h.bakiye), 0);
};

/**
 * Toplam aktif hesapla
 */
export const hesaplaToplamAktif = (mizanHesaplari: MizanHesapInput[]): number => {
  const donenVarliklar = getHesapGrupToplami(mizanHesaplari, '1');
  const duranVarliklar = getHesapGrupToplami(mizanHesaplari, '2');
  return donenVarliklar + duranVarliklar;
};

/**
 * Toplam ozkaynak hesapla
 */
export const hesaplaToplamOzkaynak = (mizanHesaplari: MizanHesapInput[]): number => {
  return getHesapGrupToplami(mizanHesaplari, '5');
};

/**
 * Risk seviyesi belirle
 */
const belirleRiskSeviyesi = (
  deger: number,
  esikUyari: number | undefined,
  esikKritik: number,
  tersOran: boolean = false // Dusuk deger mi kotu?
): RiskSeviyesi => {
  if (tersOran) {
    // Dusuk deger kotu (orn: karlilik)
    if (deger <= esikKritik) return 'KRITIK';
    if (esikUyari !== undefined && deger <= esikUyari) return 'YUKSEK';
    return 'DUSUK';
  } else {
    // Yuksek deger kotu (orn: kasa orani)
    if (deger >= esikKritik) return 'KRITIK';
    if (esikUyari !== undefined && deger >= esikUyari) return 'YUKSEK';
    return 'DUSUK';
  }
};

/**
 * K-01: Yuksek Kasa Bakiyesi kontrolu
 */
const kontrolK01 = (
  mizanHesaplari: MizanHesapInput[]
): KuralDegerlendirmeSonucu | null => {
  const kKodu = VDK_K_CODES['K-01'];
  const kasaBakiye = getHesapBakiye(mizanHesaplari, '100');
  const toplamAktif = hesaplaToplamAktif(mizanHesaplari);

  if (toplamAktif === 0) return null;

  const oran = kasaBakiye / toplamAktif;
  const seviye = belirleRiskSeviyesi(oran, kKodu.esik.uyari, kKodu.esik.kritik);

  if (seviye === 'DUSUK') return null;

  return {
    kuralId: kKodu.kod,
    kuralAd: kKodu.ad,
    deger: oran,
    esikDeger: kKodu.esik.kritik,
    seviye,
    mesaj: `Kasa bakiyesi aktifin %${(oran * 100).toFixed(1)}'i. ${
      seviye === 'KRITIK' ? 'VDK K-09 kriteri asildi!' : 'Takip edilmeli.'
    }`,
    oneri: kKodu.oneri,
    mevzuat: kKodu.mevzuat,
    vdkRiski: true,
    kurganRiski: kKodu.kurganIliskili,
    kanitlar: [
      { tip: 'HESAP', aciklama: '100 Kasa Hesabi', deger: kasaBakiye },
      { tip: 'HESAP', aciklama: 'Toplam Aktif', deger: toplamAktif },
      { tip: 'FORMUL', aciklama: kKodu.formul, deger: `${(oran * 100).toFixed(2)}%` },
      {
        tip: 'ESIK',
        aciklama: 'VDK Esik Degeri',
        deger: `Uyari: %${(kKodu.esik.uyari! * 100)}`,
        kaynak: 'VDK-RAS',
      },
    ],
  };
};

/**
 * K-02: Negatif Kasa Bakiyesi kontrolu
 */
const kontrolK02 = (
  mizanHesaplari: MizanHesapInput[]
): KuralDegerlendirmeSonucu | null => {
  const kKodu = VDK_K_CODES['K-02'];
  const kasaBakiye = getHesapBakiye(mizanHesaplari, '100');

  if (kasaBakiye >= 0) return null;

  return {
    kuralId: kKodu.kod,
    kuralAd: kKodu.ad,
    deger: kasaBakiye,
    esikDeger: 0,
    seviye: 'KRITIK',
    mesaj: `KASA NEGATIF BAKIYE VERIYOR: ${kasaBakiye.toLocaleString('tr-TR')} TL. Bu muhasebe hatasi veya kayit eksikligi gostergesidir.`,
    oneri: kKodu.oneri,
    mevzuat: kKodu.mevzuat,
    vdkRiski: true,
    kurganRiski: kKodu.kurganIliskili,
    kanitlar: [
      { tip: 'HESAP', aciklama: '100 Kasa Hesabi', deger: kasaBakiye },
      { tip: 'ESIK', aciklama: 'Fiziksel Sinir', deger: 'Kasa negatif olamaz' },
      { tip: 'MEVZUAT', aciklama: 'VUK 134', kaynak: 'Vergi Usul Kanunu' },
    ],
  };
};

/**
 * K-03: Banka Hesabi Negatif Bakiye kontrolu
 */
const kontrolK03 = (
  mizanHesaplari: MizanHesapInput[]
): KuralDegerlendirmeSonucu | null => {
  const kKodu = VDK_K_CODES['K-03'];
  const bankaBakiye = getHesapBakiye(mizanHesaplari, '102');

  if (bankaBakiye >= 0) return null;

  const seviye = bankaBakiye <= kKodu.esik.kritik ? 'KRITIK' : 'YUKSEK';

  return {
    kuralId: kKodu.kod,
    kuralAd: kKodu.ad,
    deger: bankaBakiye,
    esikDeger: kKodu.esik.kritik,
    seviye,
    mesaj: `Banka hesabi negatif bakiye veriyor: ${bankaBakiye.toLocaleString('tr-TR')} TL. KMH kullaniliyorsa belgeleyin.`,
    oneri: kKodu.oneri,
    mevzuat: kKodu.mevzuat,
    vdkRiski: false,
    kurganRiski: kKodu.kurganIliskili,
    kanitlar: [
      { tip: 'HESAP', aciklama: '102 Bankalar', deger: bankaBakiye },
      { tip: 'ESIK', aciklama: 'Kritik Sinir', deger: `${kKodu.esik.kritik.toLocaleString('tr-TR')} TL` },
    ],
  };
};

/**
 * K-04: Ortaklardan Alacaklar / Sermaye Orani kontrolu
 */
const kontrolK04 = (
  mizanHesaplari: MizanHesapInput[]
): KuralDegerlendirmeSonucu | null => {
  const kKodu = VDK_K_CODES['K-04'];
  const ortakAlacak = getHesapBakiye(mizanHesaplari, '131');
  const sermaye = Math.abs(getHesapBakiye(mizanHesaplari, '500'));

  if (ortakAlacak <= 0 || sermaye === 0) return null;

  const oran = ortakAlacak / sermaye;
  const seviye = belirleRiskSeviyesi(oran, kKodu.esik.uyari, kKodu.esik.kritik);

  if (seviye === 'DUSUK') return null;

  return {
    kuralId: kKodu.kod,
    kuralAd: kKodu.ad,
    deger: oran,
    esikDeger: kKodu.esik.kritik,
    seviye,
    mesaj: `Ortaklardan alacaklar sermayenin %${(oran * 100).toFixed(1)}'i. ${
      seviye === 'KRITIK' ? 'Ortulu sermaye riski!' : 'Transfer fiyatlandirmasi dikkat.'
    }`,
    oneri: kKodu.oneri,
    mevzuat: kKodu.mevzuat,
    vdkRiski: true,
    kurganRiski: kKodu.kurganIliskili,
    kanitlar: [
      { tip: 'HESAP', aciklama: '131 Ortaklardan Alacaklar', deger: ortakAlacak },
      { tip: 'HESAP', aciklama: '500 Sermaye', deger: sermaye },
      { tip: 'FORMUL', aciklama: kKodu.formul, deger: `${(oran * 100).toFixed(2)}%` },
      { tip: 'MEVZUAT', aciklama: 'KVK 12-13', kaynak: 'Kurumlar Vergisi Kanunu' },
    ],
  };
};

/**
 * K-05: Ortaklara Borclar / Ozkaynak Orani (Ortulu Sermaye) kontrolu
 */
const kontrolK05 = (
  mizanHesaplari: MizanHesapInput[]
): KuralDegerlendirmeSonucu | null => {
  const kKodu = VDK_K_CODES['K-05'];
  const ortakBorc = Math.abs(getHesapBakiye(mizanHesaplari, '331'));
  const toplamOzkaynak = hesaplaToplamOzkaynak(mizanHesaplari);

  if (ortakBorc <= 0 || toplamOzkaynak === 0) return null;

  const oran = ortakBorc / toplamOzkaynak;
  const seviye = belirleRiskSeviyesi(oran, kKodu.esik.uyari, kKodu.esik.kritik);

  if (seviye === 'DUSUK') return null;

  return {
    kuralId: kKodu.kod,
    kuralAd: kKodu.ad,
    deger: oran,
    esikDeger: kKodu.esik.kritik,
    seviye,
    mesaj: `Ortaklara borclar ozkaynaklarin ${oran.toFixed(2)}x kati. ${
      seviye === 'KRITIK'
        ? '3:1 orani asildi - ORTULU SERMAYE!'
        : 'Ortulu sermaye sinirina yaklasiliyor.'
    }`,
    oneri: kKodu.oneri,
    mevzuat: kKodu.mevzuat,
    vdkRiski: true,
    kurganRiski: kKodu.kurganIliskili,
    kanitlar: [
      { tip: 'HESAP', aciklama: '331 Ortaklara Borclar', deger: ortakBorc },
      { tip: 'HESAP', aciklama: 'Toplam Ozkaynaklar', deger: toplamOzkaynak },
      { tip: 'FORMUL', aciklama: kKodu.formul, deger: `${oran.toFixed(2)}x` },
      { tip: 'ESIK', aciklama: 'Ortulu Sermaye Siniri', deger: '3:1 (KVK 12)', kaynak: 'KVK' },
    ],
  };
};

/**
 * K-07: Dusuk Karlilik Orani kontrolu
 */
const kontrolK07 = (
  mizanHesaplari: MizanHesapInput[]
): KuralDegerlendirmeSonucu | null => {
  const kKodu = VDK_K_CODES['K-07'];
  const satislar = Math.abs(getHesapBakiye(mizanHesaplari, '600'));
  const smm = Math.abs(getHesapBakiye(mizanHesaplari, '621'));

  if (satislar === 0) return null;

  const brutKar = satislar - smm;
  const brutKarMarji = brutKar / satislar;

  // Sektor ortalamasi varsayimi: %20 (gercek uygulamada sektor koduna gore degisir)
  const sektorOrtalamasi = 0.2;
  const seviyeOran = brutKarMarji / sektorOrtalamasi;

  if (seviyeOran >= 0.5) return null; // Sektor ortalamasinin en az %50'si

  const seviye: RiskSeviyesi = seviyeOran <= 0.25 ? 'KRITIK' : 'YUKSEK';

  return {
    kuralId: kKodu.kod,
    kuralAd: kKodu.ad,
    deger: brutKarMarji,
    esikDeger: sektorOrtalamasi * 0.5,
    seviye,
    mesaj: `Brut kar marji %${(brutKarMarji * 100).toFixed(1)}. Sektor ortalamasinin %${(
      seviyeOran * 100
    ).toFixed(0)}'i seviyesinde.`,
    oneri: kKodu.oneri,
    mevzuat: kKodu.mevzuat,
    vdkRiski: true,
    kurganRiski: kKodu.kurganIliskili,
    kanitlar: [
      { tip: 'HESAP', aciklama: '600 Yurtici Satislar', deger: satislar },
      { tip: 'HESAP', aciklama: '621 SMM', deger: smm },
      { tip: 'FORMUL', aciklama: 'Brut Kar Marji', deger: `${(brutKarMarji * 100).toFixed(2)}%` },
      {
        tip: 'SEKTOR',
        aciklama: 'Sektor Ortalamasi',
        deger: `${sektorOrtalamasi * 100}%`,
        kaynak: 'VDK Sektorel Analiz',
      },
    ],
  };
};

/**
 * K-12: Yuksek SMM / Satis Orani kontrolu
 */
const kontrolK12 = (
  mizanHesaplari: MizanHesapInput[]
): KuralDegerlendirmeSonucu | null => {
  const kKodu = VDK_K_CODES['K-12'];
  const satislar = Math.abs(getHesapBakiye(mizanHesaplari, '600'));
  const smm = Math.abs(getHesapBakiye(mizanHesaplari, '621'));

  if (satislar === 0) return null;

  const smmOrani = smm / satislar;

  // Sektor ortalamasi varsayimi: %70 (gercek uygulamada sektor koduna gore degisir)
  const sektorOrtalamasi = 0.7;
  const seviyeOran = smmOrani / sektorOrtalamasi;

  if (seviyeOran < kKodu.esik.uyari!) return null;

  const seviye: RiskSeviyesi = seviyeOran >= kKodu.esik.kritik ? 'KRITIK' : 'YUKSEK';

  return {
    kuralId: kKodu.kod,
    kuralAd: kKodu.ad,
    deger: smmOrani,
    esikDeger: sektorOrtalamasi * kKodu.esik.kritik,
    seviye,
    mesaj: `SMM/Satis orani %${(smmOrani * 100).toFixed(1)}. Sektor ortalamasinin ${seviyeOran.toFixed(2)}x kati.`,
    oneri: kKodu.oneri,
    mevzuat: kKodu.mevzuat,
    vdkRiski: true,
    kurganRiski: kKodu.kurganIliskili,
    kanitlar: [
      { tip: 'HESAP', aciklama: '600 Yurtici Satislar', deger: satislar },
      { tip: 'HESAP', aciklama: '621 SMM', deger: smm },
      { tip: 'FORMUL', aciklama: kKodu.formul, deger: `${(smmOrani * 100).toFixed(2)}%` },
      {
        tip: 'SEKTOR',
        aciklama: 'Sektor Ortalamasi',
        deger: `${sektorOrtalamasi * 100}%`,
        kaynak: 'VDK Sektorel Analiz',
      },
    ],
  };
};

/**
 * K-13: Yuksek Alacak Tahsilat Suresi kontrolu
 */
const kontrolK13 = (
  mizanHesaplari: MizanHesapInput[]
): KuralDegerlendirmeSonucu | null => {
  const kKodu = VDK_K_CODES['K-13'];
  const ticariAlacaklar = getHesapBakiye(mizanHesaplari, '120');
  const satislar = Math.abs(getHesapBakiye(mizanHesaplari, '600'));

  if (satislar === 0 || ticariAlacaklar <= 0) return null;

  const tahsilatSuresi = (ticariAlacaklar / satislar) * 365;
  const seviye = belirleRiskSeviyesi(
    tahsilatSuresi,
    kKodu.esik.uyari,
    kKodu.esik.kritik
  );

  if (seviye === 'DUSUK') return null;

  return {
    kuralId: kKodu.kod,
    kuralAd: kKodu.ad,
    deger: tahsilatSuresi,
    esikDeger: kKodu.esik.kritik,
    seviye,
    mesaj: `Ortalama tahsilat suresi ${tahsilatSuresi.toFixed(0)} gun. ${
      seviye === 'KRITIK' ? 'Supheli alacak riski yuksek!' : 'Tahsilat takibini sikilastirin.'
    }`,
    oneri: kKodu.oneri,
    mevzuat: kKodu.mevzuat,
    vdkRiski: false,
    kurganRiski: false,
    kanitlar: [
      { tip: 'HESAP', aciklama: '120 Alicilar', deger: ticariAlacaklar },
      { tip: 'HESAP', aciklama: '600 Yurtici Satislar', deger: satislar },
      { tip: 'FORMUL', aciklama: kKodu.formul, deger: `${tahsilatSuresi.toFixed(0)} gun` },
      {
        tip: 'ESIK',
        aciklama: 'VDK Esik',
        deger: `Uyari: ${kKodu.esik.uyari} gun, Kritik: ${kKodu.esik.kritik} gun`,
      },
    ],
  };
};

/**
 * K-15: Saticilar Hesabi Ters Bakiye kontrolu
 */
const kontrolK15 = (
  mizanHesaplari: MizanHesapInput[]
): KuralDegerlendirmeSonucu | null => {
  const kKodu = VDK_K_CODES['K-15'];
  const saticilarBakiye = getHesapBakiye(mizanHesaplari, '320');

  // 320 hesabi normalde alacak (negatif) bakiye vermeli
  // Borc (pozitif) bakiye veriyorsa sorun var
  if (saticilarBakiye <= 0) return null;

  return {
    kuralId: kKodu.kod,
    kuralAd: kKodu.ad,
    deger: saticilarBakiye,
    esikDeger: 0,
    seviye: 'YUKSEK',
    mesaj: `Saticilar hesabi BORC bakiye veriyor: ${saticilarBakiye.toLocaleString('tr-TR')} TL. Normal degil!`,
    oneri: kKodu.oneri,
    mevzuat: kKodu.mevzuat,
    vdkRiski: false,
    kurganRiski: false,
    kanitlar: [
      { tip: 'HESAP', aciklama: '320 Saticilar', deger: saticilarBakiye },
      { tip: 'ESIK', aciklama: 'Normal Bakiye', deger: 'Alacak (Negatif)' },
    ],
  };
};

/**
 * K-16: Amortisman Uyumsuzlugu kontrolu
 */
const kontrolK16 = (
  mizanHesaplari: MizanHesapInput[]
): KuralDegerlendirmeSonucu | null => {
  const kKodu = VDK_K_CODES['K-16'];

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

  const oran = birAmort / duranVarliklar;

  if (oran <= 1) return null;

  return {
    kuralId: kKodu.kod,
    kuralAd: kKodu.ad,
    deger: oran,
    esikDeger: 1,
    seviye: 'KRITIK',
    mesaj: `Birikmis amortisman duran varliklardan fazla! Oran: ${oran.toFixed(2)}x. Muhasebe hatasi mevcut.`,
    oneri: kKodu.oneri,
    mevzuat: kKodu.mevzuat,
    vdkRiski: true,
    kurganRiski: false,
    kanitlar: [
      { tip: 'HESAP', aciklama: 'Duran Varliklar (250-255)', deger: duranVarliklar },
      { tip: 'HESAP', aciklama: 'Birikmis Amortisman (257-258)', deger: birAmort },
      { tip: 'FORMUL', aciklama: kKodu.formul, deger: `${oran.toFixed(2)}x` },
    ],
  };
};

/**
 * Ana kural motoru fonksiyonu
 */
export const evaluateVdkRules = (input: RuleEngineInput): RuleEngineOutput => {
  const { mizanHesaplari } = input;
  const sonuclar: KuralDegerlendirmeSonucu[] = [];

  // Tum kontrolleri calistir
  const kontrolFonksiyonlari = [
    kontrolK01,
    kontrolK02,
    kontrolK03,
    kontrolK04,
    kontrolK05,
    kontrolK07,
    kontrolK12,
    kontrolK13,
    kontrolK15,
    kontrolK16,
    // Diger kontroller eklenebilir...
  ];

  for (const kontrolFn of kontrolFonksiyonlari) {
    const sonuc = kontrolFn(mizanHesaplari);
    if (sonuc) {
      sonuclar.push(sonuc);
    }
  }

  // Sonuclari kategorize et
  const kritikSonuclar = sonuclar.filter((s) => s.seviye === 'KRITIK');
  const uyariSonuclar = sonuclar.filter((s) => s.seviye === 'YUKSEK');
  const normalSonuclar = sonuclar.filter(
    (s) => s.seviye === 'ORTA' || s.seviye === 'DUSUK'
  );

  // Risk puani hesapla
  const toplamRiskPuani =
    kritikSonuclar.length * 30 +
    uyariSonuclar.length * 15 +
    normalSonuclar.length * 5;

  // Genel risk seviyesi belirle
  let riskSeviyesi: RiskSeviyesi;
  if (kritikSonuclar.length >= 2 || toplamRiskPuani >= 80) {
    riskSeviyesi = 'KRITIK';
  } else if (kritikSonuclar.length >= 1 || toplamRiskPuani >= 50) {
    riskSeviyesi = 'YUKSEK';
  } else if (uyariSonuclar.length >= 2 || toplamRiskPuani >= 30) {
    riskSeviyesi = 'ORTA';
  } else {
    riskSeviyesi = 'DUSUK';
  }

  return {
    toplamRiskPuani: Math.min(toplamRiskPuani, 100),
    riskSeviyesi,
    sonuclar,
    kritikSonuclar,
    uyariSonuclar,
    normalSonuclar,
    ozet: {
      toplamKontrol: K_KODU_ISTATISTIK.toplam,
      kritikSayisi: kritikSonuclar.length,
      uyariSayisi: uyariSonuclar.length,
      normalSayisi: normalSonuclar.length,
    },
  };
};
