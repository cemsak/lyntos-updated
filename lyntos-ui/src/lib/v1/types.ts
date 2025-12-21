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
};
