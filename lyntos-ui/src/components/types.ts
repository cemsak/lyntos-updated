export type RiskNedeni = {
  neden: string;
  etki: string; // "Artırıcı" | "Azaltıcı" | "Nötr"
  kanit?: string;
  oneri?: string; // NOT: 'onerı' değil 'oneri'
};

export type BeyanOzet = { ad: string; durum: string; risk: string };

export type UyumKontrol = {
  banka_mizan_tutarliligi?: { durum: boolean; detay: string };
  beyannameler_mizan_tutarliligi?: { durum: boolean; detay: string };
  son_beyan_gonderimi?: {
    kdv?: string;
    muhtasar?: string;
    gecici_vergi?: string;
  };
};

export type KarsiFirma = {
  unvan: string;
  vergi_no: string;
  risk: string;
  durum: string;
};

export type AnalyzeResponse = {
  summary?: string;
  kurgan: {
    mode?: string;
    model?: string;
    risk_skoru: number;
    risk_durumu: string;
    vergi_uyum_endeksi: number;
    risk_nedenleri?: { baslik: string; etki: string; kanit: string }[];
    beyanname_ozeti?: BeyanOzet[];
    uyum_kontrol?: UyumKontrol;
    karsi_firma?: KarsiFirma[];
    risk_log?: { donem: string; skor: number }[];
  };
  radar?: {
    radar_risk_skoru: number;
    radar_risk_durumu: string;
    nedenler?: any[];
  };
  sahte_fatura_riski?: {
    skor: number;
    durum: string;
    nedenler?: RiskNedeni[];
    eksik_veriler?: string[];
  };
  vdk_uzmani_yorumu?: string;
  ai_analizi?: string;
  borc_alacak_trend?: { ay: string; borc: number; alacak: number }[];
  banka_sparkline?: number[];
  filters?: { entity?: string; period?: string };
};
