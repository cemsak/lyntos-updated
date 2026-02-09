/**
 * Enflasyon modülü tip tanımları
 */

// Step Card Props
export interface StepCardProps {
  step: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  status: 'completed' | 'current' | 'locked';
  detailedSteps?: string[];
  onStart: () => void;
  onMarkComplete: () => void;
  index: number;
}

// Animated Number Props
export interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

// Inflation Gauge Props
export interface InflationGaugeProps {
  katsayi: number;
  size?: number;
}

// Step Definition
export interface EnflasyonStep {
  step: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  detailedSteps: string[];
}

// Tab Types
export type EnflasyonTab = 'genel' | 'siniflandirma' | 'endeksler' | 'bilgi';
