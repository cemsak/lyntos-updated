/**
 * Vergi Takvimi 2026
 * LYNTOS V2 - Sprint 8.0
 *
 * Tum vergi beyan ve odeme tarihlerini merkezi olarak yonetir.
 * NOT: Demo/mock veri YASAKTIR - tum tarihler resmi GIB takviminden alinmistir.
 */

export interface BeyanTarih {
  id: string;
  beyanname: string;
  sonTarih: string; // YYYY-MM-DD
  odemeTarihi?: string;
  donem: string;
  tur: 'aylik' | 'ceyreklik' | 'yillik';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2026 AYLIK BEYANLAR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const KDV_BEYANLARI_2026: BeyanTarih[] = [
  { id: 'kdv-2026-01', beyanname: 'KDV Beyannamesi', sonTarih: '2026-01-28', odemeTarihi: '2026-01-28', donem: 'Aralik 2025', tur: 'aylik' },
  { id: 'kdv-2026-02', beyanname: 'KDV Beyannamesi', sonTarih: '2026-02-26', odemeTarihi: '2026-02-26', donem: 'Ocak 2026', tur: 'aylik' },
  { id: 'kdv-2026-03', beyanname: 'KDV Beyannamesi', sonTarih: '2026-03-26', odemeTarihi: '2026-03-26', donem: 'Subat 2026', tur: 'aylik' },
  { id: 'kdv-2026-04', beyanname: 'KDV Beyannamesi', sonTarih: '2026-04-28', odemeTarihi: '2026-04-28', donem: 'Mart 2026', tur: 'aylik' },
  { id: 'kdv-2026-05', beyanname: 'KDV Beyannamesi', sonTarih: '2026-05-28', odemeTarihi: '2026-05-28', donem: 'Nisan 2026', tur: 'aylik' },
  { id: 'kdv-2026-06', beyanname: 'KDV Beyannamesi', sonTarih: '2026-06-26', odemeTarihi: '2026-06-26', donem: 'Mayis 2026', tur: 'aylik' },
  { id: 'kdv-2026-07', beyanname: 'KDV Beyannamesi', sonTarih: '2026-07-28', odemeTarihi: '2026-07-28', donem: 'Haziran 2026', tur: 'aylik' },
  { id: 'kdv-2026-08', beyanname: 'KDV Beyannamesi', sonTarih: '2026-08-28', odemeTarihi: '2026-08-28', donem: 'Temmuz 2026', tur: 'aylik' },
  { id: 'kdv-2026-09', beyanname: 'KDV Beyannamesi', sonTarih: '2026-09-28', odemeTarihi: '2026-09-28', donem: 'Agustos 2026', tur: 'aylik' },
  { id: 'kdv-2026-10', beyanname: 'KDV Beyannamesi', sonTarih: '2026-10-28', odemeTarihi: '2026-10-28', donem: 'Eylul 2026', tur: 'aylik' },
  { id: 'kdv-2026-11', beyanname: 'KDV Beyannamesi', sonTarih: '2026-11-26', odemeTarihi: '2026-11-26', donem: 'Ekim 2026', tur: 'aylik' },
  { id: 'kdv-2026-12', beyanname: 'KDV Beyannamesi', sonTarih: '2026-12-28', odemeTarihi: '2026-12-28', donem: 'Kasim 2026', tur: 'aylik' },
];

export const MUHTASAR_BEYANLARI_2026: BeyanTarih[] = [
  { id: 'muht-2026-01', beyanname: 'Muhtasar ve Prim Hizmet', sonTarih: '2026-01-28', odemeTarihi: '2026-01-28', donem: 'Aralik 2025', tur: 'aylik' },
  { id: 'muht-2026-02', beyanname: 'Muhtasar ve Prim Hizmet', sonTarih: '2026-02-26', odemeTarihi: '2026-02-26', donem: 'Ocak 2026', tur: 'aylik' },
  { id: 'muht-2026-03', beyanname: 'Muhtasar ve Prim Hizmet', sonTarih: '2026-03-26', odemeTarihi: '2026-03-26', donem: 'Subat 2026', tur: 'aylik' },
  { id: 'muht-2026-04', beyanname: 'Muhtasar ve Prim Hizmet', sonTarih: '2026-04-28', odemeTarihi: '2026-04-28', donem: 'Mart 2026', tur: 'aylik' },
  { id: 'muht-2026-05', beyanname: 'Muhtasar ve Prim Hizmet', sonTarih: '2026-05-28', odemeTarihi: '2026-05-28', donem: 'Nisan 2026', tur: 'aylik' },
  { id: 'muht-2026-06', beyanname: 'Muhtasar ve Prim Hizmet', sonTarih: '2026-06-26', odemeTarihi: '2026-06-26', donem: 'Mayis 2026', tur: 'aylik' },
  { id: 'muht-2026-07', beyanname: 'Muhtasar ve Prim Hizmet', sonTarih: '2026-07-28', odemeTarihi: '2026-07-28', donem: 'Haziran 2026', tur: 'aylik' },
  { id: 'muht-2026-08', beyanname: 'Muhtasar ve Prim Hizmet', sonTarih: '2026-08-28', odemeTarihi: '2026-08-28', donem: 'Temmuz 2026', tur: 'aylik' },
  { id: 'muht-2026-09', beyanname: 'Muhtasar ve Prim Hizmet', sonTarih: '2026-09-28', odemeTarihi: '2026-09-28', donem: 'Agustos 2026', tur: 'aylik' },
  { id: 'muht-2026-10', beyanname: 'Muhtasar ve Prim Hizmet', sonTarih: '2026-10-28', odemeTarihi: '2026-10-28', donem: 'Eylul 2026', tur: 'aylik' },
  { id: 'muht-2026-11', beyanname: 'Muhtasar ve Prim Hizmet', sonTarih: '2026-11-26', odemeTarihi: '2026-11-26', donem: 'Ekim 2026', tur: 'aylik' },
  { id: 'muht-2026-12', beyanname: 'Muhtasar ve Prim Hizmet', sonTarih: '2026-12-28', odemeTarihi: '2026-12-28', donem: 'Kasim 2026', tur: 'aylik' },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2026 CEYREKLIK BEYANLAR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const GECICI_VERGI_2026: BeyanTarih[] = [
  { id: 'gv-2026-q1', beyanname: '1. Donem Gecici Vergi', sonTarih: '2026-05-17', odemeTarihi: '2026-05-17', donem: 'Ocak-Mart 2026', tur: 'ceyreklik' },
  { id: 'gv-2026-q2', beyanname: '2. Donem Gecici Vergi', sonTarih: '2026-08-17', odemeTarihi: '2026-08-17', donem: 'Nisan-Haziran 2026', tur: 'ceyreklik' },
  { id: 'gv-2026-q3', beyanname: '3. Donem Gecici Vergi', sonTarih: '2026-11-17', odemeTarihi: '2026-11-17', donem: 'Temmuz-Eylul 2026', tur: 'ceyreklik' },
  // 4. donem gecici vergi beyani YOKTUR - Yillik Kurumlar/Gelir Vergisi ile kapatilir
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2025 MALI YILI YILLIK BEYANLAR (2026'da verilir)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const YILLIK_BEYANLAR_2025: BeyanTarih[] = [
  { id: 'gvb-2025', beyanname: 'Yillik Gelir Vergisi Beyannamesi', sonTarih: '2026-03-31', odemeTarihi: '2026-03-31', donem: '2025', tur: 'yillik' },
  { id: 'kvb-2025', beyanname: 'Kurumlar Vergisi Beyannamesi', sonTarih: '2026-04-30', odemeTarihi: '2026-04-30', donem: '2025', tur: 'yillik' },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// YARDIMCI FONKSIYONLAR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Tum 2026 beyanlarini birlestirir
 */
export function getTumBeyanlar(): BeyanTarih[] {
  return [
    ...KDV_BEYANLARI_2026,
    ...MUHTASAR_BEYANLARI_2026,
    ...GECICI_VERGI_2026,
    ...YILLIK_BEYANLAR_2025,
  ];
}

/**
 * Yaklasan beyanlari tarih sirasina gore getirir
 * @param count Getirilecek beyan sayisi
 */
export function getYaklasanBeyanlar(count: number = 5): BeyanTarih[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return getTumBeyanlar()
    .filter(b => new Date(b.sonTarih) >= today)
    .sort((a, b) => new Date(a.sonTarih).getTime() - new Date(b.sonTarih).getTime())
    .slice(0, count);
}

/**
 * Bir sonraki beyan tarihini ve beyanname adini getirir
 */
export function getSonrakiBeyan(): BeyanTarih | null {
  const yaklasanlar = getYaklasanBeyanlar(1);
  return yaklasanlar[0] || null;
}

/**
 * Tarihi Turkce formatta gosterir (ornek: "26 Sub")
 */
export function formatTarihKisa(dateStr: string): string {
  const date = new Date(dateStr);
  const gun = date.getDate();
  const aylar = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${gun} ${aylar[date.getMonth()]}`;
}

/**
 * Tarihi Turkce uzun formatta gosterir (ornek: "26 Subat 2026")
 */
export function formatTarihUzun(dateStr: string): string {
  const date = new Date(dateStr);
  const gun = date.getDate();
  const aylar = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];
  return `${gun} ${aylar[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Guncel donemi getirir (ornek: "2026-Q1")
 */
export function getGuncelDonem(): string {
  const today = new Date();
  const yil = today.getFullYear();
  const ay = today.getMonth() + 1;
  const ceyrek = Math.ceil(ay / 3);
  return `${yil}-Q${ceyrek}`;
}

/**
 * Guncel yili getirir
 */
export function getGuncelYil(): number {
  return new Date().getFullYear();
}

/**
 * Bir onceki mali yili getirir (beyanname donemi)
 */
export function getOncekiMaliYil(): number {
  return new Date().getFullYear() - 1;
}

/**
 * Kalan gun sayisini hesaplar
 */
export function getKalanGun(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
