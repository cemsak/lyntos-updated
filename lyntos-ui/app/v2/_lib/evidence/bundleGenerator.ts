/**
 * LYNTOS Evidence Bundle Generator
 * Sprint 5.7 - Kanıt Paketi Üretici
 *
 * Rule Engine sonuçlarını VDK/denetim dosyasına hazır
 * yapılandırılmış bir kanıt paketine dönüştürür.
 */

import type { EngineExecutionResult, RuleResult } from '../rule-engine/types';

// ═══════════════════════════════════════════════════════════════════
// TİP TANIMLARI
// ═══════════════════════════════════════════════════════════════════

export interface EvidenceItem {
  id: string;
  ruleId: string;
  ruleName: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  finding: string;
  explanation: string;
  legalBasis: string[];
  evidenceRefs: {
    type: string;
    source: string;
    value: string | number;
  }[];
  recommendedActions: {
    action: string;
    priority: string;
    assignee: string;
  }[];
  impact: {
    area: string;
    issue: string;
    estimatedAmount?: number;
  };
  timestamp: string;
}

export interface EvidenceSection {
  id: string;
  title: string;
  description: string;
  items: EvidenceItem[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface EvidenceBundle {
  // Meta
  id: string;
  generatedAt: string;
  version: string;

  // Kapsam
  scope: {
    taxpayerId: string;
    taxpayerName: string;
    taxNumber: string;
    period: string;
    smmmId: string;
    smmmName: string;
  };

  // Özet
  executiveSummary: {
    totalFindings: number;
    criticalFindings: number;
    highFindings: number;
    mediumFindings: number;
    lowFindings: number;
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    overallAssessment: string;
  };

  // Bölümler
  sections: {
    dataValidation: EvidenceSection;      // Phase 0
    calculations: EvidenceSection;         // Phase 1
    vdkAnalysis: EvidenceSection;          // Phase 2
    crossChecks: EvidenceSection;          // Phase 3
  };

  // VDK Kriterleri Özeti
  vdkSummary: {
    criteria: {
      code: string;
      name: string;
      status: 'PASSED' | 'WARNING' | 'FAILED';
      findings: string[];
    }[];
    totalCriteria: number;
    passedCriteria: number;
    failedCriteria: number;
  };

  // Aksiyonlar
  actionPlan: {
    immediate: { action: string; rule: string; deadline: string }[];
    shortTerm: { action: string; rule: string; deadline: string }[];
    monitoring: { action: string; rule: string; frequency: string }[];
  };

  // İmza Alanları
  signatures: {
    preparedBy: { name: string; title: string; date: string };
    reviewedBy: { name: string; title: string; date: string };
    approvedBy: { name: string; title: string; date: string };
  };
}

// ═══════════════════════════════════════════════════════════════════
// HELPER FONKSİYONLAR
// ═══════════════════════════════════════════════════════════════════

function mapSeverity(severity: string): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' {
  const upper = severity.toUpperCase();
  if (upper === 'CRITICAL') return 'CRITICAL';
  if (upper === 'HIGH') return 'HIGH';
  if (upper === 'MEDIUM') return 'MEDIUM';
  if (upper === 'LOW') return 'LOW';
  return 'INFO';
}

function createEvidenceItem(result: RuleResult): EvidenceItem | null {
  if (!result.triggered || !result.output) return null;

  const output = result.output;

  return {
    id: `EV-${result.ruleId}-${Date.now()}`,
    ruleId: result.ruleId,
    ruleName: result.ruleName,
    category: output.tags?.[0] || 'Genel',
    severity: mapSeverity(output.severity),
    title: output.title,
    finding: output.summary,
    explanation: output.why,
    legalBasis: output.tags?.filter(t => t.includes('VUK') || t.includes('GVK') || t.includes('KVK')) || [],
    evidenceRefs: output.evidenceRefs?.map(e => ({
      type: e.type,
      source: e.source,
      value: e.value?.toString() || '',
    })) || [],
    recommendedActions: output.actions?.map(a => ({
      action: a.label,
      priority: a.priority,
      assignee: a.assignee || 'SMMM',
    })) || [],
    impact: {
      area: output.impact?.area || '',
      issue: output.impact?.potentialIssue || '',
      estimatedAmount: output.impact?.estimatedAmount,
    },
    timestamp: result.completedAt,
  };
}

function createSection(
  id: string,
  title: string,
  description: string,
  results: RuleResult[]
): EvidenceSection {
  const items = results
    .map(createEvidenceItem)
    .filter((item): item is EvidenceItem => item !== null);

  return {
    id,
    title,
    description,
    items,
    summary: {
      total: items.length,
      critical: items.filter(i => i.severity === 'CRITICAL').length,
      high: items.filter(i => i.severity === 'HIGH').length,
      medium: items.filter(i => i.severity === 'MEDIUM').length,
      low: items.filter(i => i.severity === 'LOW').length,
    },
  };
}

function generateOverallAssessment(summary: EvidenceBundle['executiveSummary']): string {
  if (summary.criticalFindings > 0) {
    return `Bu dönem için ${summary.criticalFindings} adet KRİTİK bulgu tespit edilmiştir. Acil müdahale gereklidir. Risk skoru: ${summary.riskScore}/100 (${summary.riskLevel})`;
  }
  if (summary.highFindings > 0) {
    return `Bu dönem için ${summary.highFindings} adet YÜKSEK öncelikli bulgu tespit edilmiştir. Kısa vadede düzeltme önerilir. Risk skoru: ${summary.riskScore}/100 (${summary.riskLevel})`;
  }
  if (summary.mediumFindings > 0) {
    return `Bu dönem için ${summary.mediumFindings} adet ORTA öncelikli bulgu tespit edilmiştir. Planlı takip önerilir. Risk skoru: ${summary.riskScore}/100 (${summary.riskLevel})`;
  }
  return `Bu dönem için önemli bir bulgu tespit edilmemiştir. Risk skoru: ${summary.riskScore}/100 (${summary.riskLevel})`;
}

// ═══════════════════════════════════════════════════════════════════
// ANA GENERATOR
// ═══════════════════════════════════════════════════════════════════

export interface BundleGeneratorOptions {
  taxpayerId: string;
  taxpayerName: string;
  taxNumber: string;
  period: string;
  smmmId: string;
  smmmName: string;
}

export function generateEvidenceBundle(
  engineResult: EngineExecutionResult,
  options: BundleGeneratorOptions
): EvidenceBundle {
  const now = new Date().toISOString();

  // Phase sonuçlarını ayır
  const phase0 = engineResult.phases.find(p => p.phase === 0);
  const phase1 = engineResult.phases.find(p => p.phase === 1);
  const phase2 = engineResult.phases.find(p => p.phase === 2);
  const phase3 = engineResult.phases.find(p => p.phase === 3);

  // Bölümler oluştur
  const dataValidation = createSection(
    'data-validation',
    'Veri Doğrulama',
    'Mizan ve bilanço denkliği kontrolleri',
    phase0?.ruleResults || []
  );

  const calculations = createSection(
    'calculations',
    'Dönem Sonu Hesaplamalar',
    'Amortisman, karşılıklar ve değerleme kontrolleri',
    phase1?.ruleResults || []
  );

  const vdkAnalysis = createSection(
    'vdk-analysis',
    'VDK Risk Analizi',
    'Vergi Denetim Kurulu risk kriterleri analizi',
    phase2?.ruleResults || []
  );

  const crossChecks = createSection(
    'cross-checks',
    'Çapraz Kontroller',
    'Beyanname ve mutabakat kontrolleri',
    phase3?.ruleResults || []
  );

  // Toplam bulgular
  const allItems = [
    ...dataValidation.items,
    ...calculations.items,
    ...vdkAnalysis.items,
    ...crossChecks.items,
  ];

  // VDK kriterleri özeti
  const vdkCriteria = [
    { code: 'K-04', name: 'Transfer Fiyatlandırması / Örtülü Kazanç' },
    { code: 'K-08', name: 'Negatif Stok Bakiyesi' },
    { code: 'K-09', name: 'Yüksek/Negatif Kasa Bakiyesi' },
    { code: 'K-12', name: 'Finansman Gider Kısıtlaması' },
  ].map(c => {
    const findings = vdkAnalysis.items.filter(i =>
      i.ruleId.includes(c.code.replace('-', ''))
    );
    const status: 'PASSED' | 'WARNING' | 'FAILED' = findings.length > 0
      ? (findings.some(f => f.severity === 'CRITICAL') ? 'FAILED' : 'WARNING')
      : 'PASSED';
    return {
      code: c.code,
      name: c.name,
      status,
      findings: findings.map(f => f.finding),
    };
  });

  // Aksiyon planı
  const criticalActions = allItems
    .filter(i => i.severity === 'CRITICAL')
    .flatMap(i => i.recommendedActions.map(a => ({
      action: a.action,
      rule: i.ruleId,
      deadline: '7 gün içinde',
    })));

  const highActions = allItems
    .filter(i => i.severity === 'HIGH')
    .flatMap(i => i.recommendedActions.map(a => ({
      action: a.action,
      rule: i.ruleId,
      deadline: '30 gün içinde',
    })));

  const monitoringActions = allItems
    .filter(i => i.severity === 'MEDIUM' || i.severity === 'LOW')
    .flatMap(i => i.recommendedActions.slice(0, 1).map(a => ({
      action: a.action,
      rule: i.ruleId,
      frequency: 'Aylık',
    })));

  // Özet
  const executiveSummary = {
    totalFindings: allItems.length,
    criticalFindings: allItems.filter(i => i.severity === 'CRITICAL').length,
    highFindings: allItems.filter(i => i.severity === 'HIGH').length,
    mediumFindings: allItems.filter(i => i.severity === 'MEDIUM').length,
    lowFindings: allItems.filter(i => i.severity === 'LOW').length,
    riskScore: engineResult.riskScore,
    riskLevel: engineResult.riskLevel,
    overallAssessment: '',
  };
  executiveSummary.overallAssessment = generateOverallAssessment(executiveSummary);

  return {
    id: `EB-${options.taxpayerId}-${options.period}-${Date.now()}`,
    generatedAt: now,
    version: '1.0.0',

    scope: {
      taxpayerId: options.taxpayerId,
      taxpayerName: options.taxpayerName,
      taxNumber: options.taxNumber,
      period: options.period,
      smmmId: options.smmmId,
      smmmName: options.smmmName,
    },

    executiveSummary,

    sections: {
      dataValidation,
      calculations,
      vdkAnalysis,
      crossChecks,
    },

    vdkSummary: {
      criteria: vdkCriteria,
      totalCriteria: vdkCriteria.length,
      passedCriteria: vdkCriteria.filter(c => c.status === 'PASSED').length,
      failedCriteria: vdkCriteria.filter(c => c.status === 'FAILED').length,
    },

    actionPlan: {
      immediate: criticalActions,
      shortTerm: highActions,
      monitoring: monitoringActions,
    },

    signatures: {
      preparedBy: { name: '', title: 'Hazırlayan', date: '' },
      reviewedBy: { name: '', title: 'Kontrol Eden', date: '' },
      approvedBy: { name: options.smmmName, title: 'SMMM', date: now.split('T')[0] },
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════

export type { EngineExecutionResult };
