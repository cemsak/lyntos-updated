/**
 * LYNTOS API Configuration
 * Centralized API URL management
 */

// API Base URL - uses environment variable with fallback
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Helper to get API base (for use in functions)
export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
}

// API Endpoints
export const API_ENDPOINTS = {
  // V2 Endpoints (new sync system)
  donem: {
    sync: `${API_BASE_URL}/api/v2/donem/sync`,
    status: (periodId: string) => `${API_BASE_URL}/api/v2/donem/status/${encodeURIComponent(periodId)}`,
    clear: (periodId: string) => `${API_BASE_URL}/api/v2/donem/clear/${encodeURIComponent(periodId)}`,
  },
  mizan: {
    sync: `${API_BASE_URL}/api/v2/mizan/sync`,
    summary: (periodId: string) => `${API_BASE_URL}/api/v2/mizan/summary/${encodeURIComponent(periodId)}`,
    entries: (periodId: string) => `${API_BASE_URL}/api/v2/mizan/entries/${encodeURIComponent(periodId)}`,
    clear: (periodId: string) => `${API_BASE_URL}/api/v2/mizan/clear/${encodeURIComponent(periodId)}`,
  },
  crossCheck: {
    run: (periodId: string) => `${API_BASE_URL}/api/v2/cross-check/run/${encodeURIComponent(periodId)}`,
    status: (periodId: string) => `${API_BASE_URL}/api/v2/cross-check/status/${encodeURIComponent(periodId)}`,
  },
  // V1 Endpoints (existing)
  contracts: {
    kurganRisk: `${API_BASE_URL}/api/v1/contracts/kurgan-risk`,
    dataQuality: `${API_BASE_URL}/api/v1/contracts/data-quality`,
    crossCheck: `${API_BASE_URL}/api/v1/contracts/cross-check`,
    quarterlyTax: `${API_BASE_URL}/api/v1/contracts/quarterly-tax`,
    corporateTax: `${API_BASE_URL}/api/v1/contracts/corporate-tax`,
    corporateTaxForecast: `${API_BASE_URL}/api/v1/contracts/corporate-tax-forecast`,
    inflationAdjustment: `${API_BASE_URL}/api/v1/contracts/inflation-adjustment`,
    regwatchStatus: `${API_BASE_URL}/api/v1/contracts/regwatch-status`,
    actionableTasks: `${API_BASE_URL}/api/v1/contracts/actionable-tasks`,
  },
  chat: {
    corporate: `${API_BASE_URL}/api/v1/chat/corporate`,
    regwatch: `${API_BASE_URL}/api/v1/chat/regwatch`,
  },
  ai: {
    analyzeRegwatch: `${API_BASE_URL}/api/v1/ai/analyze/regwatch`,
    analyzeCompany: `${API_BASE_URL}/api/v1/ai/analyze/company`,
    analyzeBatch: `${API_BASE_URL}/api/v1/ai/analyze/batch`,
    analyses: `${API_BASE_URL}/api/v1/ai/analyses`,
  },
  registry: {
    companies: `${API_BASE_URL}/api/v1/registry/companies`,
    portfolio: (smmmId: string) => `${API_BASE_URL}/api/v1/registry/portfolio/${encodeURIComponent(smmmId)}`,
  },
  regwatch: {
    changes: `${API_BASE_URL}/api/v1/regwatch/changes`,
    stats: `${API_BASE_URL}/api/v1/regwatch/stats`,
  },
} as const;

// Helper to build URL with query params
export function buildUrl(baseUrl: string, params: Record<string, string | undefined>): string {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, value);
    }
  });
  return url.toString();
}

export default API_BASE_URL;
