/**
 * LYNTOS Yasal Süreler Hook
 *
 * SMMM'ler için dinamik beyanname ve yasal süre takibi.
 * Dönem bazlı otomatik hesaplama.
 */

import { useMemo } from 'react';
import { useDashboardScope } from '../_components/scope/useDashboardScope';

// ============== TYPES ==============

export type SureOnceligi = 'kritik' | 'uyari' | 'normal' | 'tamamlandi';

export interface YasalSure {
  id: string;
  ad: string;
  sonTarih: Date;
  kalanGun: number;
  oncelik: SureOnceligi;
  aciklama: string;
  yasalDayanak: string;
}

export interface DonemSureleri {
  kdvBeyanname: YasalSure;
  muhtasar: YasalSure;
  geciciVergi: YasalSure | null;
  kurumlarVergisi: YasalSure | null;
  baFormu: YasalSure;
  bsFormu: YasalSure;
  eDefterBeratYukleme: YasalSure;
}

// ============== HELPER FUNCTIONS ==============

function hesaplaKalanGun(hedefTarih: Date): number {
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  const hedef = new Date(hedefTarih);
  hedef.setHours(0, 0, 0, 0);
  const fark = hedef.getTime() - bugun.getTime();
  return Math.ceil(fark / (1000 * 60 * 60 * 24));
}

function belirleOncelik(kalanGun: number): SureOnceligi {
  if (kalanGun < 0) return 'kritik'; // Geçmiş
  if (kalanGun <= 3) return 'kritik';
  if (kalanGun <= 7) return 'uyari';
  if (kalanGun <= 14) return 'normal';
  return 'tamamlandi'; // Yeterli süre var
}

/**
 * KDV Beyanname son günü hesapla
 * Her ayın 28'i (ertesi ayın)
 */
function getKdvSonTarih(yil: number, ay: number): Date {
  // Beyan edilecek ay: ay, beyan tarihi: ay+1'in 28'i
  const beyanAy = ay + 1;
  const beyanYil = beyanAy > 12 ? yil + 1 : yil;
  const normalizeAy = beyanAy > 12 ? 1 : beyanAy;
  return new Date(beyanYil, normalizeAy - 1, 28); // Ay 0-indexed
}

/**
 * Muhtasar Beyanname son günü hesapla
 * Her ayın 28'i (üç aylık dönem için: Nisan, Temmuz, Ekim, Ocak)
 */
function getMuhtasarSonTarih(yil: number, ceyrek: number): Date {
  // Q1 (Ocak-Şubat-Mart) -> Nisan 28
  // Q2 (Nisan-Mayıs-Haziran) -> Temmuz 28
  // Q3 (Temmuz-Ağustos-Eylül) -> Ekim 28
  // Q4 (Ekim-Kasım-Aralık) -> Ocak 28 (sonraki yıl)
  const beyanAylar: Record<number, number> = { 1: 4, 2: 7, 3: 10, 4: 1 };
  const beyanAy = beyanAylar[ceyrek];
  const beyanYil = ceyrek === 4 ? yil + 1 : yil;
  return new Date(beyanYil, beyanAy - 1, 28);
}

/**
 * Geçici Vergi Beyanname son günü hesapla
 * Q1: 17 Mayıs, Q2: 17 Ağustos, Q3: 17 Kasım, Q4: Yıllık KV ile
 */
function getGeciciVergiSonTarih(yil: number, ceyrek: number): Date | null {
  if (ceyrek === 4) return null; // 4. çeyrek yıllık KV ile birlikte
  const tarihler: Record<number, { ay: number; gun: number }> = {
    1: { ay: 5, gun: 17 },  // 17 Mayıs
    2: { ay: 8, gun: 17 },  // 17 Ağustos
    3: { ay: 11, gun: 17 }, // 17 Kasım
  };
  const tarih = tarihler[ceyrek];
  return new Date(yil, tarih.ay - 1, tarih.gun);
}

/**
 * Kurumlar Vergisi son günü (Yıllık)
 * 30 Nisan (sonraki yıl)
 */
function getKurumlarVergiSonTarih(yil: number): Date {
  return new Date(yil + 1, 3, 30); // Nisan 30
}

/**
 * BA/BS Form son günü
 * Ertesi ayın son günü
 */
function getBaBsSonTarih(yil: number, ay: number): Date {
  const beyanAy = ay + 1;
  const beyanYil = beyanAy > 12 ? yil + 1 : yil;
  const normalizeAy = beyanAy > 12 ? 1 : beyanAy;
  // Ayın son günü
  return new Date(beyanYil, normalizeAy, 0);
}

/**
 * E-Defter Berat Yükleme son günü
 * Ertesi ayın son günü
 */
function getEDefterBeratSonTarih(yil: number, ay: number): Date {
  // Aylık defter için: ertesi ayın son günü
  const beyanAy = ay + 1;
  const beyanYil = beyanAy > 12 ? yil + 1 : yil;
  const normalizeAy = beyanAy > 12 ? 1 : beyanAy;
  return new Date(beyanYil, normalizeAy, 0);
}

// ============== MAIN HOOK ==============

