/**
 * Document Checklist Types
 * Sprint 8.2 - LYNTOS V2
 */

export type DocumentStatus = 'pending' | 'uploaded' | 'verified' | 'waiting';
export type Priority = 'critical' | 'high' | 'medium' | 'low';

export interface DocumentItem {
  document_id: string;
  name: string;
  description: string;
  priority: Priority;
  status: DocumentStatus;
  file_name?: string;
  file_url?: string;
  uploaded_at?: string;
  notes?: string;
}

export interface AlarmChecklist {
  rule_id: string;
  rule_name: string;
  severity: string;
  finding_summary: string;
  documents: DocumentItem[];
}

export interface ChecklistStats {
  total: number;
  ready: number;
  pending: number;
  progress_percent: number;
}

export interface ChecklistResponse {
  client_id: string;
  client_name: string;
  period: string;
  stats: ChecklistStats;
  checklist: AlarmChecklist[];
}

export const PRIORITY_CONFIG: Record<
  Priority,
  { color: string; label: string; order: number }
> = {
  critical: { color: '#cd3d64', label: 'Kritik', order: 0 },
  high: { color: '#e56f4a', label: 'Yuksek', order: 1 },
  medium: { color: '#f5a623', label: 'Orta', order: 2 },
  low: { color: '#697386', label: 'Dusuk', order: 3 },
};

export const STATUS_CONFIG: Record<
  DocumentStatus,
  { color: string; label: string; icon: string }
> = {
  uploaded: { color: '#0caf60', label: 'Yuklendi', icon: '✅' },
  verified: { color: '#0caf60', label: 'Dogrulandi', icon: '☑' },
  waiting: { color: '#f5a623', label: 'Bekleniyor', icon: '⏳' },
  pending: { color: '#cd3d64', label: 'Eksik', icon: '❌' },
};
