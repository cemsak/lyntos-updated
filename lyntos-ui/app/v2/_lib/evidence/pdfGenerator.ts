/**
 * LYNTOS PDF Report Generator
 * Sprint 5.8 - Kanıt Paketi PDF Çıktısı
 *
 * Evidence Bundle'ı VDK/denetim dosyasına hazır
 * profesyonel PDF raporuna dönüştürür.
 *
 * Not: Bu dosya PDF oluşturma mantığını tanımlar.
 * Gerçek PDF üretimi için jsPDF veya @react-pdf/renderer kullanılacak.
 */

import type { EvidenceBundle, EvidenceSection } from './bundleGenerator';

// ═══════════════════════════════════════════════════════════════════
// PDF YAPILANDIRMA
// ═══════════════════════════════════════════════════════════════════

export interface PDFConfig {
  paperSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  margins: { top: number; right: number; bottom: number; left: number };
  fonts: {
    title: string;
    heading: string;
    body: string;
  };
  colors: {
    primary: string;
    critical: string;
    high: string;
    medium: string;
    low: string;
    success: string;
  };
  logo?: string;
  watermark?: string;
}

export const DEFAULT_PDF_CONFIG: PDFConfig = {
  paperSize: 'A4',
  orientation: 'portrait',
  margins: { top: 40, right: 40, bottom: 40, left: 40 },
  fonts: {
    title: 'Helvetica-Bold',
    heading: 'Helvetica-Bold',
    body: 'Helvetica',
  },
  colors: {
    primary: '#1e40af',
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#ca8a04',
    low: '#16a34a',
    success: '#059669',
  },
};

// ═══════════════════════════════════════════════════════════════════
// PDF BÖLÜM TANIMLARI
// ═══════════════════════════════════════════════════════════════════

export interface PDFSection {
  type: 'cover' | 'toc' | 'summary' | 'findings' | 'vdk' | 'actions' | 'signatures';
  title: string;
  pageBreakBefore?: boolean;
}

export const PDF_SECTIONS: PDFSection[] = [
  { type: 'cover', title: 'Kapak', pageBreakBefore: false },
  { type: 'toc', title: 'İçindekiler', pageBreakBefore: true },
  { type: 'summary', title: 'Yönetici Özeti', pageBreakBefore: true },
  { type: 'findings', title: 'Bulgular', pageBreakBefore: true },
  { type: 'vdk', title: 'VDK Kriterleri Analizi', pageBreakBefore: true },
  { type: 'actions', title: 'Aksiyon Planı', pageBreakBefore: true },
  { type: 'signatures', title: 'Onay ve İmzalar', pageBreakBefore: true },
];

// ═══════════════════════════════════════════════════════════════════
// PDF İÇERİK ÜRETİCİLERİ
// ═══════════════════════════════════════════════════════════════════

export interface PDFContent {
  sections: PDFRenderedSection[];
  metadata: {
    title: string;
    author: string;
    subject: string;
    keywords: string[];
    createdAt: string;
  };
  totalPages: number;
}

export interface PDFRenderedSection {
  type: string;
  title: string;
  content: string | object;
  pageNumber: number;
}

/**
 * Kapak sayfası içeriği
 */
function generateCoverPage(bundle: EvidenceBundle): object {
  return {
    title: 'DÖNEM SONU ANALİZ RAPORU',
    subtitle: 'VDK Risk Değerlendirmesi ve Kanıt Paketi',
    taxpayer: {
      name: bundle.scope.taxpayerName,
      taxNumber: bundle.scope.taxNumber,
      period: bundle.scope.period,
    },
    smmm: {
      name: bundle.scope.smmmName,
      id: bundle.scope.smmmId,
    },
    riskBadge: {
      score: bundle.executiveSummary.riskScore,
      level: bundle.executiveSummary.riskLevel,
    },
    generatedAt: bundle.generatedAt,
    reportId: bundle.id,
  };
}

/**
 * İçindekiler
 */
function generateTableOfContents(): object {
  const sections = [
    { title: '1. Yönetici Özeti', page: 3 },
    { title: '2. Bulgular', page: 4 },
    { title: '   2.1 Veri Doğrulama', page: 4 },
    { title: '   2.2 Dönem Sonu Hesaplamalar', page: 5 },
    { title: '   2.3 VDK Risk Analizi', page: 6 },
    { title: '   2.4 Çapraz Kontroller', page: 7 },
    { title: '3. VDK Kriterleri Analizi', page: 8 },
    { title: '4. Aksiyon Planı', page: 9 },
    { title: '5. Onay ve İmzalar', page: 10 },
  ];

  return { sections };
}

/**
 * Yönetici özeti
 */
