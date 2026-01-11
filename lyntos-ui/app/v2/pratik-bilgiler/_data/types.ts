export interface GuncellikBilgisi {
  valid_from: string;
  valid_until: string;
  last_updated: string;
  source: string;
  source_ref?: string;
  confidence: 'current' | 'stale' | 'unknown';
}

export interface VergiDilimi {
  min: number;
  max: number | null;
  oran: number;
  kumulatif?: number;
}

export interface OranVerisi {
  id: string;
  title: string;
  value: string | number;
  unit: string;
  description?: string;
  guncellik: GuncellikBilgisi;
}

export interface HadTutar {
  id: string;
  title: string;
  tutar: number | string;
  birim: string;
  aciklama?: string;
  guncellik: GuncellikBilgisi;
}

export interface SGKVeri {
  id: string;
  title: string;
  isci_payi?: number;
  isveren_payi?: number;
  toplam?: number;
  taban?: number;
  tavan?: number;
  guncellik: GuncellikBilgisi;
}

export interface CezaVerisi {
  id: string;
  tur: 'usulsuzluk' | 'ozel_usulsuzluk' | 'vergi_ziyai';
  title: string;
  tutar_veya_oran: string;
  aciklama: string;
  guncellik: GuncellikBilgisi;
}

export interface BeyanTarihi {
  id: string;
  beyanname: string;
  son_tarih: string;
  odeme_tarihi?: string;
  donem: string;
  aciklama?: string;
}

export interface AsgariUcret {
  donem: string;
  brut: number;
  sgk_isci: number;
  issizlik_isci: number;
  gelir_vergisi: number;
  damga_vergisi: number;
  net: number;
  isveren_sgk: number;
  isveren_issizlik: number;
  toplam_maliyet: number;
  guncellik: GuncellikBilgisi;
}
