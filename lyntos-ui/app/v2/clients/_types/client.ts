/**
 * LYNTOS Mükellef Tipleri
 * Clients sayfası için tip tanımları
 */

export interface PeriodData {
  id?: string;
  period_id: string;
  period_label: string;
  status: string;
  data: {
    mizan: boolean;
    mizan_count?: number;
    beyanname: boolean;
    beyanname_count?: number;
    banka: boolean;
    banka_count?: number;
    edefter: boolean;
    edefter_count?: number;
    efatura?: boolean;
    tahakkuk: boolean;
    tahakkuk_count?: number;
  };
  analysis: {
    has_results: boolean;
    finding_count: number;
  };
}

export interface DataStatus {
  periods: PeriodData[];
  summary: {
    total_periods: number;
    complete_periods: number;
    data_complete: boolean;
    has_mizan: boolean;
    missing_data: string[] | null;
  };
}

export interface Taxpayer {
  id: string;
  name: string;
  vkn: string;
  vkn_full?: string;
  active: boolean;
  data_status: DataStatus;
}

export type AddModalTab = 'manual' | 'bulk' | 'pdf';

export interface ParsedTaxpayer {
  name: string;
  vkn: string;
  type?: 'limited' | 'anonim' | 'sahis';
  valid: boolean;
  error?: string;
}

export interface VergiLevhasiData {
  unvan: string;
  vkn: string;
  vergiDairesi?: string;
  faaliyet?: string;
  valid: boolean;
  error?: string;
}

export interface NewClientForm {
  name: string;
  vkn: string;
  type: 'limited' | 'anonim' | 'sahis';
}

export interface BulkError {
  satir: number;
  vkn: string;
  hata: string;
}
