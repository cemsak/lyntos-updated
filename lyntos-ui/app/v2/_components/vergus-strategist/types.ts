/**
 * VERGUS Tax Strategist Types
 * Sprint 9.0 - LYNTOS V2
 */

export type Priority = 'high' | 'medium' | 'low';
export type Difficulty = 'low' | 'medium' | 'high';
export type RiskLevel = 'low' | 'medium' | 'high';
export type Category =
  | 'KURUMLAR_VERGISI'
  | 'AR_GE'
  | 'TEKNOKENT'
  | 'YATIRIM'
  | 'OZEL_BOLGE'
  | 'SGK';

export interface TaxOpportunity {
  strategy_id: string;
  strategy_name: string;
  category: Category;
  priority: Priority;
  difficulty: Difficulty;
  legal_basis: string;
  description: string;
  potential_saving: number;
  calculation_details: string;
  conditions: string[];
  actions: string[];
  risk_level: RiskLevel;
  warnings: string[];
  status_2025: string;
}

export interface ClientProfile {
  faaliyet_turu: string;
  ihracat_var: boolean;
  ihracat_orani: number;
  arge_var: boolean;
  teknokent: boolean;
  arge_merkezi: boolean;
  uretim_var: boolean;
  sanayi_sicil: boolean;
  sektor: string;
  personel_sayisi: number;
  yatirim_plani: boolean;
  finans_sektoru: boolean;
}

export interface AnalysisSummary {
  toplam_firsat: number;
  toplam_potansiyel_tasarruf: number;
  oncelik_dagilimi: Record<string, number>;
  kategori_dagilimi: Record<string, number>;
  zorluk_dagilimi: Record<string, number>;
  acil_aksiyonlar: number;
  en_yuksek_tasarruf: number;
  tavsiye: string;
}

export interface TaxAnalysisResult {
  client_id: string;
  client_name: string;
  period: string;
  profile: ClientProfile;
  opportunities: TaxOpportunity[];
  total_potential_saving: number;
  summary: AnalysisSummary;
}

export interface FinancialDataInput {
  toplam_hasilat: number;
  ihracat_hasilat: number;
  kv_matrahi: number;
  hesaplanan_kv: number;
  personel_sayisi: number;
  arge_personel: number;
  ortalama_maas: number;
  sektor: string;
  uretim_faaliyeti: boolean;
  sanayi_sicil: boolean;
  teknokent: boolean;
  teknokent_kazanc: number;
  arge_merkezi: boolean;
  yatirim_plani: boolean;
  istirak_temettu: number;
  yurt_disi_hizmet: number;
}

export const PRIORITY_CONFIG: Record<
  Priority,
  { color: string; label: string; icon: string }
> = {
  high: { color: '#cd3d64', label: 'Yuksek', icon: '!!' },
  medium: { color: '#f5a623', label: 'Orta', icon: '!' },
  low: { color: '#697386', label: 'Dusuk', icon: '-' },
};

export const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { color: string; label: string }
> = {
  low: { color: '#0caf60', label: 'Kolay' },
  medium: { color: '#f5a623', label: 'Orta' },
  high: { color: '#cd3d64', label: 'Zor' },
};

export const CATEGORY_CONFIG: Record<
  Category,
  { label: string; icon: string; color: string }
> = {
  KURUMLAR_VERGISI: {
    label: 'Kurumlar Vergisi',
    icon: '🏢',
    color: '#635bff',
  },
  AR_GE: {
    label: 'Ar-Ge Teshvikleri',
    icon: '🔬',
    color: '#0caf60',
  },
  TEKNOKENT: {
    label: 'Teknokent',
    icon: '💻',
    color: '#00b8d9',
  },
  YATIRIM: {
    label: 'Yatirim Teshvikleri',
    icon: '📈',
    color: '#f5a623',
  },
  OZEL_BOLGE: {
    label: 'Ozel Bolge',
    icon: '🏭',
    color: '#9061f9',
  },
  SGK: {
    label: 'SGK Teshvikleri',
    icon: '👥',
    color: '#e56f4a',
  },
};
