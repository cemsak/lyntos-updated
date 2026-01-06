/**
 * KURGAN Puanlama Motoru
 *
 * Islem bazli KURGAN risk puani hesaplar.
 * Mukellefin toplam KURGAN risk profilini olusturur.
 */

import type {
  KurganSenaryo,
  KurganAksiyon,
  RiskSeviyesi,
  MizanHesapInput,
} from '../types/vdk-types';
import { KURGAN_SCENARIOS } from '../rules/kurgan-scenarios';

// Islem tipi
export interface KurganIslem {
  id: string;
  tarih: Date;
  tip: 'ALIS' | 'SATIS' | 'HIZMET' | 'KOMISYON' | 'DIGER';
  tutar: number;
  kdvTutar: number;
  karsiTarafVkn: string;
  karsiTarafUnvan: string;
  karsiTarafRiskli?: boolean;
  faturaTipi: 'E_FATURA' | 'E_ARSIV' | 'KAGIT';
  odemeYontemi?: 'BANKA' | 'NAKIT' | 'CEK' | 'SENET' | 'DIGER';
  odemeTarihi?: Date;
  sevkIrsaliyesiVar?: boolean;
  sozlesmeVar?: boolean;
  aciklama?: string;
}

// Islem risk degerlendirmesi
export interface IslemRiskDegerlendirmesi {
  islemId: string;
  eslestirilenSenaryolar: KurganSenaryo[];
  toplamRiskPuani: number;
  enYuksekAksiyon: KurganAksiyon;
  riskSeviyesi: RiskSeviyesi;
  uyarilar: string[];
  oneriler: string[];
}

// Mukellef KURGAN profili
export interface KurganProfili {
  vkn: string;
  donem: string;
  toplamIslem: number;
  riskliIslemSayisi: number;
  toplamRiskPuani: number;
  ortalamaRiskPuani: number;
  riskSeviyesi: RiskSeviyesi;
  eslestirilenSenaryolar: { senaryo: KurganSenaryo; sayi: number }[];
  enYuksekAksiyon: KurganAksiyon;
  kritikIslemler: IslemRiskDegerlendirmesi[];
  ozetMesaj: string;
  tavsiyeler: string[];
}

// Aksiyon oncelik sirasi
const AKSIYON_ONCELIK: Record<KurganAksiyon, number> = {
  TAKIP: 1,
  BILGI_ISTEME: 2,
  IZAHA_DAVET: 3,
  INCELEME: 4,
};

/**
 * Tek bir islemi KURGAN senaryolarina gore degerlendir
 */
