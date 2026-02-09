import type { ORAN_KATEGORILERI } from './mizanOmurgaConstants';

export interface MizanHesap {
  kod: string;
  ad: string;
  grup: string;
  borc: number;
  alacak: number;
  bakiye: number;
  bakiyeYonu: 'B' | 'A';
  oncekiDonem?: number;
  degisimOrani?: number;
}

export interface VdkRiskBulgusu {
  kod: string;
  baslik: string;
  hesapKodu: string;
  hesapAdi: string;
  durum: 'normal' | 'uyari' | 'kritik';
  mevcutDeger: number;
  esikDeger: number;
  birim: string;
  mevzuat: string;
  aciklama: string;
  oneri: string;
  vdkRiski: boolean;
}

export interface OranAnalizi {
  kategori: keyof typeof ORAN_KATEGORILERI;
  ad: string;
  formul: string;
  deger: number;
  birim: '%' | 'x' | 'gun';
  normalAralik: { min: number; max: number };
  durum: 'normal' | 'uyari' | 'kritik';
  yorum: string;
  sektorOrtalama?: number;
}

export interface ApiAccount {
  hesap: string;
  ad: string;
  bakiye: number;
  status: 'ok' | 'warning' | 'error';
  reason_tr?: string;
  required_actions?: string[];
}

export interface FinansalOranlar {
  raw_values: {
    donen_varliklar: number;
    duran_varliklar: number;
    toplam_aktif: number;
    kvyk: number;
    uvyk: number;
    ozkaynaklar: number;
    stoklar: number;
    alicilar: number;
    hazir_degerler: number;
    ciro: number;
    smm: number;
    brut_kar: number;
  };
  oranlar: {
    likidite: {
      cari_oran: number;
      asit_test: number;
      nakit_oran: number;
    };
    mali_yapi: {
      borc_ozkaynak: number;
      finansal_kaldirac: number;
    };
    faaliyet: {
      alacak_devir: number;
      tahsilat_suresi: number;
      stok_devir: number;
      stok_gun: number;
      aktif_devir: number;
    };
    karlilik: {
      brut_kar_marji: number;
      net_kar_marji: number;
      aktif_karliligi: number;
      ozkaynak_karliligi: number;
    };
  };
  smmm_uyarilari: Array<{
    kod: string;
    mesaj: string;
    oneri: string;
    seviye: 'kritik' | 'uyari';
  }>;
}

export interface MizanResult {
  hesaplar: MizanHesap[];
  accounts_raw: Record<string, ApiAccount>;
  summary: {
    total_accounts: number;
    ok: number;
    warning: number;
    error: number;
    overall_status: string;
    total_actions: number;
  };
  totals: {
    toplam_borc: number;
    toplam_alacak: number;
    fark: number;
    denge_ok: boolean;
  };
  critical_count: number;
  finansal_oranlar?: FinansalOranlar;
}
