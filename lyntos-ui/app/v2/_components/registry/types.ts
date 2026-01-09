/**
 * VERGUS Registry Types
 * Sprint T2
 */

export interface Company {
  id: string;
  tax_number: string;
  trade_registry_number: string | null;
  company_name: string;
  company_type: 'as' | 'ltd' | 'sahis' | 'koop' | 'sube';
  trade_registry_office: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  establishment_date: string | null;
  current_capital: number | null;
  paid_capital: number | null;
  currency: string;
  status: 'active' | 'liquidation' | 'closed' | 'merged';
  nace_code: string | null;
  activity_description: string | null;
  last_ttsg_issue: string | null;
  last_ttsg_date: string | null;
  ttsg_pdf_url: string | null;
  is_tracked: boolean;
  tracked_by: string | null;
  source: string;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string | null;
  recent_changes?: CompanyChange[];
}

export interface CompanyChange {
  id: string;
  company_id: string;
  tax_number: string;
  change_type: string;
  change_description: string | null;
  old_value: string | null;
  new_value: string | null;
  ttsg_issue: string | null;
  ttsg_date: string | null;
  ttsg_url: string | null;
  notification_sent: boolean;
  reviewed: boolean;
  detected_at: string;
}

export interface PortfolioItem {
  id: string;
  smmm_id: string;
  company_id: string | null;
  tax_number: string;
  company_name: string | null;
  relationship_type: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  notes: string | null;
  alert_preferences: Record<string, boolean> | null;
  company_details?: Company;
}

export interface TradeRegistryOffice {
  id: string;
  office_code: string;
  office_name: string;
  city: string;
  district: string | null;
  chamber_name: string | null;
  chamber_url: string | null;
  is_pilot: boolean;
  is_active: boolean;
}

export interface ChangeStats {
  total_30_days: number;
  by_type: Record<string, number>;
  unreviewed: number;
}

export interface TTSGSearchResult {
  company_name?: string;
  content?: string;
  change_type?: string;
  city?: string;
  source: string;
  scraped_at: string;
}

export const COMPANY_TYPE_LABELS: Record<string, string> = {
  as: 'Anonim Sirket (A.S.)',
  ltd: 'Limited Sirket (Ltd.)',
  sahis: 'Sahis Isletmesi',
  koop: 'Kooperatif',
  sube: 'Sube',
};

export const COMPANY_STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  active: { label: 'Aktif', color: 'green', icon: 'OK' },
  liquidation: { label: 'Tasfiye Halinde', color: 'orange', icon: '!' },
  closed: { label: 'Kapali', color: 'gray', icon: 'X' },
  merged: { label: 'Birlesmis', color: 'blue', icon: '+' },
};

export const CHANGE_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  establishment: { label: 'Kurulus', icon: '[+]' },
  capital_increase: { label: 'Sermaye Artirimi', icon: '[^]' },
  capital_decrease: { label: 'Sermaye Azaltimi', icon: '[v]' },
  address_change: { label: 'Adres Degisikligi', icon: '[@]' },
  board_change: { label: 'Yonetim Degisikligi', icon: '[*]' },
  merger: { label: 'Birlesme', icon: '[+]' },
  demerger: { label: 'Bolunme', icon: '[/]' },
  type_change: { label: 'Tur Degisikligi', icon: '[~]' },
  liquidation_start: { label: 'Tasfiyeye Giris', icon: '[!]' },
  liquidation_end: { label: 'Tasfiye Sonu', icon: '[x]' },
  share_transfer: { label: 'Hisse Devri', icon: '[>]' },
};
