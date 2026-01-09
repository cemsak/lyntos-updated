/**
 * LYNTOS Corporate Law Module Types
 * Sprint S2 - Sirketler Hukuku
 */

// Corporate Event Type
export interface CorporateEventType {
  id: string;
  event_code: string;
  event_name: string;
  company_types: string[];
  required_documents: string[];
  gk_quorum: Record<string, { meeting: string | null; decision: string }> | null;
  registration_deadline: number | null;
  legal_basis: string;
  tax_implications: TaxImplications | null;
  min_capital: number | null;
  notes: string | null;
  is_active: boolean;
}

export interface TaxImplications {
  kv_istisna?: boolean;
  kdv_istisna?: boolean;
  damga_vergisi?: string;
  harc?: string;
  note?: string;
}

// TTK 376 Analysis
export interface TTK376Request {
  capital: number;
  legal_reserves: number;
  equity: number;
}

export interface TTK376Analysis {
  status: TTK376Status;
  loss_percentage: number;
  half_threshold: number;
  twothirds_threshold: number;
  recommendation: string;
  legal_basis: string;
}

export type TTK376Status = 'healthy' | 'half_loss' | 'twothirds_loss' | 'insolvent';

// Min Capital Requirements
export interface MinCapitalRequirements {
  effective_date: string;
  deadline_for_existing: string;
  requirements: {
    as: { min_capital: number; min_paid_at_registration: number; currency: string; legal_basis: string };
    as_registered: { min_capital: number; description: string; legal_basis: string };
    ltd: { min_capital: number; min_paid_at_registration: number; currency: string; legal_basis: string };
  };
  notes: string[];
}

// GK Quorum Guide
export interface GKQuorumGuide {
  as: Record<string, { meeting: string; decision: string }>;
  ltd: Record<string, { meeting: string | null; decision: string }>;
  legal_basis: string;
  notes: string[];
}

// Company Capital
export interface CompanyCapital {
  id: string;
  company_id: string;
  company_name: string;
  company_type: string;
  tax_number: string | null;
  current_capital: number;
  registered_capital: number | null;
  paid_capital: number;
  legal_reserves: number;
  equity: number;
  ttk376_status: TTK376Status;
  last_calculation_date: string;
}

// API Response wrappers
export interface EventTypesResponse {
  schema: { name: string; version: string; generated_at: string };
  data: {
    count: number;
    event_types: CorporateEventType[];
  };
}

export interface TTK376Response {
  schema: { name: string; version: string; generated_at: string };
  data: {
    input: TTK376Request;
    analysis: TTK376Analysis;
  };
}

export interface MinCapitalResponse {
  schema: { name: string; version: string; generated_at: string };
  data: MinCapitalRequirements;
}

// Category groupings
export const COMPANY_TYPE_LABELS: Record<string, string> = {
  as: 'A.S.',
  ltd: 'Ltd.S.',
  koop: 'Kooperatif',
};

export const CATEGORY_GROUPS: Record<string, { label: string; codes: string[] }> = {
  establishment: { label: 'Kurulus', codes: ['establishment_as', 'establishment_ltd'] },
  merger: { label: 'Birlesme', codes: ['merger_acquisition', 'merger_new_formation'] },
  demerger: { label: 'Bolunme', codes: ['demerger_full', 'demerger_partial'] },
  type_change: { label: 'Tur Degistirme', codes: ['type_change_ltd_to_as', 'type_change_as_to_ltd'] },
  capital: { label: 'Sermaye Islemleri', codes: ['capital_increase', 'capital_decrease', 'capital_simultaneous', 'min_capital_compliance'] },
  liquidation: { label: 'Tasfiye', codes: ['liquidation_start', 'liquidation_end'] },
  transfer: { label: 'Devir', codes: ['share_transfer_ltd'] },
};

export const TTK376_STATUS_CONFIG: Record<TTK376Status, { bg: string; border: string; icon: string; title: string }> = {
  healthy: {
    bg: 'bg-[#0caf60]/10',
    border: 'border-[#0caf60]',
    icon: 'check-circle',
    title: 'Saglikli',
  },
  half_loss: {
    bg: 'bg-[#f5a623]/10',
    border: 'border-[#f5a623]',
    icon: 'alert-triangle',
    title: 'Yari Sermaye Kaybi (TTK 376/1)',
  },
  twothirds_loss: {
    bg: 'bg-[#cd3d64]/10',
    border: 'border-[#cd3d64]',
    icon: 'alert-circle',
    title: '2/3 Sermaye Kaybi (TTK 376/2)',
  },
  insolvent: {
    bg: 'bg-[#cd3d64]/20',
    border: 'border-[#cd3d64]',
    icon: 'x-circle',
    title: 'Borca Batiklik (TTK 376/3)',
  },
};
