/**
 * LYNTOS Mizan <-> Yevmiye Cross-Check
 *
 * Kontroller:
 * R-YEV-001: Mizan borc toplami = Yevmiye borc toplami
 * R-YEV-002: Mizan alacak toplami = Yevmiye alacak toplami
 */

import type {
  EngineCheckRule,
  EngineCheckResult,
  CrossCheckInput
} from '../types';
import { DEFAULT_TOLERANCE } from '../types';

function isWithinTolerance(expected: number, actual: number): boolean {
  const absoluteDiff = Math.abs(expected - actual);
  if (absoluteDiff <= DEFAULT_TOLERANCE.absoluteTL) return true;
  if (expected !== 0) {
    const percentDiff = absoluteDiff / Math.abs(expected);
    if (percentDiff <= DEFAULT_TOLERANCE.percentageRate) return true;
  }
  return false;
}

export const mizanYevmiyeRules: EngineCheckRule[] = [
  {
    ruleId: 'R-YEV-001',
    ruleName: 'Mizan - Yevmiye Borc Toplami Kontrolu',
    category: 'yevmiye',
    severity: 'critical',
    legalBasis: 'VUK Md. 183',

    async check(data: CrossCheckInput): Promise<EngineCheckResult[]> {
      if (!data.mizan || !data.yevmiye) {
        return [{
          ruleId: this.ruleId,
          ruleName: this.ruleName,
          category: 'yevmiye',
          status: 'skip',
          severity: 'info',
          expected: null,
          actual: null,
          evidenceA: { source: 'N/A', field: 'mizan', value: data.mizan ? 'mevcut' : 'eksik' },
          evidenceB: { source: 'N/A', field: 'yevmiye', value: data.yevmiye ? 'mevcut' : 'eksik' },
          message: 'Mizan veya Yevmiye verisi eksik.',
          checkTime: new Date().toISOString()
        }];
      }

      const mizanBorc = data.mizan.toplamlar.borc;
      const yevmiyeBorc = data.yevmiye.toplamlar.borcToplam;

      const isMatch = isWithinTolerance(mizanBorc, yevmiyeBorc);

      return [{
        ruleId: this.ruleId,
        ruleName: this.ruleName,
        category: 'yevmiye',
        status: isMatch ? 'pass' : 'fail',
        severity: isMatch ? 'info' : 'critical',
        expected: mizanBorc,
        actual: yevmiyeBorc,
        difference: isMatch ? undefined : Math.abs(mizanBorc - yevmiyeBorc),
        evidenceA: {
          source: data.mizan.parseInfo.kaynak,
          field: 'Borc Toplami',
          value: mizanBorc
        },
        evidenceB: {
          source: data.yevmiye.parseInfo.kaynak,
          field: 'Borc Toplami',
          value: yevmiyeBorc
        },
        message: isMatch
          ? 'Mizan ve Yevmiye borc toplamlari tutarli'
          : `Borc toplamlari farki: ${Math.abs(mizanBorc - yevmiyeBorc).toFixed(2)} TL`,
        legalBasis: this.legalBasis,
        checkTime: new Date().toISOString()
      }];
    }
  },

  {
    ruleId: 'R-YEV-002',
    ruleName: 'Mizan - Yevmiye Alacak Toplami Kontrolu',
    category: 'yevmiye',
    severity: 'critical',
    legalBasis: 'VUK Md. 183',

    async check(data: CrossCheckInput): Promise<EngineCheckResult[]> {
      if (!data.mizan || !data.yevmiye) {
        return [{
          ruleId: this.ruleId,
          ruleName: this.ruleName,
          category: 'yevmiye',
          status: 'skip',
          severity: 'info',
          expected: null,
          actual: null,
          evidenceA: { source: 'N/A', field: 'mizan', value: data.mizan ? 'mevcut' : 'eksik' },
          evidenceB: { source: 'N/A', field: 'yevmiye', value: data.yevmiye ? 'mevcut' : 'eksik' },
          message: 'Mizan veya Yevmiye verisi eksik.',
          checkTime: new Date().toISOString()
        }];
      }

      const mizanAlacak = data.mizan.toplamlar.alacak;
      const yevmiyeAlacak = data.yevmiye.toplamlar.alacakToplam;

      const isMatch = isWithinTolerance(mizanAlacak, yevmiyeAlacak);

      return [{
        ruleId: this.ruleId,
        ruleName: this.ruleName,
        category: 'yevmiye',
        status: isMatch ? 'pass' : 'fail',
        severity: isMatch ? 'info' : 'critical',
        expected: mizanAlacak,
        actual: yevmiyeAlacak,
        difference: isMatch ? undefined : Math.abs(mizanAlacak - yevmiyeAlacak),
        evidenceA: {
          source: data.mizan.parseInfo.kaynak,
          field: 'Alacak Toplami',
          value: mizanAlacak
        },
        evidenceB: {
          source: data.yevmiye.parseInfo.kaynak,
          field: 'Alacak Toplami',
          value: yevmiyeAlacak
        },
        message: isMatch
          ? 'Mizan ve Yevmiye alacak toplamlari tutarli'
          : `Alacak toplamlari farki: ${Math.abs(mizanAlacak - yevmiyeAlacak).toFixed(2)} TL`,
        legalBasis: this.legalBasis,
        checkTime: new Date().toISOString()
      }];
    }
  }
];

export async function runMizanYevmiyeChecks(data: CrossCheckInput): Promise<EngineCheckResult[]> {
  const allResults: EngineCheckResult[] = [];

  for (const rule of mizanYevmiyeRules) {
    const results = await rule.check(data);
    allResults.push(...results);
  }

  return allResults;
}
