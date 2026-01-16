/**
 * LYNTOS Mock CrossCheck Data
 * Sprint 4.2 - Test data for crosscheck signal generator
 */

import type { CrossCheckItem, CrossCheckContext } from './types';

export const MOCK_CROSSCHECK_ITEMS: CrossCheckItem[] = [
  // Banka mutabakat farki (HIGH)
  {
    type: 'banka',
    label: 'Is Bankasi',
    mizanHesapKodu: '102.001',
    mizanBakiye: 458230.5,
    karsiVeriBakiye: 449780.5,
    fark: 8450.0,
    farkYuzde: 1.84,
    karsiVeriKaynagi: 'Is Bankasi Aralik 2024 Ekstre',
    karsiVeriTarihi: '2024-12-31',
  },
  // Kasa sayim farki (HIGH - VDK riski)
  {
    type: 'kasa',
    label: 'Ana Kasa',
    mizanHesapKodu: '100',
    mizanBakiye: 12500.0,
    karsiVeriBakiye: 11850.0,
    fark: 650.0,
    farkYuzde: 5.2,
    karsiVeriKaynagi: '31.12.2024 Kasa Sayim Tutanagi',
    karsiVeriTarihi: '2024-12-31',
  },
  // Stok sayim farki (MEDIUM)
  {
    type: 'stok',
    label: 'Ticari Mallar',
    mizanHesapKodu: '153',
    mizanBakiye: 385000.0,
    karsiVeriBakiye: 378500.0,
    fark: 6500.0,
    farkYuzde: 1.69,
    karsiVeriKaynagi: '31.12.2024 Stok Sayim Raporu',
    karsiVeriTarihi: '2024-12-31',
  },
  // Alici mutabakat farki (MEDIUM)
  {
    type: 'alici',
    label: 'ABC Ltd. Sti.',
    mizanHesapKodu: '120.005',
    mizanBakiye: 125000.0,
    karsiVeriBakiye: 118500.0,
    fark: 6500.0,
    farkYuzde: 5.2,
    karsiVeriKaynagi: 'ABC Ltd. Mutabakat Cevabi',
    karsiVeriTarihi: '2025-01-10',
  },
  // KDV mutabakat farki (HIGH)
  {
    type: 'kdv',
    label: 'KDV Hesaplari',
    mizanHesapKodu: '391',
    mizanBakiye: 45230.0,
    karsiVeriBakiye: 44850.0,
    fark: 380.0,
    farkYuzde: 0.84,
    karsiVeriKaynagi: 'Aralik 2024 KDV Beyannamesi',
    karsiVeriTarihi: '2025-01-26',
  },
  // Satici mutabakat (esik altinda - sinyal uretmemeli)
  {
    type: 'satici',
    label: 'XYZ Tedarik A.S.',
    mizanHesapKodu: '320.003',
    mizanBakiye: 85000.0,
    karsiVeriBakiye: 85200.0,
    fark: -200.0,
    farkYuzde: 0.24,
    karsiVeriKaynagi: 'XYZ Tedarik Mutabakat',
    karsiVeriTarihi: '2025-01-08',
  },
];

export const MOCK_CROSSCHECK_CONTEXT: CrossCheckContext = {
  period: '2024-Q4',
  client_id: 'OZKAN_KIRTASIYE',
  smmm_id: 'DEMO_SMMM',
};
