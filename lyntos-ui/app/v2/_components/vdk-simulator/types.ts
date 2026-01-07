/**
 * VDK Simulator Types
 * Sprint 8.0 - LYNTOS V2
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type DocumentPriority = 'critical' | 'high' | 'medium' | 'low';

export interface RequiredDocument {
  id: string;
  name: string;
  description: string;
  priority: DocumentPriority;
  uploaded?: boolean;
  uploaded_at?: string;
}

export interface KurganAlarm {
  rule_id: string;
  rule_name: string;
  category: string;
  severity: Severity;
  triggered: boolean;
  actual_value?: number | null;
  threshold_value?: number | null;
  sector_average?: number | null;
  deviation_percent?: number | null;
  finding_summary: string;
  details: Record<string, unknown>;
  inspector_questions: string[];
  required_documents: RequiredDocument[];
  legal_references: string[];
}

export interface SimulationResult {
  client_id: string;
  client_name: string;
  period: string;
  nace_code?: string | null;
  sector_group?: string | null;
  risk_score: number;
  risk_level: RiskLevel;
  alarms: KurganAlarm[];
  triggered_count: number;
  total_documents: number;
  prepared_documents: number;
  simulated_at: string;
}

export interface SimulationResponse {
  success: boolean;
  data: SimulationResult;
  note?: string;
}

export interface RulesResponse {
  success: boolean;
  data: {
    rules: RuleSummary[];
    total: number;
  };
}

export interface RuleSummary {
  id: string;
  name: string;
  category: string;
  severity: Severity;
  description: string;
}

// Severity configuration for UI
export const SEVERITY_CONFIG: Record<
  Severity,
  { color: string; label: string; bgColor: string; borderColor: string }
> = {
  critical: {
    color: '#cd3d64',
    label: 'Kritik',
    bgColor: 'bg-[#cd3d64]/10',
    borderColor: 'border-[#cd3d64]',
  },
  high: {
    color: '#e56f4a',
    label: 'Yuksek',
    bgColor: 'bg-[#e56f4a]/10',
    borderColor: 'border-[#e56f4a]',
  },
  medium: {
    color: '#f5a623',
    label: 'Orta',
    bgColor: 'bg-[#f5a623]/10',
    borderColor: 'border-[#f5a623]',
  },
  low: {
    color: '#0caf60',
    label: 'Dusuk',
    bgColor: 'bg-[#0caf60]/10',
    borderColor: 'border-[#0caf60]',
  },
};

// Risk level configuration
export const RISK_LEVEL_CONFIG: Record<
  RiskLevel,
  { color: string; label: string; bgColor: string }
> = {
  critical: { color: '#cd3d64', label: 'Kritik Risk', bgColor: 'bg-[#cd3d64]' },
  high: { color: '#e56f4a', label: 'Yuksek Risk', bgColor: 'bg-[#e56f4a]' },
  medium: { color: '#f5a623', label: 'Orta Risk', bgColor: 'bg-[#f5a623]' },
  low: { color: '#0caf60', label: 'Dusuk Risk', bgColor: 'bg-[#0caf60]' },
};

// Category labels for display
export const CATEGORY_LABELS: Record<string, string> = {
  VARLIK_ANALIZI: 'Varlik Analizi',
  ILISKILI_TARAF: 'Iliskili Taraf',
  STOK_ANALIZI: 'Stok Analizi',
  ALACAK_ANALIZI: 'Alacak Analizi',
  TREND_ANALIZI: 'Trend Analizi',
  TEDARIKCI_ANALIZI: 'Tedarikci Analizi',
};

// Document priority configuration
export const PRIORITY_CONFIG: Record<
  DocumentPriority,
  { color: string; label: string; icon: string }
> = {
  critical: { color: '#cd3d64', label: 'Kritik', icon: '!!' },
  high: { color: '#e56f4a', label: 'Yuksek', icon: '!' },
  medium: { color: '#f5a623', label: 'Orta', icon: '-' },
  low: { color: '#697386', label: 'Dusuk', icon: '.' },
};
