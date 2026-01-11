import { OranVerisi, GuncellikBilgisi } from './types';

const guncellik2025: GuncellikBilgisi = {
  valid_from: "2025-01-01",
  valid_until: "2025-12-31",
  last_updated: "2026-01-10",
  source: "GİB",
  source_ref: "6183 sayılı Kanun",
  confidence: 'current'
};

export const gecikmeOranlari: OranVerisi[] = [
  { id: 'gecikme-zammi', title: 'Gecikme Zammı', value: 3.5, unit: '%', description: 'Aylık', guncellik: guncellik2025 },
  { id: 'gecikme-faizi', title: 'Gecikme Faizi', value: 3.5, unit: '%', description: 'Aylık (VUK 112)', guncellik: guncellik2025 },
  { id: 'pismanlik', title: 'Pişmanlık Zammı', value: 3, unit: '%', description: 'Aylık', guncellik: guncellik2025 },
  { id: 'tecil', title: 'Tecil Faizi', value: 36, unit: '%', description: 'Yıllık', guncellik: guncellik2025 }
];

export const gecikmeZammiTarihce = [
  { yil: 2025, oran: 3.5 },
  { yil: 2024, oran: 4.5 },
  { yil: 2023, oran: 2.5 },
  { yil: 2022, oran: 2.5 }
];
