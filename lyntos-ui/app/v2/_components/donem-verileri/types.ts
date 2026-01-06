// LYNTOS Donem Verileri Types
// Turkish accounting period document types and statuses

export type BelgeTipi =
  | 'MIZAN'
  | 'KDV_BEYAN'
  | 'MUHTASAR'
  | 'GECICI_VERGI'
  | 'KURUMLAR_VERGI'
  | 'BA_BS'
  | 'E_DEFTER'
  | 'BANKA_EKSTRESI'
  | 'BILANCO'
  | 'GELIR_TABLOSU';

export type BelgeDurumu = 'VAR' | 'EKSIK' | 'BEKLIYOR';

export interface BelgeTanimi {
  tip: BelgeTipi;
  label_tr: string;
  icon: string;
  gerekliMi: boolean;
  aciklama_tr: string;
}

export const BELGE_TANIMLARI: Record<BelgeTipi, BelgeTanimi> = {
  MIZAN: {
    tip: 'MIZAN',
    label_tr: 'Mizan',
    icon: 'M',
    gerekliMi: true,
    aciklama_tr: 'Donem sonu mizan raporu (Excel/CSV)',
  },
  KDV_BEYAN: {
    tip: 'KDV_BEYAN',
    label_tr: 'KDV Beyannamesi',
    icon: 'K',
    gerekliMi: true,
    aciklama_tr: 'Aylik KDV beyannamesi (PDF)',
  },
  MUHTASAR: {
    tip: 'MUHTASAR',
    label_tr: 'Muhtasar',
    icon: 'H',
    gerekliMi: true,
    aciklama_tr: 'Muhtasar ve prim hizmet beyannamesi',
  },
  GECICI_VERGI: {
    tip: 'GECICI_VERGI',
    label_tr: 'Gecici Vergi',
    icon: 'G',
    gerekliMi: true,
    aciklama_tr: 'Ceyreklik gecici vergi beyannamesi',
  },
  KURUMLAR_VERGI: {
    tip: 'KURUMLAR_VERGI',
    label_tr: 'Kurumlar Vergisi',
    icon: 'V',
    gerekliMi: false,
    aciklama_tr: 'Yillik kurumlar vergisi beyannamesi',
  },
  BA_BS: {
    tip: 'BA_BS',
    label_tr: 'BA-BS Formlari',
    icon: 'B',
    gerekliMi: true,
    aciklama_tr: 'Aylik BA-BS mutabakat formlari',
  },
  E_DEFTER: {
    tip: 'E_DEFTER',
    label_tr: 'E-Defter Berati',
    icon: 'D',
    gerekliMi: true,
    aciklama_tr: 'Aylik e-defter berat dosyasi (XML)',
  },
  BANKA_EKSTRESI: {
    tip: 'BANKA_EKSTRESI',
    label_tr: 'Banka Ekstresi',
    icon: 'E',
    gerekliMi: false,
    aciklama_tr: 'Banka hesap ekstresi (PDF/Excel)',
  },
  BILANCO: {
    tip: 'BILANCO',
    label_tr: 'Bilanco',
    icon: 'C',
    gerekliMi: false,
    aciklama_tr: 'Donem sonu bilanco tablosu',
  },
  GELIR_TABLOSU: {
    tip: 'GELIR_TABLOSU',
    label_tr: 'Gelir Tablosu',
    icon: 'T',
    gerekliMi: false,
    aciklama_tr: 'Donem sonu gelir tablosu',
  },
};

export interface BelgeDurumData {
  tip: BelgeTipi;
  durum: BelgeDurumu;
  yuklemeTarihi?: string;
  dosyaAdi?: string;
  fileId?: string;
  hatalar?: string[];
  uyarilar?: string[];
}

export interface DonemVerileriResult {
  belgeler: BelgeDurumData[];
  tamamlanmaYuzdesi: number;
  eksikSayisi: number;
  varSayisi: number;
  bekleyenSayisi: number;
}
