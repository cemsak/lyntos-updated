// LYNTOS Design System Tokens

export const RISK_LEVELS = {
  KRITIK: {
    key: 'KRITIK',
    label: 'Kritik',
    icon: '🔴',
    color: {
      bg: 'bg-red-50',
      bgSolid: 'bg-red-600',
      border: 'border-red-200',
      text: 'text-red-700',
      textLight: 'text-red-100',
    },
    priority: 1,
  },
  YUKSEK: {
    key: 'YUKSEK',
    label: 'Yüksek',
    icon: '🟠',
    color: {
      bg: 'bg-orange-50',
      bgSolid: 'bg-orange-600',
      border: 'border-orange-200',
      text: 'text-orange-700',
      textLight: 'text-orange-100',
    },
    priority: 2,
  },
  ORTA: {
    key: 'ORTA',
    label: 'Orta',
    icon: '🟡',
    color: {
      bg: 'bg-amber-50',
      bgSolid: 'bg-amber-500',
      border: 'border-amber-200',
      text: 'text-amber-700',
      textLight: 'text-amber-100',
    },
    priority: 3,
  },
  DUSUK: {
    key: 'DUSUK',
    label: 'Düşük',
    icon: '🟢',
    color: {
      bg: 'bg-green-50',
      bgSolid: 'bg-green-600',
      border: 'border-green-200',
      text: 'text-green-700',
      textLight: 'text-green-100',
    },
    priority: 4,
  },
  NORMAL: {
    key: 'NORMAL',
    label: 'Normal',
    icon: '✓',
    color: {
      bg: 'bg-slate-50',
      bgSolid: 'bg-slate-500',
      border: 'border-slate-200',
      text: 'text-slate-600',
      textLight: 'text-slate-100',
    },
    priority: 5,
  },
} as const;

export type RiskLevel = keyof typeof RISK_LEVELS;

export const KURGAN_ACTIONS = {
  INCELEME: {
    key: 'INCELEME',
    label: 'İnceleme',
    color: 'bg-red-600',
    textColor: 'text-red-700',
    bgLight: 'bg-red-50',
    riskRange: [90, 100] as const,
  },
  IZAHA_DAVET: {
    key: 'IZAHA_DAVET',
    label: 'İzaha Davet',
    color: 'bg-orange-600',
    textColor: 'text-orange-700',
    bgLight: 'bg-orange-50',
    riskRange: [75, 89] as const,
  },
  BILGI_ISTEME: {
    key: 'BILGI_ISTEME',
    label: 'Bilgi İsteme',
    color: 'bg-amber-500',
    textColor: 'text-amber-700',
    bgLight: 'bg-amber-50',
    riskRange: [60, 74] as const,
  },
  TAKIP: {
    key: 'TAKIP',
    label: 'Takip',
    color: 'bg-blue-600',
    textColor: 'text-blue-700',
    bgLight: 'bg-blue-50',
    riskRange: [0, 59] as const,
  },
} as const;

export type KurganAction = keyof typeof KURGAN_ACTIONS;

// Oran kategorileri
export const ORAN_KATEGORILERI = {
  LIKIDITE: {
    key: 'LIKIDITE',
    label: 'Likidite',
    icon: '💧',
    color: 'bg-blue-500',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-700',
  },
  FAALIYET: {
    key: 'FAALIYET',
    label: 'Faaliyet',
    icon: '⚙️',
    color: 'bg-purple-500',
    bgLight: 'bg-purple-50',
    textColor: 'text-purple-700',
  },
  MALI_YAPI: {
    key: 'MALI_YAPI',
    label: 'Mali Yapı',
    icon: '🏛️',
    color: 'bg-indigo-500',
    bgLight: 'bg-indigo-50',
    textColor: 'text-indigo-700',
  },
  KARLILIK: {
    key: 'KARLILIK',
    label: 'Karlılık',
    icon: '📈',
    color: 'bg-emerald-500',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-700',
  },
} as const;

export type OranKategorisi = keyof typeof ORAN_KATEGORILERI;

// Helper functions
export function getRiskLevelFromScore(score: number): RiskLevel {
  if (score >= 80) return 'KRITIK';
  if (score >= 60) return 'YUKSEK';
  if (score >= 40) return 'ORTA';
  if (score >= 20) return 'DUSUK';
  return 'NORMAL';
}

export function getKurganActionFromScore(score: number): KurganAction {
  if (score >= 90) return 'INCELEME';
  if (score >= 75) return 'IZAHA_DAVET';
  if (score >= 60) return 'BILGI_ISTEME';
  return 'TAKIP';
}

export function getRiskLevelConfig(level: RiskLevel) {
  return RISK_LEVELS[level];
}

export function getKurganActionConfig(action: KurganAction) {
  return KURGAN_ACTIONS[action];
}