function generateExecutiveSummary(bundle: EvidenceBundle): object {
  const s = bundle.executiveSummary;

  return {
    overview: s.overallAssessment,
    metrics: {
      totalFindings: s.totalFindings,
      byPriority: {
        critical: { count: s.criticalFindings, label: 'Kritik' },
        high: { count: s.highFindings, label: 'Yüksek' },
        medium: { count: s.mediumFindings, label: 'Orta' },
        low: { count: s.lowFindings, label: 'Düşük' },
      },
      riskScore: s.riskScore,
      riskLevel: s.riskLevel,
    },
    vdkStatus: {
      total: bundle.vdkSummary.totalCriteria,
      passed: bundle.vdkSummary.passedCriteria,
      failed: bundle.vdkSummary.failedCriteria,
    },
    keyFindings: bundle.sections.vdkAnalysis.items
      .filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH')
      .slice(0, 5)
      .map(i => ({ title: i.title, severity: i.severity })),
  };
}

/**
 * Bulgular bölümü
 */
function generateFindingsSection(bundle: EvidenceBundle): object {
  const formatSection = (section: EvidenceSection) => ({
    title: section.title,
    description: section.description,
    summary: section.summary,
    items: section.items.map(item => ({
      id: item.id,
      title: item.title,
      severity: item.severity,
      finding: item.finding,
      explanation: item.explanation,
      evidence: item.evidenceRefs,
      actions: item.recommendedActions,
      impact: item.impact,
    })),
  });

  return {
    dataValidation: formatSection(bundle.sections.dataValidation),
    calculations: formatSection(bundle.sections.calculations),
    vdkAnalysis: formatSection(bundle.sections.vdkAnalysis),
    crossChecks: formatSection(bundle.sections.crossChecks),
  };
}

/**
 * VDK kriterleri analizi
 */
function generateVDKSection(bundle: EvidenceBundle): object {
  return {
    title: 'VDK Risk Kriterleri Değerlendirmesi',
    description: 'Vergi Denetim Kurulu tarafından belirlenen risk kriterleri analizi',
    criteria: bundle.vdkSummary.criteria.map(c => ({
      code: c.code,
      name: c.name,
      status: c.status,
      statusLabel: c.status === 'PASSED' ? 'Geçti' : c.status === 'WARNING' ? 'Uyarı' : 'Başarısız',
      findings: c.findings,
      recommendation: c.status === 'FAILED'
        ? 'Acil düzeltme gerekli'
        : c.status === 'WARNING'
          ? 'İzleme önerilir'
          : 'Sorun yok',
    })),
    summary: {
      total: bundle.vdkSummary.totalCriteria,
      passed: bundle.vdkSummary.passedCriteria,
      failed: bundle.vdkSummary.failedCriteria,
      passRate: bundle.vdkSummary.totalCriteria > 0
        ? Math.round((bundle.vdkSummary.passedCriteria / bundle.vdkSummary.totalCriteria) * 100)
        : 100,
    },
  };
}

/**
 * Aksiyon planı
 */
function generateActionPlan(bundle: EvidenceBundle): object {
  return {
    immediate: {
      title: 'Acil Aksiyonlar (7 gün içinde)',
      items: bundle.actionPlan.immediate,
    },
    shortTerm: {
      title: 'Kısa Vadeli Aksiyonlar (30 gün içinde)',
      items: bundle.actionPlan.shortTerm,
    },
    monitoring: {
      title: 'İzleme Gerektiren Konular',
      items: bundle.actionPlan.monitoring,
    },
    timeline: generateTimeline(bundle),
  };
}

interface TimelineItem {
  date: string;
  action: string;
  rule: string;
  priority: string;
}

