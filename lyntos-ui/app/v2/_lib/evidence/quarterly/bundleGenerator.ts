/**
 * LYNTOS Quarterly Evidence Bundle Generator
 * Audit-ready ZIP bundle oluşturur
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { generateManifest, type EvidenceManifest } from './manifestGenerator';
import { generatePDFReport } from './pdfReportGenerator';
import type { EngineCheckReport } from '../../parsers/crosscheck/types';
import type { ParsedData } from '../../../_hooks/useQuarterlyAnalysis';

export interface QuarterlyBundleOptions {
  includeManifest: boolean;
  includePDFReport: boolean;
  includeRawResults: boolean;
  includeSummary: boolean;
}

const DEFAULT_OPTIONS: QuarterlyBundleOptions = {
  includeManifest: true,
  includePDFReport: true,
  includeRawResults: true,
  includeSummary: true
};

function escapeCSVField(value: string): string {
  if (value.includes('"') || value.includes(';') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function generateSummaryCSV(report: EngineCheckReport): string {
  const headers = ['Kural ID', 'Kural Adi', 'Kategori', 'Durum', 'Onem', 'Beklenen', 'Bulunan', 'Fark', 'Kaynak A', 'Kaynak B'];

  const rows = report.results.map(r => [
    r.ruleId,
    escapeCSVField(r.ruleName),
    r.category,
    r.status,
    r.severity,
    r.expected !== null ? String(r.expected) : '',
    r.actual !== null ? String(r.actual) : '',
    r.difference !== undefined ? String(r.difference) : '',
    escapeCSVField(`${r.evidenceA.source} - ${r.evidenceA.field}`),
    escapeCSVField(`${r.evidenceB.source} - ${r.evidenceB.field}`)
  ]);

  return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
}

function generateReadme(report: EngineCheckReport, manifest: EvidenceManifest): string {
  return `LYNTOS CAPRAZ KONTROL RAPORU
============================

Mukellef: ${report.unvan || '-'}
VKN: ${report.vkn || '-'}
Donem: ${report.donem || '-'}
Olusturulma: ${manifest.generatedAt}

OZET
----
Toplam Kontrol: ${manifest.crossChecks.total}
Basarili: ${manifest.crossChecks.passed}
Basarisiz: ${manifest.crossChecks.failed}
Atlandi: ${manifest.crossChecks.skipped}
Kritik Uyumsuzluk: ${manifest.crossChecks.criticalIssues}

DOSYA ACIKLAMALARI
------------------
- manifest.json: Audit trail icin JSON manifest (checksum dahil)
- rapor.pdf: Profesyonel PDF rapor (VDK/YMM uyumlu)
- results.json: Ham kontrol sonuclari (JSON)
- summary.csv: Ozet tablo (Excel ile acilabilir)
- README.txt: Bu dosya

CHECKSUM
--------
${manifest.checksum}

---
LYNTOS v${manifest.version}
Bu rapor otomatik olarak olusturulmustur.
`;
}

export async function generateQuarterlyEvidenceBundle(
  report: EngineCheckReport,
  parsedData: ParsedData,
  startTime: number,
  endTime: number,
  options: Partial<QuarterlyBundleOptions> = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const zip = new JSZip();

  // Generate manifest
  const manifest = generateManifest(report, parsedData, startTime, endTime);

  // Add files to ZIP
  if (opts.includeManifest) {
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  }

  if (opts.includePDFReport) {
    const pdfBlob = await generatePDFReport(report);
    zip.file('rapor.pdf', pdfBlob);
  }

  if (opts.includeRawResults) {
    zip.file('results.json', JSON.stringify(report, null, 2));
  }

  if (opts.includeSummary) {
    zip.file('summary.csv', generateSummaryCSV(report));
  }

  // Always include README
  zip.file('README.txt', generateReadme(report, manifest));

  // Generate and download ZIP
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  const filename = `LYNTOS_${report.vkn || 'rapor'}_${report.donem || 'donem'}_${new Date().toISOString().split('T')[0]}.zip`;
  saveAs(blob, filename);
}

export async function downloadQuarterlyPDFOnly(report: EngineCheckReport): Promise<void> {
  const pdfBlob = await generatePDFReport(report);
  const filename = `LYNTOS_${report.vkn || 'rapor'}_${report.donem || 'donem'}_${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(pdfBlob, filename);
}