export function useYasalSureler() {
  const { scope } = useDashboardScope();

  const sureler = useMemo(() => {
    if (!scope.period) return null;

    // Parse period: "2025-Q1" -> yil: 2025, ceyrek: 1
    const match = scope.period.match(/(\d{4})-Q(\d)/);
    if (!match) return null;

    const yil = parseInt(match[1]);
    const ceyrek = parseInt(match[2]);

    // Çeyreğin son ayı
    const ceyrekSonAy = ceyrek * 3; // Q1->3, Q2->6, Q3->9, Q4->12

    const bugun = new Date();

    // KDV Beyanname (dönem son ayı için)
    const kdvSonTarih = getKdvSonTarih(yil, ceyrekSonAy);
    const kdvKalanGun = hesaplaKalanGun(kdvSonTarih);

    // Muhtasar
    const muhtasarSonTarih = getMuhtasarSonTarih(yil, ceyrek);
    const muhtasarKalanGun = hesaplaKalanGun(muhtasarSonTarih);

    // Geçici Vergi
    const geciciVergiSonTarih = getGeciciVergiSonTarih(yil, ceyrek);
    const geciciVergiKalanGun = geciciVergiSonTarih
      ? hesaplaKalanGun(geciciVergiSonTarih)
      : null;

    // Kurumlar Vergisi (sadece Q4 için anlamlı)
    const kurumlarVergiSonTarih = getKurumlarVergiSonTarih(yil);
    const kurumlarVergiKalanGun = hesaplaKalanGun(kurumlarVergiSonTarih);

    // BA Formu
    const baSonTarih = getBaBsSonTarih(yil, ceyrekSonAy);
    const baKalanGun = hesaplaKalanGun(baSonTarih);

    // BS Formu
    const bsSonTarih = getBaBsSonTarih(yil, ceyrekSonAy);
    const bsKalanGun = hesaplaKalanGun(bsSonTarih);

    // E-Defter Berat
    const eDefterSonTarih = getEDefterBeratSonTarih(yil, ceyrekSonAy);
    const eDefterKalanGun = hesaplaKalanGun(eDefterSonTarih);

    const sonuclar: DonemSureleri = {
      kdvBeyanname: {
        id: 'kdv',
        ad: 'KDV Beyannamesi',
        sonTarih: kdvSonTarih,
        kalanGun: kdvKalanGun,
        oncelik: belirleOncelik(kdvKalanGun),
        aciklama: `${ceyrekSonAy}. ay KDV beyannamesi`,
        yasalDayanak: 'KDV Kanunu Md. 41',
      },
      muhtasar: {
        id: 'muhtasar',
        ad: 'Muhtasar Beyanname',
        sonTarih: muhtasarSonTarih,
        kalanGun: muhtasarKalanGun,
        oncelik: belirleOncelik(muhtasarKalanGun),
        aciklama: `${ceyrek}. çeyrek muhtasar`,
        yasalDayanak: 'GVK Md. 98',
      },
      geciciVergi: geciciVergiSonTarih
        ? {
            id: 'gecici',
            ad: 'Geçici Vergi',
            sonTarih: geciciVergiSonTarih,
            kalanGun: geciciVergiKalanGun!,
            oncelik: belirleOncelik(geciciVergiKalanGun!),
            aciklama: `${ceyrek}. çeyrek geçici vergi`,
            yasalDayanak: 'GVK Mük. Md. 120',
          }
        : null,
      kurumlarVergisi:
        ceyrek === 4
          ? {
              id: 'kurumlar',
              ad: 'Kurumlar Vergisi',
              sonTarih: kurumlarVergiSonTarih,
              kalanGun: kurumlarVergiKalanGun,
              oncelik: belirleOncelik(kurumlarVergiKalanGun),
              aciklama: `${yil} yılı kurumlar vergisi`,
              yasalDayanak: 'KVK Md. 14',
            }
          : null,
      baFormu: {
        id: 'ba',
        ad: 'BA Formu',
        sonTarih: baSonTarih,
        kalanGun: baKalanGun,
        oncelik: belirleOncelik(baKalanGun),
        aciklama: `${ceyrekSonAy}. ay BA formu`,
        yasalDayanak: 'VUK 148-149',
      },
      bsFormu: {
        id: 'bs',
        ad: 'BS Formu',
        sonTarih: bsSonTarih,
        kalanGun: bsKalanGun,
        oncelik: belirleOncelik(bsKalanGun),
        aciklama: `${ceyrekSonAy}. ay BS formu`,
        yasalDayanak: 'VUK 148-149',
      },
      eDefterBeratYukleme: {
        id: 'edefter',
        ad: 'E-Defter Berat',
        sonTarih: eDefterSonTarih,
        kalanGun: eDefterKalanGun,
        oncelik: belirleOncelik(eDefterKalanGun),
        aciklama: `${ceyrekSonAy}. ay e-defter berat yükleme`,
        yasalDayanak: 'VUK 242',
      },
    };

    return sonuclar;
  }, [scope.period]);

  // Öncelik sırasına göre sıralanmış liste
  const surelerListesi = useMemo(() => {
    if (!sureler) return [];

    const tumu: YasalSure[] = [
      sureler.kdvBeyanname,
      sureler.muhtasar,
      sureler.baFormu,
      sureler.bsFormu,
      sureler.eDefterBeratYukleme,
    ];

    if (sureler.geciciVergi) tumu.push(sureler.geciciVergi);
    if (sureler.kurumlarVergisi) tumu.push(sureler.kurumlarVergisi);

    // Kalan güne göre sırala (en acil önce)
    return tumu.sort((a, b) => a.kalanGun - b.kalanGun);
  }, [sureler]);

  // Kritik süreler (3 gün veya daha az)
  const kritikSureler = useMemo(() => {
    return surelerListesi.filter((s) => s.oncelik === 'kritik');
  }, [surelerListesi]);

  // Uyarı süreleri (7 gün veya daha az)
  const uyariSureleri = useMemo(() => {
    return surelerListesi.filter((s) => s.oncelik === 'uyari');
  }, [surelerListesi]);

  return {
    sureler,
    surelerListesi,
    kritikSureler,
    uyariSureleri,
  };
}

export default useYasalSureler;