export const evaluateIslem = (
  islem: KurganIslem,
  _mizanVerileri?: MizanHesapInput[],
  _sektorKodu?: string
): IslemRiskDegerlendirmesi => {
  const eslestirilenSenaryolar: KurganSenaryo[] = [];
  const uyarilar: string[] = [];
  const oneriler: string[] = [];

  // KRG-01: Riskli saticidan alim
  if (islem.tip === 'ALIS' && islem.karsiTarafRiskli) {
    eslestirilenSenaryolar.push(KURGAN_SCENARIOS['KRG-01']);
    uyarilar.push(`Riskli satici tespit edildi: ${islem.karsiTarafUnvan}`);
    oneriler.push(
      'Saticinin guncel vergi durumunu GIB sorgulamasindan kontrol edin'
    );
  }

  // KRG-06: Odeme yontemi uyumsuzlugu
  if (islem.tutar >= 7000 && islem.odemeYontemi === 'NAKIT') {
    eslestirilenSenaryolar.push(KURGAN_SCENARIOS['KRG-06']);
    uyarilar.push(
      `7.000 TL uzeri nakit odeme tespit edildi: ${islem.tutar.toLocaleString('tr-TR')} TL`
    );
    oneriler.push(
      'Bu tutardaki odemeleri banka uzerinden yapin ve dekont saklayin'
    );
  }

  // KRG-05: Sevk belgesi eksikligi
  if (islem.tip === 'ALIS' && islem.tutar >= 50000 && !islem.sevkIrsaliyesiVar) {
    eslestirilenSenaryolar.push(KURGAN_SCENARIOS['KRG-05']);
    uyarilar.push('Yuksek tutarli alimda sevk irsaliyesi eksik');
    oneriler.push(
      'Mal alimlarinda mutlaka sevk irsaliyesi, tarti fisi ve tasima belgesi alin'
    );
  }

  // KRG-14: Komisyon/hizmet faturasi riski
  if (islem.tip === 'HIZMET' || islem.tip === 'KOMISYON') {
    const ay = islem.tarih.getMonth();
    if (ay === 11 && !islem.sozlesmeVar) {
      // Aralik ayi
      eslestirilenSenaryolar.push(KURGAN_SCENARIOS['KRG-14']);
      uyarilar.push('Donem sonu hizmet faturasi, sozlesme yok');
      oneriler.push(
        'Hizmet/komisyon faturalarini yazili sozlesme ile destekleyin'
      );
    }
  }

  // KRG-13: Donem sonu anormal hareketler
  const ay = islem.tarih.getMonth();
  const gun = islem.tarih.getDate();
  if (ay === 11 && gun >= 25 && islem.tutar >= 100000) {
    eslestirilenSenaryolar.push(KURGAN_SCENARIOS['KRG-13']);
    uyarilar.push('Yil sonu son hafta yuksek tutarli islem');
    oneriler.push('Donem sonu islemlerinin gercekligini belgeleyin');
  }

  // Toplam risk puani hesapla
  const toplamRiskPuani =
    eslestirilenSenaryolar.length > 0
      ? Math.round(
          eslestirilenSenaryolar.reduce((sum, s) => sum + s.riskPuani, 0) /
            eslestirilenSenaryolar.length
        )
      : 0;

  // En yuksek aksiyon belirle
  const enYuksekAksiyon: KurganAksiyon =
    eslestirilenSenaryolar.length > 0
      ? eslestirilenSenaryolar.reduce((max, s) =>
          AKSIYON_ONCELIK[s.aksiyon] > AKSIYON_ONCELIK[max.aksiyon] ? s : max
        ).aksiyon
      : 'TAKIP';

  // Risk seviyesi belirle
  let riskSeviyesi: RiskSeviyesi;
  if (toplamRiskPuani >= 80) riskSeviyesi = 'KRITIK';
  else if (toplamRiskPuani >= 65) riskSeviyesi = 'YUKSEK';
  else if (toplamRiskPuani >= 40) riskSeviyesi = 'ORTA';
  else riskSeviyesi = 'DUSUK';

  return {
    islemId: islem.id,
    eslestirilenSenaryolar,
    toplamRiskPuani,
    enYuksekAksiyon,
    riskSeviyesi,
    uyarilar,
    oneriler,
  };
};

/**
 * Mukellefin tum islemlerini degerlendir ve KURGAN profili olustur
 */
