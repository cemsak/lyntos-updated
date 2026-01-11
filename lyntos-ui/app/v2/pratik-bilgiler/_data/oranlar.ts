import { VergiDilimi, OranVerisi, GuncellikBilgisi } from './types';

const guncellik2025: GuncellikBilgisi = {
  valid_from: "2025-01-01",
  valid_until: "2025-12-31",
  last_updated: "2026-01-10",
  source: "GİB",
  source_ref: "GVK Md. 103",
  confidence: 'current'
};

export const gelirVergisiDilimleri: VergiDilimi[] = [
  { min: 0, max: 158000, oran: 15, kumulatif: 23700 },
  { min: 158001, max: 330000, oran: 20, kumulatif: 58100 },
  { min: 330001, max: 800000, oran: 27, kumulatif: 185000 },
  { min: 800001, max: 4300000, oran: 35, kumulatif: 1410000 },
  { min: 4300001, max: null, oran: 40 }
];

export const damgaVergisi: OranVerisi[] = [
  { id: 'damga-sozlesme', title: 'Sözleşmeler', value: 9.48, unit: '‰', description: 'Binde 9,48', guncellik: guncellik2025 },
  { id: 'damga-ust-sinir', title: 'Damga Vergisi Üst Sınırı', value: '18.200.000', unit: 'TL', guncellik: guncellik2025 }
];

export const kdvTevkifatOranlari: OranVerisi[] = [
  { id: 'kdv-2-10', title: 'Temizlik, bahçe bakım, çevre', value: '2/10', unit: '', guncellik: guncellik2025 },
  { id: 'kdv-4-10', title: 'Makine/teçhizat bakım onarım', value: '4/10', unit: '', guncellik: guncellik2025 },
  { id: 'kdv-5-10', title: 'Yapım işleri, etüt-proje', value: '5/10', unit: '', guncellik: guncellik2025 },
  { id: 'kdv-7-10', title: 'İşgücü temin hizmetleri', value: '7/10', unit: '', guncellik: guncellik2025 },
  { id: 'kdv-9-10', title: 'Hurda metal teslimleri', value: '9/10', unit: '', guncellik: guncellik2025 }
];

export const kurumlarVergisiTevkifat: OranVerisi[] = [
  { id: 'kv-kar-payi', title: 'Kâr Payı (Temettü)', value: 10, unit: '%', guncellik: guncellik2025 },
  { id: 'kv-gayrimenkul', title: 'Gayrimenkul Sermaye İradı', value: 20, unit: '%', guncellik: guncellik2025 },
  { id: 'kv-serbest-meslek', title: 'Serbest Meslek Kazancı', value: 20, unit: '%', guncellik: guncellik2025 }
];

export const geciciVergiOranlari: OranVerisi[] = [
  { id: 'gv-gecici', title: 'Gelir Vergisi Mükellefleri', value: 15, unit: '%', description: 'İlk dilim', guncellik: guncellik2025 },
  { id: 'kv-gecici', title: 'Kurumlar Vergisi Mükellefleri', value: 25, unit: '%', guncellik: guncellik2025 }
];

export const reeskontAvans: OranVerisi[] = [
  { id: 'reeskont', title: 'Reeskont İşlemleri', value: 45, unit: '%', description: 'Yıllık', guncellik: guncellik2025 },
  { id: 'avans', title: 'Avans İşlemleri', value: 46, unit: '%', description: 'Yıllık', guncellik: guncellik2025 }
];

export const kiraStopaji: OranVerisi[] = [
  { id: 'kira-stopaj-gv', title: 'GV Mükelleflerine Ödenen', value: 20, unit: '%', guncellik: guncellik2025 },
  { id: 'kira-stopaj-basit', title: 'Basit Usul / GV\'den Muaf', value: 20, unit: '%', guncellik: guncellik2025 }
];
