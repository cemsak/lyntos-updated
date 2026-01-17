/**
 * LYNTOS Cross-Check Engine
 * Tum capraz kontrolleri orkestre eden ana motor
 */

import type {
  CrossCheckInput,
  EngineCheckReport,
  EngineCheckResult,
  EngineCheckSummary,
  CheckSeverity,
  CheckStatus
} from './types';

import { runMizanKdvChecks } from './rules/mizanKdv';
import { runMizanMuhtasarChecks } from './rules/mizanMuhtasar';
import { runMizanBankaChecks } from './rules/mizanBanka';
import { runMizanYevmiyeChecks } from './rules/mizanYevmiye';

function createSummary(results: EngineCheckResult[]): EngineCheckSummary {
  const summary: EngineCheckSummary = {
    totalChecks: results.length,
    passed: 0,
    failed: 0,
    skipped: 0,
    partial: 0,
    criticalIssues: 0,
    warnings: 0,
    categories: {
      kdv: { total: 0, passed: 0, failed: 0 },
      muhtasar: { total: 0, passed: 0, failed: 0 },
      banka: { total: 0, passed: 0, failed: 0 },
      yevmiye: { total: 0, passed: 0, failed: 0 },
      edefter: { total: 0, passed: 0, failed: 0 }
    }
  };

  for (const result of results) {
    // Status counts
    switch (result.status) {
      case 'pass': summary.passed++; break;
      case 'fail': summary.failed++; break;
      case 'skip': summary.skipped++; break;
      case 'partial': summary.partial++; break;
    }

    // Severity counts
    if (result.status === 'fail') {
      if (result.severity === 'critical') summary.criticalIssues++;
      if (result.severity === 'warning') summary.warnings++;
    }

    // Category counts
    const cat = result.category as keyof typeof summary.categories;
    if (summary.categories[cat]) {
      summary.categories[cat].total++;
      if (result.status === 'pass') summary.categories[cat].passed++;
      if (result.status === 'fail') summary.categories[cat].failed++;
    }
  }

  return summary;
}

function groupBy<T extends EngineCheckResult>(
  results: T[],
  key: keyof T
): Record<string, T[]> {
  return results.reduce((acc, result) => {
    const groupKey = String(result[key]);
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(result);
    return acc;
  }, {} as Record<string, T[]>);
}

function formatDonem(donem: { yil: number; ay: number; ayAdi: string }): string {
  return `${donem.yil} ${donem.ayAdi}`;
}

export async function runCrossChecks(input: CrossCheckInput): Promise<EngineCheckReport> {
  const startTime = Date.now();
  const allResults: EngineCheckResult[] = [];

  // 1. Mizan <-> KDV kontrolleri
  const kdvResults = await runMizanKdvChecks(input);
  allResults.push(...kdvResults);

  // 2. Mizan <-> Muhtasar kontrolleri
  const muhtasarResults = await runMizanMuhtasarChecks(input);
  allResults.push(...muhtasarResults);

  // 3. Mizan <-> Banka kontrolleri
  const bankaResults = await runMizanBankaChecks(input);
  allResults.push(...bankaResults);

  // 4. Mizan <-> Yevmiye kontrolleri
  const yevmiyeResults = await runMizanYevmiyeChecks(input);
  allResults.push(...yevmiyeResults);

  // VKN ve unvan cikar
  let vkn: string | null = null;
  let unvan: string | null = null;
  let donem: string | null = null;

  if (input.kdvBeyannameler.length > 0) {
    vkn = input.kdvBeyannameler[0].vkn || null;
    donem = formatDonem(input.kdvBeyannameler[0].donem);
  } else if (input.muhtasarlar.length > 0) {
    vkn = input.muhtasarlar[0].vkn || null;
    donem = formatDonem(input.muhtasarlar[0].donem);
  }

  // Mizan'dan firma adi
  if (input.mizan) {
    unvan = input.mizan.firmaAdi || null;
    if (!vkn && input.mizan.vkn) {
      vkn = input.mizan.vkn;
    }
  }

  return {
    vkn,
    unvan,
    donem,
    checkTime: new Date().toISOString(),
    checkDurationMs: Date.now() - startTime,
    summary: createSummary(allResults),
    results: allResults,
    byCategory: groupBy(allResults, 'category'),
    bySeverity: groupBy(allResults, 'severity') as Record<CheckSeverity, EngineCheckResult[]>,
    byStatus: groupBy(allResults, 'status') as Record<CheckStatus, EngineCheckResult[]>
  };
}

// Convenience function: Parse edilen verilerden CrossCheckInput olustur
export function buildCrossCheckInput(parsedData: {
  mizan?: import('../types').ParsedMizan;
  yevmiye?: import('../types').ParsedYevmiye;
  kebir?: import('../types').ParsedKebir;
  edefter?: import('../types').ParsedEDefter[];
  kdv?: import('../types').ParsedKDVBeyanname[];
  muhtasar?: import('../types').ParsedMuhtasar[];
  geciciVergi?: import('../types').ParsedGeciciVergi[];
  banka?: import('../types').ParsedBankaEkstre[];
}): CrossCheckInput {
  return {
    mizan: parsedData.mizan || null,
    yevmiye: parsedData.yevmiye || null,
    kebir: parsedData.kebir || null,
    edefter: parsedData.edefter || [],
    kdvBeyannameler: parsedData.kdv || [],
    muhtasarlar: parsedData.muhtasar || [],
    geciciVergiler: parsedData.geciciVergi || [],
    bankaEkstreleri: parsedData.banka || []
  };
}
