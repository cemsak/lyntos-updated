// ════════════════════════════════════════════════════════════════════════════
// LYNTOS Dashboard V2 - Shared TypeScript Interfaces
// Contract-driven types based on API response shapes
// ════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE ENVELOPE (All endpoints return this structure)
// ─────────────────────────────────────────────────────────────────────────────

export interface ResponseEnvelope<T> {
  schema: {
    name: string;
    version: string;
    generated_at: string;
  };
  meta: {
    smmm_id: string;
    client_id: string;
    period: string;
    request_id: string;
    trust_level: string;
  };
  data: T;
  errors: string[];
  warnings: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYSIS PATTERN (Expert = Authoritative, AI = Secondary)
// ─────────────────────────────────────────────────────────────────────────────

export interface ExpertAnalysis {
  reason_tr: string;
  method: string;
  legal_basis_refs: string[];
  evidence_refs: string[];
  trust_score: number; // Always 1.0 for expert
  computed_at: string;
  score?: number;
}

export interface AiAnalysis {
  confidence: number;
  suggestion: string;
  disclaimer: string; // MANDATORY
  evidence_refs: string[];
  trust_score: number; // Usually 0.0
  model: string;
  computed_at: string;
}

export interface Analysis {
  expert: ExpertAnalysis;
  ai: AiAnalysis;
}

// ─────────────────────────────────────────────────────────────────────────────
// KURGAN RISK
// ─────────────────────────────────────────────────────────────────────────────

export interface KurganRiskScore {
  score: number;
  risk_level: string;
  warnings: string[];
  action_items: string[];
  criteria_scores: Record<string, number>;
  analysis: Analysis;
}

export interface KurganRiskData {
  kurgan_risk: KurganRiskScore;
  legal_basis_refs: string[];
  trust_score: number;
  vdk_reference: string;
  what_to_do: string[];
  time_estimate: string;
  effective_date: string;
  checklist_url: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUARTERLY TAX
// ─────────────────────────────────────────────────────────────────────────────

export interface QuarterData {
  current_profit: number;
  annual_estimate: number;
  calculated_tax: number;
  payable: number;
  previous_payments?: number;
}

export interface YearEndProjection {
  estimated_annual_profit: number;
  estimated_tax_base: number;
  estimated_corporate_tax: number;
  quarterly_offset: number;
  estimated_payable_or_refund: number;
  confidence: string;
}

export interface QuarterlyTaxData {
  ok: boolean;
  Q1: QuarterData;
  Q2: QuarterData;
  year_end_projection: YearEndProjection;
  legal_basis_refs: string[];
  trust_score: number;
  analysis: Analysis;
}

// ─────────────────────────────────────────────────────────────────────────────
// CORPORATE TAX
// ─────────────────────────────────────────────────────────────────────────────

export interface CorporateTaxData {
  ticari_kar: number;
  mali_kar: number;
  matrah: number;
  vergi_orani: number;
  hesaplanan_vergi: number;
  indirimler: number;
  mahsuplar: number;
  odenecek_vergi: number;
  iade_edilecek_vergi: number;
  legal_basis_refs: string[];
  trust_score: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-CHECK
// ─────────────────────────────────────────────────────────────────────────────

export interface CrossCheckItem {
  type: string;
  name: string;
  status: 'ok' | 'warning' | 'error' | 'skipped';
  source_a: string;
  source_b: string;
  value_a: number;
  value_b: number;
  difference: number;
  tolerance: number;
  reason: string;
  actions: string[];
  legal_basis: string;
}

export interface CrossCheckSummary {
  total_checks: number;
  ok: number;
  warnings: number;
  errors: number;
  skipped: number;
  overall_status: string;
}

export interface CrossCheckData {
  checks: CrossCheckItem[];
  summary: CrossCheckSummary;
  analysis: Analysis;
  trust_score: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA QUALITY
// ─────────────────────────────────────────────────────────────────────────────

export interface DataQualityData {
  completeness_score: number;
  kurgan_score: number;
  errors: string[];
  warnings: string[];
  tasks: Array<{
    id: string;
    title: string;
    priority: string;
    time_estimate: string;
  }>;
  total_time: string;
  legal_basis_refs: string[];
  trust_score: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIONABLE TASKS
// ─────────────────────────────────────────────────────────────────────────────

export interface ActionableTask {
  id: string;
  title: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  time_estimate: string;
  deadline: string;
  category: string;
  action_url?: string;
  dependencies?: string[];
}

export interface ActionableTasksData {
  tasks: ActionableTask[];
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
    total_time: string;
  };
  message: string;
  legal_basis_refs: string[];
  trust_score: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// MIZAN ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

export interface MizanAccount {
  hesap_kodu: string;
  hesap_adi: string;
  borc: number;
  alacak: number;
  bakiye: number;
  bakiye_turu: 'B' | 'A';
  status: 'OK' | 'WARN' | 'ERROR';
  anomaly?: string;
  vdk_threshold?: number;
}

export interface MizanAnalysisData {
  accounts: MizanAccount[];
  summary: {
    total_accounts: number;
    ok: number;
    warn: number;
    error: number;
    total_borc: number;
    total_alacak: number;
  };
  analysis: Analysis;
}

// ─────────────────────────────────────────────────────────────────────────────
// INFLATION ADJUSTMENT (TMS 29)
// ─────────────────────────────────────────────────────────────────────────────

export interface TufeEndeksi {
  baslangic: number;
  bitis: number;
  katsayi: number;
  artis_orani: number;
  donem: string;
}

export interface ParasalPozisyon {
  parasal_varliklar: number;
  parasal_borclar: number;
  net_parasal_pozisyon: number;
  enflasyon_kaybi_kazanci: number;
}

export interface DuzeltmeFarklari {
  '648': number;
  '658': number;
  '698': number;
}

export interface YevmiyeKaydi {
  tarih: string;
  aciklama: string;
  borc_hesap: string;
  alacak_hesap: string;
  tutar: number;
}

export interface InflationAdjustmentData {
  ok: boolean;
  donem: string;
  tufe_endeksi: TufeEndeksi;
  parasal_pozisyon: ParasalPozisyon;
  parasal_olmayan_kalemler: Array<{
    hesap_kodu: string;
    hesap_adi: string;
    bakiye: number;
    duzeltme: number;
  }>;
  duzeltme_farklari: DuzeltmeFarklari;
  vergi_etkisi: {
    matrah_degisimi: number;
    vergi_etkisi: number;
  };
  yevmiye_kayitlari: YevmiyeKaydi[];
  analysis: Analysis;
  missing_data?: {
    reason: string;
    required_docs: string[];
    actions: string[];
  };
  required_actions?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// REGWATCH
// ─────────────────────────────────────────────────────────────────────────────

export interface RegWatchPeriod {
  changes: number;
  status: string;
  message?: string;
  sources?: string[];
  last_check?: string;
}

export interface RegWatchSource {
  id: string;
  name: string;
  url: string;
  frequency: string;
}

export interface RegWatchData {
  last_7_days: RegWatchPeriod;
  last_30_days: RegWatchPeriod;
  sources: RegWatchSource[];
  trust_score: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PERIOD COMPLETENESS
// ─────────────────────────────────────────────────────────────────────────────

export interface DocDetail {
  doc_type: string;
  count: number;
  parse_status: 'OK' | 'WARN' | 'ERROR';
  time_shield_status: 'PASS' | 'WARN' | 'REJECT';
}

export interface CompletenessData {
  required: string[];
  optional: string[];
  present: string[];
  missing_required: string[];
  missing_optional: string[];
  is_complete: boolean;
  reason: string;
  actions: string[];
  doc_details: DocDetail[];
}

// ─────────────────────────────────────────────────────────────────────────────
// SOURCES
// ─────────────────────────────────────────────────────────────────────────────

export interface SourceItem {
  id: string;
  title: string;
  kapsam: string;
  url: string;
  updated_at: string;
}

export interface SourcesData {
  sources: SourceItem[];
  total: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD DATA (Aggregated)
// ─────────────────────────────────────────────────────────────────────────────

export interface DashboardData {
  kurgan: ResponseEnvelope<KurganRiskData> | null;
  quarterlyTax: ResponseEnvelope<QuarterlyTaxData> | null;
  corporateTax: ResponseEnvelope<CorporateTaxData> | null;
  dataQuality: ResponseEnvelope<DataQualityData> | null;
  crossCheck: ResponseEnvelope<CrossCheckData> | null;
  actionableTasks: ResponseEnvelope<ActionableTasksData> | null;
  regwatch: ResponseEnvelope<RegWatchData> | null;
  mizanAnalysis: ResponseEnvelope<MizanAnalysisData> | null;
  inflation: ResponseEnvelope<InflationAdjustmentData> | null;
  completeness: ResponseEnvelope<CompletenessData> | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT PROPS
// ─────────────────────────────────────────────────────────────────────────────

export interface PanelProps<T> {
  data: T | null;
  error?: string;
  onExplain?: (data: ExplainData) => void;
}

export interface ExplainData {
  title: string;
  score?: number;
  reason: string;
  method?: string;
  legal_basis?: string;
  legal_basis_refs?: string[];
  evidence_refs: string[];
  trust_score: number;
  isAi?: boolean;
  aiConfidence?: number;
  aiDisclaimer?: string;
}

export interface DashboardContext {
  smmm: string;
  client: string;
  period: string;
}
