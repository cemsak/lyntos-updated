export type PortfolioSummary = {
  smmm_id?: string;
  client_id?: string;
  period?: string;
  generated_at?: string;
  git_rev?: string;
  risks?: Array<{ code: string; title?: string; severity?: string }>;
};

export type RiskDetail = {
  code?: string;
  title?: string;
  severity?: string;
  value_found?: any;
  enriched_data?: any; // evidence_pack / audit_pack / audit_dossier burada
  // --- KURGAN layer (non-breaking) ---
  period_window?: { period?: string; start_date?: string; end_date?: string };
  data_quality?: {
    bank_rows_total?: number;
    bank_rows_in_period?: number;
    bank_rows_out_of_period?: number;
    sources_present?: string[];
    warnings?: string[];
  };
  kurgan_criteria_signals?: Array<{
    code: string;
    status: "OK" | "WARN" | "MISSING" | "UNKNOWN";
    score: number;
    weight?: number;
    rationale_tr?: string;
    evidence_refs?: Array<{ artifact_id: string; note?: string }>;
    missing_refs?: Array<{ code: string; title_tr: string; severity: "LOW" | "MEDIUM" | "HIGH"; how_to_fix_tr?: string }>;
  }>;
};
