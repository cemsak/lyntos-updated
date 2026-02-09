// Yatay / Dikey Analiz - Shared Types

export interface YataySonuc {
  hesap_kodu: string;
  hesap_adi: string;
  hesap_grubu: string;
  cari_bakiye: number;
  onceki_bakiye: number;
  fark: number;
  degisim_yuzde: number;
  oran_cari: number;
  oran_onceki: number;
  material: boolean;
  durum: 'normal' | 'uyari' | 'kritik';
  neden: string | null;
}

export interface YatayOzet {
  toplam_hesap: number;
  material_degisim_sayisi: number;
  kritik_sayisi: number;
  uyari_sayisi: number;
  esik_yuzde: number;
  cari_ciro: number;
  onceki_ciro: number;
  ciro_degisim_yuzde: number;
}

export interface YatayData {
  ok: boolean;
  cari_period: string;
  onceki_period: string;
  sonuclar: YataySonuc[];
  ozet: YatayOzet;
  material_degisimler: YataySonuc[];
}

export interface DikeyKalem {
  hesap_kodu: string;
  hesap_adi: string;
  taraf: 'aktif' | 'pasif' | 'gelir' | 'gider';
  bakiye: number;
  oran: number;
  baz: string;
  baz_tutar: number;
}

export interface DikeyYapiOzeti {
  donen_varliklar: { tutar: number; oran_aktif: number };
  duran_varliklar: { tutar: number; oran_aktif: number };
  kvyk: { tutar: number; oran_pasif: number };
  uvyk: { tutar: number; oran_pasif: number };
  ozkaynaklar: { tutar: number; oran_pasif: number };
  toplam_aktif: number;
  toplam_pasif: number;
  net_satislar: number;
  smm: number;
  brut_kar: number;
  brut_kar_marji: number;
}

export interface DikeyAnomali {
  kod: string;
  aciklama: string;
  durum: 'kritik' | 'uyari';
  mevzuat: string;
}

export interface DikeyData {
  ok: boolean;
  bilanco: DikeyKalem[];
  gelir_tablosu: DikeyKalem[];
  yapi_ozeti: DikeyYapiOzeti;
  anomaliler: DikeyAnomali[];
}

export type ViewMode = 'yatay' | 'dikey';
export type DikeyFilter = 'tumu' | 'aktif' | 'pasif' | 'gelir' | 'gider';
