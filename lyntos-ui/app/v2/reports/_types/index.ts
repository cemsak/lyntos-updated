/**
 * Reports Tip Tanımları
 */

import type { LucideIcon } from 'lucide-react';

export interface RaporTipi {
  id: string;
  name: string;
  description: string;
  detailedInfo: string;
  icon: LucideIcon;
  color: 'blue' | 'purple' | 'green' | 'orange' | 'emerald' | 'red';
  available: boolean;
  requiresData: boolean;
  category: 'analiz' | 'vergi' | 'risk' | 'denetim';
  outputFormats: ('PDF' | 'Excel' | 'Word')[];
  viewPath: string;
}

export interface OlusturulanRapor {
  id: string;
  raporTipiId: string;
  name: string;
  createdAt: string;
  donem: string;
  mukellef: string;
  format: 'PDF' | 'Excel' | 'Word';
  size?: string;
  downloadUrl?: string;
}
