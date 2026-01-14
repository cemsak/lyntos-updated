/**
 * LYNTOS Intelligence Feed Types
 * Sprint 2.2 - Anayasa Compliance
 */

export type FeedCategory =
  | 'VDK'
  | 'Mizan'
  | 'GV'
  | 'KV'
  | 'Mutabakat'
  | 'Enflasyon'
  | 'Mevzuat'
  | 'Hukuk'
  | 'Pratik'
  | 'Belge'
  | 'Vergus';

export type FeedSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface FeedScope {
  smmm_id: string;
  client_id: string;
  period: string;
}

export interface FeedImpact {
  amount_try?: number;
  pct?: number;
  points?: number;
}

export interface FeedAction {
  label: string;
  action: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface FeedItem {
  id: string;
  scope: FeedScope;
  category: FeedCategory;
  severity: FeedSeverity;
  score: number;
  impact: FeedImpact;
  title: string;
  summary: string;
  evidence_refs: string[];
  actions: FeedAction[];
  dedupe_key?: string;
  expires_at?: string;
  snoozeable?: boolean;
  created_at?: string;
}

// Severity configuration
export const SEVERITY_CONFIG: Record<FeedSeverity, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}> = {
  CRITICAL: {
    label: 'Kritik',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-l-red-500',
    icon: '🚨',
  },
  HIGH: {
    label: 'Yüksek',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-l-orange-500',
    icon: '⚠️',
  },
  MEDIUM: {
    label: 'Orta',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-l-amber-500',
    icon: '📋',
  },
  LOW: {
    label: 'Düşük',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-l-blue-500',
    icon: '📝',
  },
  INFO: {
    label: 'Bilgi',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-l-slate-300',
    icon: 'ℹ️',
  },
};

// Category configuration
export const CATEGORY_CONFIG: Record<FeedCategory, {
  label: string;
  icon: string;
  color: string;
}> = {
  VDK: { label: 'VDK Risk', icon: '🎯', color: 'text-red-600' },
  Mizan: { label: 'Mizan', icon: '📊', color: 'text-blue-600' },
  GV: { label: 'Geçici Vergi', icon: '💰', color: 'text-green-600' },
  KV: { label: 'Kurumlar Vergisi', icon: '🏢', color: 'text-purple-600' },
  Mutabakat: { label: 'Mutabakat', icon: '✓', color: 'text-emerald-600' },
  Enflasyon: { label: 'Enflasyon', icon: '📈', color: 'text-amber-600' },
  Mevzuat: { label: 'Mevzuat', icon: '📡', color: 'text-indigo-600' },
  Hukuk: { label: 'Şirketler Hukuku', icon: '⚖️', color: 'text-slate-600' },
  Pratik: { label: 'Pratik Bilgi', icon: '💡', color: 'text-cyan-600' },
  Belge: { label: 'Eksik Belge', icon: '📁', color: 'text-orange-600' },
  Vergus: { label: 'Vergi Stratejisi', icon: '✨', color: 'text-violet-600' },
};
