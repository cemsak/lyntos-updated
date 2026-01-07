/**
 * Tax Certificate (Vergi Levhası) Types
 * Sprint 7.4 - LYNTOS V2
 */

export interface TaxCertificateData {
  vkn: string;
  companyName: string;
  naceCode?: string;
  naceDescription?: string;
  taxOffice?: string;
  address?: string;
  city?: string;
  district?: string;
  kvMatrah?: string;
  kvPaid?: string;
  year?: number;
}

export interface NaceInfo {
  code: string;
  description: string;
  sectorGroup: string;
  riskProfile: 'low' | 'medium' | 'high' | 'critical';
  kCriteria: string[];
  avgMargin?: number;
  riskWeight?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface YearComparison {
  previousYear?: number;
  previousMatrah?: string;
  matrahChangePercent?: number;
}

export interface UploadResponse {
  success: boolean;
  requiresManualEntry: boolean;
  message?: string;
  validation?: ValidationResult;
  parsedData?: TaxCertificateData;
  vknMatch?: boolean;
  clientVkn?: string;
  clientName?: string;
  naceInfo?: NaceInfo;
  comparison?: YearComparison;
}

export interface ConfirmResponse {
  success: boolean;
  certificateId?: string;
  activatedKCriteria?: string[];
  message?: string;
}

export interface TaxCertificate {
  id: string;
  year: number;
  naceCode?: string;
  naceDescription?: string;
  kvMatrah?: string;
  kvPaid?: string;
  companyName: string;
  taxOffice?: string;
  uploadedAt: string;
}

export interface NaceCode {
  code: string;
  description_tr: string;
  sector_group: string;
  risk_profile: 'low' | 'medium' | 'high' | 'critical';
  k_criteria: string[];
}

// K-Criteria descriptions
export const K_CRITERIA_LABELS: Record<string, string> = {
  'K-09': 'Kasa Yoğunluk Analizi',
  'K-15': 'Ortaklara Borç/Alacak',
  'K-22': 'Stok Devir Hızı',
  'K-24': 'Amortisman/Sabit Varlık',
  'K-31': 'Gayrimenkul İşlemi',
};

// Risk profile colors
export const RISK_PROFILE_COLORS = {
  low: { bg: 'bg-[#0caf60]/10', text: 'text-[#0caf60]', label: 'Düşük' },
  medium: { bg: 'bg-[#f5a623]/10', text: 'text-[#f5a623]', label: 'Orta' },
  high: { bg: 'bg-[#e56f4a]/10', text: 'text-[#e56f4a]', label: 'Yüksek' },
  critical: { bg: 'bg-[#cd3d64]/10', text: 'text-[#cd3d64]', label: 'Kritik' },
};
