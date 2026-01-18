import { CezaVerisi, GuncellikBilgisi } from './types';

const guncellik2025: GuncellikBilgisi = {
  valid_from: "2025-01-01",
  valid_until: "2025-12-31",
  last_updated: "2026-01-10",
  source: "GİB",
  source_ref: "VUK Md. 352-353",
  confidence: 'current'
};

export const usulsuzlukCezalari: CezaVerisi[] = [
  { id: 'usul-1', tur: 'usulsuzluk', title: '1. Derece Usulsüzlük', tutar_veya_oran: '880 - 16.000 TL', aciklama: 'Mükellef grubuna göre', guncellik: guncellik2025 },
  { id: 'usul-2', tur: 'usulsuzluk', title: '2. Derece Usulsüzlük', tutar_veya_oran: '450 - 8.000 TL', aciklama: 'Mükellef grubuna göre', guncellik: guncellik2025 }
];

export const ozelUsulsuzlukCezalari: CezaVerisi[] = [
  { id: 'ozel-fatura-almama', tur: 'ozel_usulsuzluk', title: 'Fatura/Belge Almama', tutar_veya_oran: '6.900 TL', aciklama: 'Her belge için', guncellik: guncellik2025 },
  { id: 'ozel-fatura-vermeme', tur: 'ozel_usulsuzluk', title: 'Fatura/Belge Vermeme', tutar_veya_oran: '6.900 TL', aciklama: 'Her belge için', guncellik: guncellik2025 },
  { id: 'ozel-e-fatura', tur: 'ozel_usulsuzluk', title: 'e-Fatura/e-Defter İhlali', tutar_veya_oran: '55.000 TL', aciklama: 'Her ihlal için', guncellik: guncellik2025 }
];

export const vergiZiyai: CezaVerisi = {
  id: 'vergi-ziyai',
  tur: 'vergi_ziyai',
  title: 'Vergi Ziyaı Cezası',
  tutar_veya_oran: '%50 - %300',
  aciklama: 'Ziyaa uğratılan verginin %50, kaçakçılıkta 3 katı',
  guncellik: guncellik2025
};