export const generateKurganProfili = (
  vkn: string,
  donem: string,
  islemler: KurganIslem[],
  mizanVerileri?: MizanHesapInput[],
  sektorKodu?: string
): KurganProfili => {
  // Tum islemleri degerlendir
  const degerlendirmeler = islemler.map((islem) =>
    evaluateIslem(islem, mizanVerileri, sektorKodu)
  );

  // Riskli islemleri filtrele
  const riskliIslemler = degerlendirmeler.filter((d) => d.toplamRiskPuani > 0);
  const kritikIslemler = degerlendirmeler.filter(
    (d) => d.riskSeviyesi === 'KRITIK' || d.riskSeviyesi === 'YUKSEK'
  );

  // Senaryo frekansi hesapla
  const senaryoFrekans: Record<string, number> = {};
  riskliIslemler.forEach((d) => {
    d.eslestirilenSenaryolar.forEach((s) => {
      senaryoFrekans[s.id] = (senaryoFrekans[s.id] || 0) + 1;
    });
  });

  const eslestirilenSenaryolar = Object.entries(senaryoFrekans)
    .map(([id, sayi]) => ({ senaryo: KURGAN_SCENARIOS[id], sayi }))
    .sort((a, b) => b.sayi - a.sayi);

  // Toplam ve ortalama risk puani
  const toplamRiskPuani = riskliIslemler.reduce(
    (sum, d) => sum + d.toplamRiskPuani,
    0
  );
  const ortalamaRiskPuani =
    riskliIslemler.length > 0
      ? Math.round(toplamRiskPuani / riskliIslemler.length)
      : 0;

  // Genel risk seviyesi
  let riskSeviyesi: RiskSeviyesi;
  if (kritikIslemler.length >= 3 || ortalamaRiskPuani >= 80)
    riskSeviyesi = 'KRITIK';
  else if (kritikIslemler.length >= 1 || ortalamaRiskPuani >= 60)
    riskSeviyesi = 'YUKSEK';
  else if (riskliIslemler.length >= 5 || ortalamaRiskPuani >= 40)
    riskSeviyesi = 'ORTA';
  else riskSeviyesi = 'DUSUK';

  // En yuksek aksiyon
  const enYuksekAksiyon: KurganAksiyon =
    riskliIslemler.length > 0
      ? riskliIslemler.reduce((max, d) =>
          AKSIYON_ONCELIK[d.enYuksekAksiyon] > AKSIYON_ONCELIK[max.enYuksekAksiyon]
            ? d
            : max
        ).enYuksekAksiyon
      : 'TAKIP';

  // Ozet mesaj
  let ozetMesaj = '';
  if (riskSeviyesi === 'KRITIK') {
    ozetMesaj = `KRITIK: ${kritikIslemler.length} adet yuksek riskli islem tespit edildi. KURGAN yazisi alma olasiligi yuksek!`;
  } else if (riskSeviyesi === 'YUKSEK') {
    ozetMesaj = `UYARI: ${riskliIslemler.length} adet riskli islem tespit edildi. Dikkatle incelenmeli.`;
  } else if (riskSeviyesi === 'ORTA') {
    ozetMesaj = `ORTA RISK: Bazi islemlerde dikkat edilmesi gereken unsurlar var.`;
  } else {
    ozetMesaj = `DUSUK RISK: Belirgin bir KURGAN riski tespit edilmedi.`;
  }

  // Tavsiyeler
  const tavsiyeler: string[] = [];
  if (eslestirilenSenaryolar.length > 0) {
    eslestirilenSenaryolar.slice(0, 3).forEach(({ senaryo }) => {
      const senaryoObj = KURGAN_SCENARIOS[senaryo.id];
      if (senaryoObj) {
        tavsiyeler.push(
          `${senaryoObj.ad}: ${senaryoObj.ornekler?.[0] || senaryoObj.aciklama}`
        );
      }
    });
  }

  return {
    vkn,
    donem,
    toplamIslem: islemler.length,
    riskliIslemSayisi: riskliIslemler.length,
    toplamRiskPuani,
    ortalamaRiskPuani,
    riskSeviyesi,
    eslestirilenSenaryolar,
    enYuksekAksiyon,
    kritikIslemler,
    ozetMesaj,
    tavsiyeler,
  };
};

/**
 * KURGAN risk seviyesi rengini dondur
 */
export const getKurganRiskRenk = (seviye: RiskSeviyesi): string => {
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
 * KURGAN aksiyon badge rengini dondur
 */
export const getKurganAksiyonRenk = (aksiyon: KurganAksiyon): string => {
  switch (aksiyon) {
    case 'INCELEME':
      return 'red';
    case 'IZAHA_DAVET':
      return 'orange';
    case 'BILGI_ISTEME':
      return 'yellow';
    case 'TAKIP':
      return 'blue';
    default:
      return 'gray';
  }
};
