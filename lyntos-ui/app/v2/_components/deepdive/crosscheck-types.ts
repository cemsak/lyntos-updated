export interface V2CrossCheckResult {
  period_id: string;
  tenant_id: string;
  client_id: string;
  total_checks: number;
  passed: number;
  failed: number;
  warnings: number;
  no_data: number;
  critical_issues: number;
  high_issues: number;
  overall_status: string;
  checks: Array<{
    check_id: string;
    check_name: string;
    check_name_tr: string;
    description: string;
    status: string;
    severity: string;
    source_label: string;
    source_value: number;
    target_label: string;
    target_value: number;
    difference: number;
    difference_percent: number;
    tolerance_amount?: number;
    tolerance_percent?: number;
    message: string;
    recommendation: string | null;
    evidence: Record<string, unknown> | null;
  }>;
}

export interface SahteFaturaRiskIndicator {
  kod: string;
  ad: string;
  aciklama: string;
  seviye: 'DUSUK' | 'ORTA' | 'YUKSEK' | 'KRITIK';
  puan: number;
  kaynak: 'vergi_levhasi' | 'ticaret_sicil' | 'sektor_analizi' | 'e_fatura' | 'vdk_ram';
  oneri: string;
  mevzuat?: string[];
}

export interface TedarikciRiskProfili {
  vkn: string;
  unvan: string;
  riskPuani: number;
  riskSeviyesi: 'DUSUK' | 'ORTA' | 'YUKSEK' | 'KRITIK';
  riskFaktorleri: string[];
  sonIslemTarihi: string;
  toplamAlimTutari: number;
  uyarilar: string[];
}

export interface SahteFaturaAnaliziResult {
  toplamRiskPuani: number;
  riskSeviyesi: 'DUSUK' | 'ORTA' | 'YUKSEK' | 'KRITIK';
  analizTarihi: string;
  incelenenTedarikciSayisi: number;
  riskliTedarikciSayisi: number;
  bulgular: SahteFaturaRiskIndicator[];
  riskliTedarikçiler: TedarikciRiskProfili[];
}

export type RiskSeviye = 'DUSUK' | 'ORTA' | 'YUKSEK' | 'KRITIK';
