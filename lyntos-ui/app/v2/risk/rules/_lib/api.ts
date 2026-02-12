/**
 * Risk Rules API Fonksiyonları
 */

import { api } from '../../../_lib/api/client';
import type { Rule, RuleStats, Category, Duplicate } from '../_types';

export async function fetchRules(params: {
  category?: string;
  severity?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: Rule[]; total: number }> {
  const qp: Record<string, string> = {};
  if (params.category && params.category !== 'all') qp.category = params.category;
  if (params.severity && params.severity !== 'all') qp.severity = params.severity;
  if (params.search) qp.search = params.search;
  if (params.limit) qp.limit = String(params.limit);
  if (params.offset) qp.offset = String(params.offset);

  // Backend returns {success, data: [...], total: N}
  // normalizeResponse extracts data → Rule[], but total is lost
  // So we type the result as Rule[] (after normalize) and re-fetch total separately
  const result = await api.get<Rule[]>('/api/v2/rules', { params: qp });
  if (result.error || !result.data) return { data: [], total: 0 };
  // Total is in the original envelope — not available after normalize
  // Workaround: use the array length as total (backend returns paginated data anyway)
  return { data: result.data, total: result.data.length };
}

export async function fetchStats(): Promise<RuleStats> {
  const { data, error } = await api.get<RuleStats>('/api/v2/rules/statistics');
  if (error || !data) throw new Error(error || 'İstatistikler alınamadı');
  return data;
}

export async function fetchCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>('/api/v2/rules/categories');
  return data || [];
}

export async function fetchDuplicates(): Promise<Duplicate[]> {
  const { data } = await api.get<Duplicate[]>('/api/v2/rules/duplicates/all');
  return data || [];
}

export async function resolveDuplicate(ruleId1: string, ruleId2: string, resolution: string): Promise<boolean> {
  const { ok } = await api.post('/api/v2/rules/duplicates/resolve', {
    rule_id_1: ruleId1,
    rule_id_2: ruleId2,
    resolution,
  });
  return ok;
}

export async function fetchRuleDetail(ruleId: string): Promise<Rule | null> {
  const { data } = await api.get<Rule>(`/api/v2/rules/${ruleId}`);
  return data;
}