function generateTimeline(bundle: EvidenceBundle): TimelineItem[] {
  const timeline: TimelineItem[] = [];
  const today = new Date();

  bundle.actionPlan.immediate.forEach((a) => {
    const deadline = new Date(today);
    deadline.setDate(deadline.getDate() + 7);
    timeline.push({
      date: deadline.toISOString().split('T')[0],
      action: a.action,
      rule: a.rule,
      priority: 'critical',
    });
  });

  bundle.actionPlan.shortTerm.forEach((a) => {
    const deadline = new Date(today);
    deadline.setDate(deadline.getDate() + 30);
    timeline.push({
      date: deadline.toISOString().split('T')[0],
      action: a.action,
      rule: a.rule,
      priority: 'high',
    });
  });

  return timeline.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * İmza sayfası
 */
function generateSignaturesPage(bundle: EvidenceBundle): object {
  return {
    title: 'Onay ve İmzalar',
    disclaimer: `Bu rapor, ${bundle.scope.taxpayerName} için ${bundle.scope.period} dönemine ait finansal verilerin LYNTOS sistemi tarafından otomatik analizi sonucunda oluşturulmuştur. Raporda yer alan bulgular ve öneriler, yürürlükteki mevzuat çerçevesinde değerlendirilmelidir.`,
    signatures: [
      {
        role: 'Hazırlayan',
        name: bundle.signatures.preparedBy.name || '________________',
        title: 'Mali Müşavir Yardımcısı',
        date: bundle.signatures.preparedBy.date || '__ / __ / ____',
        signatureLine: true,
      },
      {
        role: 'Kontrol Eden',
        name: bundle.signatures.reviewedBy.name || '________________',
        title: 'Kıdemli Mali Müşavir',
        date: bundle.signatures.reviewedBy.date || '__ / __ / ____',
        signatureLine: true,
      },
      {
        role: 'Onaylayan',
        name: bundle.signatures.approvedBy.name || bundle.scope.smmmName,
        title: 'SMMM',
        date: bundle.signatures.approvedBy.date || new Date().toISOString().split('T')[0],
        signatureLine: true,
      },
    ],
    footer: {
      reportId: bundle.id,
      generatedAt: bundle.generatedAt,
      version: bundle.version,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// ANA PDF GENERATOR
// ═══════════════════════════════════════════════════════════════════

/**
 * Evidence Bundle'dan PDF içeriği üretir
 * Bu içerik daha sonra jsPDF veya react-pdf ile render edilebilir
 */
export function generatePDFContent(
  bundle: EvidenceBundle,
  _config: PDFConfig = DEFAULT_PDF_CONFIG
): PDFContent {
  let pageNumber = 1;
  const sections: PDFRenderedSection[] = [];

  // Kapak
  sections.push({
    type: 'cover',
    title: 'Kapak',
    content: generateCoverPage(bundle),
    pageNumber: pageNumber++,
  });

  // İçindekiler
  sections.push({
    type: 'toc',
    title: 'İçindekiler',
    content: generateTableOfContents(),
    pageNumber: pageNumber++,
  });

  // Yönetici Özeti
  sections.push({
    type: 'summary',
    title: 'Yönetici Özeti',
    content: generateExecutiveSummary(bundle),
    pageNumber: pageNumber++,
  });

  // Bulgular
  sections.push({
    type: 'findings',
    title: 'Bulgular',
    content: generateFindingsSection(bundle),
    pageNumber: pageNumber++,
  });

  // VDK Analizi
  sections.push({
    type: 'vdk',
    title: 'VDK Kriterleri Analizi',
    content: generateVDKSection(bundle),
    pageNumber: pageNumber++,
  });

  // Aksiyon Planı
  sections.push({
    type: 'actions',
    title: 'Aksiyon Planı',
    content: generateActionPlan(bundle),
    pageNumber: pageNumber++,
  });

  // İmzalar
  sections.push({
    type: 'signatures',
    title: 'Onay ve İmzalar',
    content: generateSignaturesPage(bundle),
    pageNumber: pageNumber++,
  });

  return {
    sections,
    metadata: {
      title: `Dönem Sonu Analiz Raporu - ${bundle.scope.taxpayerName} - ${bundle.scope.period}`,
      author: bundle.scope.smmmName,
      subject: 'VDK Risk Değerlendirmesi ve Kanıt Paketi',
      keywords: ['VDK', 'Risk Analizi', 'Dönem Sonu', 'SMMM', bundle.scope.period],
      createdAt: bundle.generatedAt,
    },
    totalPages: pageNumber - 1,
  };
}

/**
 * PDF içeriğini JSON olarak export eder (debug/preview için)
 */
export function exportPDFContentAsJSON(content: PDFContent): string {
  return JSON.stringify(content, null, 2);
}

/**
 * Severity'ye göre renk döndürür
 */
export function getSeverityColor(severity: string, config: PDFConfig = DEFAULT_PDF_CONFIG): string {
  switch (severity.toUpperCase()) {
    case 'CRITICAL': return config.colors.critical;
    case 'HIGH': return config.colors.high;
    case 'MEDIUM': return config.colors.medium;
    case 'LOW': return config.colors.low;
    default: return config.colors.primary;
  }
}

/**
 * Risk seviyesine göre renk döndürür
 */
export function getRiskLevelColor(level: string, config: PDFConfig = DEFAULT_PDF_CONFIG): string {
  switch (level.toUpperCase()) {
    case 'CRITICAL': return config.colors.critical;
    case 'HIGH': return config.colors.high;
    case 'MEDIUM': return config.colors.medium;
    case 'LOW': return config.colors.success;
    default: return config.colors.primary;
  }
}
