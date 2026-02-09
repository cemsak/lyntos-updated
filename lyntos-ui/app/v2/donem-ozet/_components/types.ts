export type DonemTab = 'ozet' | 'kdv' | 'muhtasar';
/** @deprecated Use DonemTab instead */
export type Q1Tab = DonemTab;

export interface KDVBeyanname {
  donem: string;
  matrah: number;
  hesaplanan_kdv: number;
  indirilecek_kdv: number;
  odenecek_kdv: number;
  devreden_kdv: number;
}

export interface MuhtasarBeyanname {
  donem: string;
  toplam_vergi: number;
  calisan_sayisi: number;
}

export interface TahakkukKalem {
  vergi_kodu: string;   // 0015, 1048, 1046 vb.
  vergi_adi: string;    // KDV, TDMG vb.
  matrah: number;
  tahakkuk_eden: number;
  mahsup_edilen: number;
  odenecek: number;
  vade_tarihi?: string | null;
  is_ana_vergi: boolean;
}

export interface Tahakkuk {
  id?: number;  // DB tahakkuk_id
  beyanname_turu: string;
  donem: string;
  toplam_borc: number;
  payment_status?: string | null;
  payment_date?: string | null;
  payment_amount?: number | null;
  vade_tarihi?: string | null;
  gecikme_gun?: number | null;
  gecikme_ay?: number | null;
  gecikme_zammi?: number | null;
  toplam_borc_faizli?: number | null;
  gecikme_oran?: number | null;
  kalemler?: TahakkukKalem[];
}

export interface OdemeDurumu {
  toplam_tahakkuk: number;
  odenen: number;
  gecikli_odenen: number;
  odenmemis: number;
  vadesi_gelmemis: number;
  toplam_borc: number;
  odenen_tutar: number;
  kalan_borc: number;
  gecikme_uyarilari: Array<{
    tip: string;
    donem: string;
    gecikme_gun: number;
    mesaj: string;
    kritik?: boolean;
  }>;
}

export interface DonemSummary {
  kdv: KDVBeyanname[];
  muhtasar: MuhtasarBeyanname[];
  gecici_vergi: Record<string, unknown>[];
  tahakkuk: Tahakkuk[];
  banka_islem_sayisi: number;
  yevmiye_sayisi: number;
  kebir_sayisi: number;
  mizan_sayisi: number;
}
/** @deprecated Use DonemSummary instead */
export type Q1Summary = DonemSummary;

export interface ManuelOdemeForm {
  odeme_tarihi: string;
  odeme_tutari: number;
  odeme_kaynagi: string;
  aciklama: string;
}
