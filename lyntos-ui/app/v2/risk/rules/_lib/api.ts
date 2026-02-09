/**
 * Risk Rules API Fonksiyonları
 */

import { API_BASE_URL } from '../../../_lib/config/api';
import type { Rule, RuleStats, Category, Duplicate } from '../_types';

export async function fetchRules(params: {
  category?: string;
  severity?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: Rule[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params.category && params.category !== 'all') searchParams.set('category', params.category);
  if (params.severity && params.severity !== 'all') searchParams.set('severity', params.severity);
  if (params.search) searchParams.set('search', params.search);
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.offset) searchParams.set('offset', String(params.offset));

  const res = await fetch(`${API_BASE_URL}/api/v2/rules?${searchParams}`);
  const json = await res.json();
  return { data: json.data || [], total: json.total || 0 };
}

export async function fetchStats(): Promise<RuleStats> {
  const res = await fetch(`${API_BASE_URL}/api/v2/rules/statistics`);
  const json = await res.json();
  return json.data;
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE_URL}/api/v2/rules/categories`);
  const json = await res.json();
  return json.data || [];
}

export async function fetchDuplicates(): Promise<Duplicate[]> {
  const res = await fetch(`${API_BASE_URL}/api/v2/rules/duplicates/all`);
  const json = await res.json();
  return json.data || [];
}

export async function resolveDuplicate(ruleId1: string, ruleId2: string, resolution: string): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/api/v2/rules/duplicates/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rule_id_1: ruleId1, rule_id_2: ruleId2, resolution })
  });
  return res.ok;
}

export async function fetchRuleDetail(ruleId: string): Promise<Rule | null> {
  const res = await fetch(`${API_BASE_URL}/api/v2/rules/${ruleId}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}
