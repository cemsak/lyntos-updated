/**
 * LYNTOS Risk Review Types
 * Inspired by Stripe Radar, adapted for VDK tax audit
 */

export type RiskLevel = 'kritik' | 'yuksek' | 'orta' | 'dusuk';

export type ReviewStatus =
  | 'pending'
  | 'approved'
  | 'flagged'
  | 'corrected'
  | 'investigating';

export interface RiskFactor {
  id: string;
  kod: string;
  baslik: string;
  aciklama: string;
  multiplier: number;
  deger: string | number;
  esik: string | number;
  birim?: string;
  seviye: RiskLevel;
}

export interface RiskReviewItem {
  id: string;
  mukellefId: string;
  mukellefAdi: string;
  mukellefVkn?: string;
  sektor?: string;
  donem: string;
  riskSkoru: number;
  riskLevel: RiskLevel;
  topRiskFactors: RiskFactor[];
  status: ReviewStatus;
  assignedTo?: string;
  createdAt: string;
  updatedAt?: string;
  aiOnerisi?: string;
}

export interface RiskQueueStats {
  toplam: number;
  kritik: number;
  yuksek: number;
  orta: number;
  dusuk: number;
  bekleyen: number;
}

export interface RiskQueueFilters {
  riskLevel?: RiskLevel[];
  status?: ReviewStatus[];
  donem?: string;
  search?: string;
  sortBy?: 'skor' | 'tarih' | 'mukellef';
  sortOrder?: 'asc' | 'desc';
}

export const RISK_LEVEL_CONFIG: Record<RiskLevel, {
  label: string;
  labelEn: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
}> = {
  kritik: {
    label: 'KRİTİK',
    labelEn: 'CRITICAL',
    icon: '🔴',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
    dotColor: 'bg-red-500',
  },
  yuksek: {
    label: 'YÜKSEK',
    labelEn: 'HIGH',
    icon: '🟠',
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
    dotColor: 'bg-orange-500',
  },
  orta: {
    label: 'ORTA',
    labelEn: 'MEDIUM',
    icon: '🟡',
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    dotColor: 'bg-amber-500',
  },
  dusuk: {
    label: 'DÜŞÜK',
    labelEn: 'LOW',
    icon: '🟢',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
    dotColor: 'bg-green-500',
  },
};

export const REVIEW_STATUS_CONFIG: Record<ReviewStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  pending: {
    label: 'Bekliyor',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
  },
  approved: {
    label: 'Temiz',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  flagged: {
    label: 'Riskli',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  corrected: {
    label: 'Düzeltildi',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  investigating: {
    label: 'İnceleniyor',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
};

export function getRiskLevelFromScore(score: number): RiskLevel {
  if (score >= 80) return 'kritik';
  if (score >= 65) return 'yuksek';
  if (score >= 40) return 'orta';
  return 'dusuk';
}

export function formatRiskScore(score: number): string {
  return score.toFixed(0);
}
