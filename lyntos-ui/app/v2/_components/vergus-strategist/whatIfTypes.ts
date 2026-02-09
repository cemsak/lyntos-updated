/**
 * What-If Vergi Analizi Types & Constants
 * Sprint 9.1 - LYNTOS V2 Big 4 Enhancement
 */

export interface WhatIfScenario {
  id: string;
  name: string;
  description: string;
  category: 'istisna' | 'indirim' | 'tesvik' | 'optimizasyon';
  inputLabel: string;
  inputUnit: string;
  defaultValue: number;
  minValue: number;
  maxValue: number;
  calculate: (value: number, baseData: BaseFinancialData) => ScenarioResult;
  legalBasis: string;
  difficulty: 'kolay' | 'orta' | 'zor';
  applicableConditions: string[];
}

export interface BaseFinancialData {
  kvMatrahi: number;        // Kurumlar Vergisi Matrahi
  toplamHasilat: number;    // Toplam Hasilat
  ihracatHasilati: number;  // Ihracat Hasilati
  personelSayisi: number;   // Personel Sayisi
  argePersonel: number;     // Ar-Ge Personeli
  kvOrani: number;          // KV Orani (%25)
}

export interface ScenarioResult {
  currentTax: number;        // Mevcut Vergi
  newTax: number;            // Yeni Vergi
  saving: number;            // Tasarruf
  effectiveRate: number;     // Efektif Oran
  calculations: string[];    // Hesaplama Adimlari
  warnings?: string[];       // Uyarilar
  requirements?: string[];   // Gereklilikler
}

export interface WhatIfAnalysisProps {
  baseData?: Partial<BaseFinancialData>;
  clientId?: string;
  period?: string;
  onScenarioSelect?: (scenario: WhatIfScenario, result: ScenarioResult) => void;
}

// 2025 Guncel Vergi Oranlari
export const TAX_RATES_2025 = {
  kv: 0.25,                 // Kurumlar Vergisi %25
  kdv_normal: 0.20,         // KDV Normal %20
  kdv_indirimli: 0.10,      // KDV Indirimli %10
  stopaj_temettu: 0.10,     // Temettu Stopaji %10
};

// Senaryo Renkleri
export const CATEGORY_COLORS: Record<
  WhatIfScenario['category'],
  { bg: string; text: string; icon: string }
> = {
  istisna: { bg: 'bg-[#ECFDF5]', text: 'text-[#00804D]', icon: '🎯' },
  indirim: { bg: 'bg-[#E6F9FF]', text: 'text-[#0049AA]', icon: '📉' },
  tesvik: { bg: 'bg-[#E6F9FF]', text: 'text-[#0049AA]', icon: '🚀' },
  optimizasyon: { bg: 'bg-[#FFFBEB]', text: 'text-[#FA841E]', icon: '⚡' },
};
