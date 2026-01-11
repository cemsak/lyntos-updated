import { HadTutar, AsgariUcret, GuncellikBilgisi } from './types';

const guncellik2025: GuncellikBilgisi = {
  valid_from: "2025-01-01",
  valid_until: "2025-12-31",
  last_updated: "2026-01-10",
  source: "Resmi Gazete",
  confidence: 'current'
};

export const asgariUcret2025: AsgariUcret = {
  donem: "2025 - 1. Yarıyıl",
  brut: 22104,
  sgk_isci: 3094.56,
  issizlik_isci: 221.04,
  gelir_vergisi: 0,
  damga_vergisi: 168.43,
  net: 17002.17,
  isveren_sgk: 3426.12,
  isveren_issizlik: 442.08,
  toplam_maliyet: 25972.20,
  guncellik: { ...guncellik2025, source_ref: "RG No: 32415" }
};

export const hadlerVeTutarlar: HadTutar[] = [
  { id: 'kidem-tavani', title: 'Kıdem Tazminatı Tavanı', tutar: 35058.58, birim: 'TL', guncellik: guncellik2025 },
  { id: 'defter-bilanço', title: 'Bilanço Esası Haddi (Alış)', tutar: 1200000, birim: 'TL', guncellik: guncellik2025 },
  { id: 'defter-isletme', title: 'İşletme Hesabı Haddi', tutar: 600000, birim: 'TL', guncellik: guncellik2025 },
  { id: 'demirbaş', title: 'Demirbaş/Amortisman Sınırı', tutar: 10000, birim: 'TL', aciklama: 'Altı doğrudan gider', guncellik: guncellik2025 },
  { id: 'kira-istisna', title: 'Kira Geliri İstisnası', tutar: 33000, birim: 'TL', aciklama: 'Konut kirası', guncellik: guncellik2025 },
  { id: 'yemek-istisna', title: 'Yemek İstisnası (Günlük)', tutar: 270, birim: 'TL', guncellik: guncellik2025 },
  { id: 'e-fatura', title: 'e-Fatura Zorunluluk Haddi', tutar: 3000000, birim: 'TL', guncellik: guncellik2025 },
  { id: 'fatura-kesim', title: 'Fatura Kesim Haddi', tutar: 6900, birim: 'TL', guncellik: guncellik2025 }
];

export const yurticiGundelikler: HadTutar[] = [
  { id: 'gundelik-1', title: 'Ek gösterge 8000+', tutar: 705, birim: 'TL', guncellik: guncellik2025 },
  { id: 'gundelik-2', title: 'Ek gösterge 5800-8000', tutar: 655, birim: 'TL', guncellik: guncellik2025 },
  { id: 'gundelik-3', title: 'Ek gösterge 3000-5800', tutar: 610, birim: 'TL', guncellik: guncellik2025 },
  { id: 'gundelik-4', title: 'Aylık/kadro derecesi 1-4', tutar: 540, birim: 'TL', guncellik: guncellik2025 },
  { id: 'gundelik-5', title: 'Aylık/kadro derecesi 5-15', tutar: 525, birim: 'TL', guncellik: guncellik2025 }
];
