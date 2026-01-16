/**
 * LYNTOS Mock Mizan Data
 * Sprint 4.1 - Test data for signal generator
 */

import type { MizanHesap, MizanContext } from './types';

export const MOCK_MIZAN_HESAPLAR: MizanHesap[] = [
  // 100 - Kasa (Negatif - CRITICAL)
  {
    kod: '100',
    ad: 'Kasa',
    borc: 150000,
    alacak: 195230,
    bakiye: 45230,
    bakiyeYonu: 'A', // Negatif kasa
    oncekiDonemBakiye: 25000,
  },
  // 102 - Bankalar (Normal)
  {
    kod: '102',
    ad: 'Bankalar',
    borc: 2500000,
    alacak: 1800000,
    bakiye: 700000,
    bakiyeYonu: 'B',
    oncekiDonemBakiye: 650000,
  },
  // 120 - Alicilar
  {
    kod: '120',
    ad: 'Alicilar',
    borc: 850000,
    alacak: 320000,
    bakiye: 530000,
    bakiyeYonu: 'B',
    oncekiDonemBakiye: 480000,
  },
  // 131 - Ortaklara Borclar (Borc yonunde - CRITICAL)
  {
    kod: '131',
    ad: 'Ortaklara Borclar',
    borc: 175000,
    alacak: 50000,
    bakiye: 125000,
    bakiyeYonu: 'B', // Sirket ortaga para vermis
    oncekiDonemBakiye: 80000,
  },
  // 153 - Ticari Mallar (Negatif - CRITICAL)
  {
    kod: '153',
    ad: 'Ticari Mallar',
    borc: 450000,
    alacak: 485000,
    bakiye: 35000,
    bakiyeYonu: 'A', // Negatif stok
    oncekiDonemBakiye: 120000,
  },
  // 320 - Saticilar (Normal)
  {
    kod: '320',
    ad: 'Saticilar',
    borc: 180000,
    alacak: 420000,
    bakiye: 240000,
    bakiyeYonu: 'A',
    oncekiDonemBakiye: 210000,
  },
  // 331 - Ortaklardan Alacaklar (Limit asimi)
  {
    kod: '331',
    ad: 'Ortaklardan Alacaklar',
    borc: 50000,
    alacak: 300000,
    bakiye: 250000,
    bakiyeYonu: 'A',
    oncekiDonemBakiye: 180000,
  },
  // 600 - Yurtici Satislar (Anomali)
  {
    kod: '600',
    ad: 'Yurtici Satislar',
    borc: 0,
    alacak: 4500000,
    bakiye: 4500000,
    bakiyeYonu: 'A',
    oncekiDonemBakiye: 3200000, // %40+ artis
  },
  // 601 - Yurtdisi Satislar
  {
    kod: '601',
    ad: 'Yurtdisi Satislar',
    borc: 0,
    alacak: 850000,
    bakiye: 850000,
    bakiyeYonu: 'A',
    oncekiDonemBakiye: 920000,
  },
  // 602 - Diger Gelirler
  {
    kod: '602',
    ad: 'Diger Gelirler',
    borc: 0,
    alacak: 150000,
    bakiye: 150000,
    bakiyeYonu: 'A',
    oncekiDonemBakiye: 140000,
  },
];

export const MOCK_MIZAN_CONTEXT: MizanContext = {
  period: '2024-Q4',
  client_id: 'OZKAN_KIRTASIYE',
  smmm_id: 'DEMO_SMMM',
  ciro: 5500000, // 600+601+602
  sermaye: 500000,
  toplamAktif: 3200000,
};

/**
 * Get calculated ciro from mizan
 */
export function calculateCiroFromMizan(hesaplar: MizanHesap[]): number {
  return hesaplar
    .filter((h) => ['600', '601', '602'].includes(h.kod))
    .reduce((sum, h) => sum + h.bakiye, 0);
}
