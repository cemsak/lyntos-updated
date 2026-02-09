/**
 * Risk Rules Tip Tanımları
 * Backend API ile uyumlu
 */

export interface Rule {
  rule_id: string;
  name: string;
  name_tr?: string;
  version: string;
  category: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description?: string;
  algorithm?: string;
  thresholds?: Record<string, unknown>;
  inputs?: Array<{ name: string; type: string; required: boolean; description?: string }>;
  legal_refs?: string[];
  evidence_required?: string[];
  inspector_questions?: string[];
  answer_templates?: string[];
  required_documents?: string[];
  source_type: 'yaml' | 'json' | 'python' | 'db';
  source_file?: string;
  is_active: number;
  is_deprecated: number;
  created_at: string;
  updated_at: string;
}

export interface RuleStats {
  total: number;
  active: number;
  deprecated: number;
  by_severity: Record<string, number>;
  by_source: Record<string, number>;
  pending_duplicates: number;
}

export interface Category {
  category: string;
  count: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface Duplicate {
  rule_id_1: string;
  rule_id_2: string;
  overlap_type: string;
  overlap_description: string;
  resolution: string;
  resolved_at?: string;
  resolved_by?: string;
  rule1_name?: string;
  rule2_name?: string;
}
