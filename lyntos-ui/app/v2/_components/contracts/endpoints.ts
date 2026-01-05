export const API_BASE = '/api/v1';

export const ENDPOINTS = {
  TAXPAYERS: (tenantId: string) => `${API_BASE}/tenants/${tenantId}/taxpayers`,
  PERIODS: (tenantId: string, taxpayerId: string) => `${API_BASE}/tenants/${tenantId}/taxpayers/${taxpayerId}/periods`,
  PORTFOLIO: `${API_BASE}/contracts/portfolio`,
  KURGAN_RISK: `${API_BASE}/contracts/kurgan-risk`,
  DATA_QUALITY: `${API_BASE}/contracts/data-quality`,
  ACTIONABLE_TASKS: `${API_BASE}/contracts/actionable-tasks`,
  CORPORATE_TAX: `${API_BASE}/contracts/corporate-tax`,
  CORPORATE_TAX_FORECAST: `${API_BASE}/contracts/corporate-tax-forecast`,
  QUARTERLY_TAX: `${API_BASE}/contracts/quarterly-tax`,
  MIZAN_ANALYSIS: `${API_BASE}/contracts/mizan-analysis`,
  INFLATION_ADJUSTMENT: `${API_BASE}/contracts/inflation-adjustment`,
  CROSS_CHECK: `${API_BASE}/contracts/cross-check`,
  REGWATCH_STATUS: `${API_BASE}/contracts/regwatch-status`,
  SOURCES: `${API_BASE}/contracts/sources`,
  SOURCE_BY_ID: (id: string) => `${API_BASE}/contracts/sources/${id}`,
  EVIDENCE_RULES: `${API_BASE}/evidence/rules`,
  EVIDENCE_BUNDLE: (ruleId: string) => `${API_BASE}/evidence/bundle/${ruleId}`,
  EXPORT_PDF: `${API_BASE}/contracts/export-pdf`,
} as const;

export interface ScopeParams {
  smmm_id: string;
  client_id: string;
  period: string;
}

export function buildScopedUrl(endpoint: string, scope: ScopeParams): string {
  const params = new URLSearchParams({
    smmm_id: scope.smmm_id,
    client_id: scope.client_id,
    period: scope.period,
  });
  return `${endpoint}?${params.toString()}`;
}
