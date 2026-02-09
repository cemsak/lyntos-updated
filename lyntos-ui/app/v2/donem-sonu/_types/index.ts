/**
 * Dönem Sonu İşlemleri - Type Definitions
 */

import { type ReactNode } from 'react';

export interface WizardStep {
  id: number;
  title: string;
  description: string;
  detailedInfo: string;
  status: 'completed' | 'current' | 'pending';
  icon: ReactNode;
  href: string;
  estimatedTime: string;
  category: 'veri' | 'hesaplama' | 'vergi' | 'rapor';
}

export type KpiStatus = 'success' | 'warning' | 'error' | 'neutral' | 'info';

export interface KpiCardProps {
  label: string;
  value: string;
  subValue?: string;
  status?: KpiStatus;
  icon?: ReactNode;
  animate?: boolean;
}

export interface StepCardProps {
  step: WizardStep;
  index: number;
  onStepClick: (step: WizardStep) => void;
  onMarkComplete: (stepId: number) => void;
  isCompleted: boolean;
}

export interface AlertBannerProps {
  variant: 'info' | 'warning' | 'success' | 'error';
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: ReactNode;
}

export interface HeaderSectionProps {
  completedCount: number;
  progressPercent: number;
  onDownloadReport: () => void;
  onResetProgress: () => void;
}

export interface KpiStripProps {
  progressPercent: number;
  completedCount: number;
  hasData: boolean;
  effectiveCompletedSteps: number[];
}

export interface ChecklistItem {
  id: number;
  text: string;
  stepId: number;
  icon: ReactNode;
}

export interface ChecklistProps {
  items: ChecklistItem[];
  effectiveCompletedSteps: number[];
}

export interface WizardStepsPanelProps {
  steps: WizardStep[];
  effectiveCompletedSteps: number[];
  getStepStatus: (stepId: number) => 'completed' | 'current' | 'pending';
  onStepClick: (step: WizardStep) => void;
  onMarkComplete: (stepId: number) => void;
}

export interface QuickLinksProps {
  onNavigate: (path: string) => void;
}
