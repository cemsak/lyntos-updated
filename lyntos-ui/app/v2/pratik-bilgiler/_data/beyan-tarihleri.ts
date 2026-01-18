import { BeyanTarihi } from './types';

export const beyanTarihleri2026Ocak: BeyanTarihi[] = [
  { id: 'kdv-ocak', beyanname: 'KDV Beyannamesi', son_tarih: '2026-01-28', odeme_tarihi: '2026-01-28', donem: 'Aralık 2025' },
  { id: 'muhtasar-ocak', beyanname: 'Muhtasar ve Prim Hizmet', son_tarih: '2026-01-28', odeme_tarihi: '2026-01-28', donem: 'Aralık 2025' },
  { id: 'damga-ocak', beyanname: 'Damga Vergisi', son_tarih: '2026-01-28', odeme_tarihi: '2026-01-28', donem: 'Aralık 2025' },
  { id: 'sgk-ocak', beyanname: 'SGK Prim Bildirge', son_tarih: '2026-01-31', odeme_tarihi: '2026-01-31', donem: 'Aralık 2025' }
];

export const beyanTarihleri2026Subat: BeyanTarihi[] = [
  { id: 'kdv-subat', beyanname: 'KDV Beyannamesi', son_tarih: '2026-02-28', odeme_tarihi: '2026-02-28', donem: 'Ocak 2026' },
  { id: 'e-defter', beyanname: 'e-Defter Berat Yükleme', son_tarih: '2026-02-28', donem: 'Aralık 2025' }
];

export const yillikBeyanlar: BeyanTarihi[] = [
  { id: 'gv-yillik', beyanname: 'Yıllık Gelir Vergisi', son_tarih: '2026-03-31', odeme_tarihi: '2026-03-31', donem: '2025' },
  { id: 'kv-yillik', beyanname: 'Kurumlar Vergisi', son_tarih: '2026-04-30', odeme_tarihi: '2026-04-30', donem: '2025' },
  { id: 'gecici-1', beyanname: '1. Dönem Geçici Vergi', son_tarih: '2026-05-17', odeme_tarihi: '2026-05-17', donem: 'Ocak-Mart 2026' },
  { id: 'gecici-2', beyanname: '2. Dönem Geçici Vergi', son_tarih: '2026-08-17', odeme_tarihi: '2026-08-17', donem: 'Nisan-Haziran 2026' },
  { id: 'gecici-3', beyanname: '3. Dönem Geçici Vergi', son_tarih: '2026-11-17', odeme_tarihi: '2026-11-17', donem: 'Temmuz-Eylül 2026' }
];

export function getYaklasanBeyanlar(count: number = 5): BeyanTarihi[] {
  const today = new Date();
  const tumBeyanlar = [...beyanTarihleri2026Ocak, ...beyanTarihleri2026Subat, ...yillikBeyanlar];

  return tumBeyanlar
    .filter(b => new Date(b.son_tarih) >= today)
    .sort((a, b) => new Date(a.son_tarih).getTime() - new Date(b.son_tarih).getTime())
    .slice(0, count);
}
