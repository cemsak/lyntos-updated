/**
 * LYNTOS Mizan <-> Muhtasar Cross-Check
 *
 * Kontroller:
 * R-MUH-001: 360.01 hesabi = Muhtasar stopaj
 * R-MUH-002: Calisan Sayisi Tutarliligi
 */

import type {
  EngineCheckRule,
  EngineCheckResult,
  CrossCheckInput,
  ToleranceConfig
} from '../types';
import { DEFAULT_TOLERANCE } from '../types';

const MUHTASAR_HESAPLARI = {
  STOPAJ_GV: '360.01',
  ODENECEK_VERGI: '360',
  SGK_PRIMLERI: '361',
  DAMGA_VERGISI: '360.03'
};

function isWithinTolerance(
  expected: number,
  actual: number,
  config: ToleranceConfig = DEFAULT_TOLERANCE
): boolean {
  const absoluteDiff = Math.abs(expected - actual);
  if (absoluteDiff <= config.absoluteTL) return true;
  if (expected !== 0) {
    const percentDiff = absoluteDiff / Math.abs(expected);
    if (percentDiff <= config.percentageRate) return true;
  }
  return false;
}

function getMizanHesapBakiye(
  mizan: CrossCheckInput['mizan'],
  hesapKoduPrefix: string
): number {
  if (!mizan || !mizan.hesaplar) return 0;

  const matchingHesaplar = mizan.hesaplar.filter(h =>
    h.hesapKodu.startsWith(hesapKoduPrefix)
  );

  let totalBakiye = 0;
  for (const hesap of matchingHesaplar) {
    totalBakiye += (hesap.alacakBakiye - hesap.borcBakiye); // 360 alacak bakiyeli
  }

  return Math.abs(totalBakiye);
}

function formatDonem(donem: { yil: number; ay: number; ayAdi: string }): string {
  return `${donem.yil} ${donem.ayAdi}`;
}

