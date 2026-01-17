/**
 * LYNTOS Evidence Manifest Generator
 * Audit trail için JSON manifest oluşturur
 */

import type { EngineCheckReport } from '../../parsers/crosscheck/types';
import type { ParsedData } from '../../../_hooks/useQuarterlyAnalysis';

export interface EvidenceManifest {
  version: string;
  generatedAt: string;
  generatedBy: string;

  taxpayer: {
    vkn: string | null;
    unvan: string | null;
    donem: string | null;
  };

  analysis: {
    startTime: string;
    endTime: string;
    durationMs: number;
  };

  files: {
    category: string;
    filename: string;
    size: number;
    parsed: boolean;
    type: string;
  }[];

  crossChecks: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    criticalIssues: number;
  };

  results: {
    ruleId: string;
    ruleName: string;
    category: string;
    status: string;
    severity: string;
    expected: number | string | null;
    actual: number | string | null;
    difference?: number;
    evidenceA: string;
    evidenceB: string;
  }[];

  checksum: string;
}

function generateChecksum(data: string): string {
  // Simple hash for integrity check
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function generateManifest(
  report: EngineCheckReport,
  parsedData: ParsedData,
  startTime: number,
  endTime: number
): EvidenceManifest {
  // Collect file info
  const files: EvidenceManifest['files'] = [];

  if (parsedData.mizan) {
    files.push({
      category: 'mizan',
      filename: parsedData.mizan.parseInfo.kaynak,
      size: 0,
      parsed: true,
      type: 'excel'
    });
  }

  if (parsedData.yevmiye) {
    files.push({
      category: 'yevmiye',
      filename: parsedData.yevmiye.parseInfo.kaynak,
      size: 0,
      parsed: true,
      type: 'excel'
    });
  }

  parsedData.kdv.forEach(k => {
    files.push({
      category: 'kdv',
      filename: k.parseInfo.kaynak,
      size: 0,
      parsed: true,
      type: 'pdf'
    });
  });

  parsedData.muhtasar.forEach(m => {
    files.push({
      category: 'muhtasar',
      filename: m.parseInfo.kaynak,
      size: 0,
      parsed: true,
      type: 'pdf'
    });
  });

  parsedData.banka.forEach(b => {
    files.push({
      category: 'banka',
      filename: b.parseInfo.kaynak,
      size: 0,
      parsed: true,
      type: 'csv'
    });
  });

  // Map results
  const results = report.results.map(r => ({
    ruleId: r.ruleId,
    ruleName: r.ruleName,
    category: r.category,
    status: r.status,
    severity: r.severity,
    expected: r.expected,
    actual: r.actual,
    difference: r.difference,
    evidenceA: `${r.evidenceA.source} → ${r.evidenceA.field}`,
    evidenceB: `${r.evidenceB.source} → ${r.evidenceB.field}`
  }));

  const manifestData: Omit<EvidenceManifest, 'checksum'> = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    generatedBy: 'LYNTOS v2',

    taxpayer: {
      vkn: report.vkn,
      unvan: report.unvan,
      donem: report.donem
    },

    analysis: {
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      durationMs: endTime - startTime
    },

    files,

    crossChecks: {
      total: report.summary.totalChecks,
      passed: report.summary.passed,
      failed: report.summary.failed,
      skipped: report.summary.skipped,
      criticalIssues: report.summary.criticalIssues
    },

    results
  };

  const checksum = generateChecksum(JSON.stringify(manifestData));

  return {
    ...manifestData,
    checksum
  };
}
