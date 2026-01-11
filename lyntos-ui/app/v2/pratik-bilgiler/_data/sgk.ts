import { SGKVeri, HadTutar, GuncellikBilgisi } from './types';

const guncellik2025: GuncellikBilgisi = {
  valid_from: "2025-01-01",
  valid_until: "2025-12-31",
  last_updated: "2026-01-10",
  source: "SGK",
  confidence: 'current'
};

export const sgkPrimOranlari: SGKVeri[] = [
  { id: 'kisa-vade', title: 'Kısa Vadeli Sigorta', isveren_payi: 2, guncellik: guncellik2025 },
  { id: 'uzun-vade', title: 'Malullük, Yaşlılık, Ölüm', isci_payi: 9, isveren_payi: 11, toplam: 20, guncellik: guncellik2025 },
  { id: 'saglik', title: 'Genel Sağlık Sigortası', isci_payi: 5, isveren_payi: 7.5, toplam: 12.5, guncellik: guncellik2025 },
  { id: 'issizlik', title: 'İşsizlik Sigortası', isci_payi: 1, isveren_payi: 2, toplam: 3, guncellik: guncellik2025 }
];

export const sgkTabanTavan: SGKVeri = {
  id: 'taban-tavan',
  title: 'SGK Taban/Tavan 2025',
  taban: 22104,
  tavan: 165780,
  guncellik: guncellik2025
};

export const ihbarSureleri: HadTutar[] = [
  { id: 'ihbar-1', title: '0-6 ay arası', tutar: 2, birim: 'hafta', guncellik: guncellik2025 },
  { id: 'ihbar-2', title: '6 ay - 1.5 yıl arası', tutar: 4, birim: 'hafta', guncellik: guncellik2025 },
  { id: 'ihbar-3', title: '1.5 - 3 yıl arası', tutar: 6, birim: 'hafta', guncellik: guncellik2025 },
  { id: 'ihbar-4', title: '3 yıldan fazla', tutar: 8, birim: 'hafta', guncellik: guncellik2025 }
];

export const yillikIzin: HadTutar[] = [
  { id: 'izin-1', title: '1-5 yıl çalışma', tutar: 14, birim: 'gün', guncellik: guncellik2025 },
  { id: 'izin-2', title: '5-15 yıl çalışma', tutar: 20, birim: 'gün', guncellik: guncellik2025 },
  { id: 'izin-3', title: '15 yıl üzeri', tutar: 26, birim: 'gün', guncellik: guncellik2025 },
  { id: 'izin-4', title: '18 yaş altı / 50 yaş üstü', tutar: 20, birim: 'gün', aciklama: 'Minimum', guncellik: guncellik2025 }
];