export const mizanMuhtasarRules: EngineCheckRule[] = [
  {
    ruleId: 'R-MUH-001',
    ruleName: 'Stopaj (360.01) - Muhtasar Kontrolu',
    category: 'muhtasar',
    severity: 'critical',
    legalBasis: 'GVK Md. 94',

    async check(data: CrossCheckInput): Promise<EngineCheckResult[]> {
      const results: EngineCheckResult[] = [];

      if (!data.mizan) {
        return [{
          ruleId: this.ruleId,
          ruleName: this.ruleName,
          category: 'muhtasar',
          status: 'skip',
          severity: 'info',
          expected: null,
          actual: null,
          evidenceA: { source: 'N/A', field: 'mizan', value: 'eksik' },
          evidenceB: { source: 'N/A', field: 'muhtasar', value: 'N/A' },
          message: 'Mizan verisi bulunamadi.',
          checkTime: new Date().toISOString()
        }];
      }

      const muhtasarlar = data.muhtasarlar.filter(m => m.tip === 'BEYANNAME');

      if (muhtasarlar.length === 0) {
        return [{
          ruleId: this.ruleId,
          ruleName: this.ruleName,
          category: 'muhtasar',
          status: 'skip',
          severity: 'info',
          expected: null,
          actual: null,
          evidenceA: { source: data.mizan.parseInfo.kaynak, field: '360.01', value: 'mevcut' },
          evidenceB: { source: 'N/A', field: 'muhtasar', value: 'eksik' },
          message: 'Muhtasar beyannamesi bulunamadi.',
          checkTime: new Date().toISOString()
        }];
      }

      // Donem toplami - gelir vergisi kesintisi (stopaj)
      const toplamStopaj = muhtasarlar.reduce((sum, m) => sum + (m.odemelerToplam.kesintiTutar || 0), 0);
      const mizanBakiye = getMizanHesapBakiye(data.mizan, MUHTASAR_HESAPLARI.STOPAJ_GV);

      const isMatch = isWithinTolerance(toplamStopaj, mizanBakiye);

      results.push({
        ruleId: this.ruleId,
        ruleName: this.ruleName,
        category: 'muhtasar',
        status: isMatch ? 'pass' : 'fail',
        severity: isMatch ? 'info' : 'critical',
        expected: toplamStopaj,
        actual: mizanBakiye,
        difference: isMatch ? undefined : Math.abs(toplamStopaj - mizanBakiye),
        evidenceA: {
          source: data.mizan.parseInfo.kaynak,
          field: '360.01 - Odenecek Gelir Vergisi',
          value: mizanBakiye
        },
        evidenceB: {
          source: `${muhtasarlar.length} Muhtasar`,
          field: 'Toplam Stopaj',
          value: toplamStopaj
        },
        message: isMatch
          ? 'Stopaj tutarlari tutarli'
          : `Stopaj farki: ${Math.abs(toplamStopaj - mizanBakiye).toFixed(2)} TL`,
        suggestion: isMatch ? undefined : 'Muhtasar beyanname donemlerini ve mizan kayitlarini kontrol ediniz.',
        legalBasis: this.legalBasis,
        checkTime: new Date().toISOString()
      });

      return results;
    }
  },

  {
    ruleId: 'R-MUH-002',
    ruleName: 'Calisan Sayisi Tutarliligi',
    category: 'muhtasar',
    severity: 'warning',
    legalBasis: '5510 Sayili Kanun',

    async check(data: CrossCheckInput): Promise<EngineCheckResult[]> {
      const results: EngineCheckResult[] = [];

      const muhtasarlar = data.muhtasarlar.filter(m => m.tip === 'BEYANNAME');

      // Donemler arasi calisan sayisi degisimi kontrolu
      for (let i = 1; i < muhtasarlar.length; i++) {
        const onceki = muhtasarlar[i - 1];
        const simdiki = muhtasarlar[i];

        const oncekiSayi = onceki.toplamCalisan || 0;
        const simdikiSayi = simdiki.toplamCalisan || 0;
        const degisim = simdikiSayi - oncekiSayi;
        const degisimOrani = oncekiSayi > 0 ? Math.abs(degisim) / oncekiSayi : 0;

        // %20'den fazla degisim uyari
        const isNormal = degisimOrani <= 0.20;

        const oncekiDonem = formatDonem(onceki.donem);
        const simdikiDonem = formatDonem(simdiki.donem);

        results.push({
          ruleId: this.ruleId,
          ruleName: `${this.ruleName} (${oncekiDonem} -> ${simdikiDonem})`,
          category: 'muhtasar',
          status: isNormal ? 'pass' : 'partial',
          severity: isNormal ? 'info' : 'warning',
          expected: oncekiSayi,
          actual: simdikiSayi,
          difference: Math.abs(degisim),
          evidenceA: {
            source: onceki.parseInfo.kaynak,
            field: 'Calisan Sayisi',
            value: oncekiSayi
          },
          evidenceB: {
            source: simdiki.parseInfo.kaynak,
            field: 'Calisan Sayisi',
            value: simdikiSayi
          },
          message: isNormal
            ? `Calisan sayisi tutarli: ${oncekiSayi} -> ${simdikiSayi}`
            : `Calisan sayisinda %${(degisimOrani * 100).toFixed(0)} degisim: ${oncekiSayi} -> ${simdikiSayi}`,
          suggestion: isNormal ? undefined : 'Ise giris/cikis bildirimlerini kontrol ediniz.',
          legalBasis: this.legalBasis,
          checkTime: new Date().toISOString()
        });
      }

      return results;
    }
  }
];

export async function runMizanMuhtasarChecks(data: CrossCheckInput): Promise<EngineCheckResult[]> {
  const allResults: EngineCheckResult[] = [];

  for (const rule of mizanMuhtasarRules) {
    const results = await rule.check(data);
    allResults.push(...results);
  }

  return allResults;
}
