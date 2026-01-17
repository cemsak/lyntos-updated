/**
 * LYNTOS Mizan <-> KDV Beyanname Cross-Check
 *
 * Kontroller:
 * R-KDV-001: 191 hesabi = Beyanname indirilecek KDV (donem sonu)
 * R-KDV-002: 391 hesabi = Beyanname hesaplanan KDV
 * R-KDV-003: 190 hesabi = Beyanname devreden KDV
 * R-KDV-004: KDV Matematik Kontrolu (Hesaplanan - Indirim = Odenecek/Devreden)
 */

import type {
  EngineCheckRule,
  EngineCheckResult,
  CrossCheckInput,
  CheckEvidence,
  ToleranceConfig
} from '../types';
import { DEFAULT_TOLERANCE } from '../types';

// KDV ile ilgili hesap kodlari
const KDV_HESAPLARI = {
  INDIRILECEK_KDV: '191',
  DEVREDEN_KDV: '190',
  HESAPLANAN_KDV: '391',
  ODENECEK_KDV: '360.02',
  ODENECEK_VERGI_FONLAR: '360'
};

function isWithinTolerance(
  expected: number,
  actual: number,
  config: ToleranceConfig = DEFAULT_TOLERANCE
): boolean {
  const absoluteDiff = Math.abs(expected - actual);

  // Mutlak tolerans
  if (absoluteDiff <= config.absoluteTL) return true;

  // Yuzde tolerans (sifir bolme korumasi)
  if (expected !== 0) {
    const percentDiff = absoluteDiff / Math.abs(expected);
    if (percentDiff <= config.percentageRate) return true;
  }

  return false;
}

function getMizanHesapBakiye(
  mizan: CrossCheckInput['mizan'],
  hesapKoduPrefix: string
): { bakiye: number; hesaplar: { kod: string; ad: string; bakiye: number }[] } {
  if (!mizan || !mizan.hesaplar) {
    return { bakiye: 0, hesaplar: [] };
  }

  const matchingHesaplar = mizan.hesaplar.filter(h =>
    h.hesapKodu.startsWith(hesapKoduPrefix)
  );

  // Bakiye = Borc Bakiyesi - Alacak Bakiyesi (veya tam tersi hesaba gore)
  let totalBakiye = 0;
  const hesapDetay: { kod: string; ad: string; bakiye: number }[] = [];

  for (const hesap of matchingHesaplar) {
    const bakiye = hesap.borcBakiye - hesap.alacakBakiye;
    totalBakiye += bakiye;
    hesapDetay.push({
      kod: hesap.hesapKodu,
      ad: hesap.hesapAdi,
      bakiye
    });
  }

  return { bakiye: totalBakiye, hesaplar: hesapDetay };
}

function formatDonem(donem: { yil: number; ay: number; ayAdi: string }): string {
  return `${donem.yil} ${donem.ayAdi}`;
}

function createResult(
  ruleId: string,
  ruleName: string,
  status: 'pass' | 'fail' | 'skip',
  expected: number,
  actual: number,
  evidenceA: CheckEvidence,
  evidenceB: CheckEvidence,
  legalBasis?: string
): EngineCheckResult {
  const difference = Math.abs(expected - actual);
  const passed = status === 'pass';

  return {
    ruleId,
    ruleName,
    category: 'kdv',
    status,
    severity: status === 'fail' ? 'critical' : 'info',
    expected,
    actual,
    difference: passed ? undefined : difference,
    toleranceUsed: DEFAULT_TOLERANCE.absoluteTL,
    evidenceA,
    evidenceB,
    message: passed
      ? `${ruleName}: Tutarli`
      : `${ruleName}: ${difference.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL fark tespit edildi`,
    suggestion: passed ? undefined : 'Mizan ve beyanname kayitlarini kontrol ediniz.',
    legalBasis,
    checkTime: new Date().toISOString()
  };
}

export const mizanKdvRules: EngineCheckRule[] = [
  {
    ruleId: 'R-KDV-001',
    ruleName: 'Indirilecek KDV (191) - Beyanname Kontrolu',
    category: 'kdv',
    severity: 'critical',
    legalBasis: 'KDV Kanunu Md. 29',

    async check(data: CrossCheckInput): Promise<EngineCheckResult[]> {
      const results: EngineCheckResult[] = [];

      if (!data.mizan) {
        return [{
          ruleId: this.ruleId,
          ruleName: this.ruleName,
          category: 'kdv',
          status: 'skip',
          severity: 'info',
          expected: null,
          actual: null,
          evidenceA: { source: 'N/A', field: 'mizan', value: 'eksik' },
          evidenceB: { source: 'N/A', field: 'beyanname', value: 'N/A' },
          message: 'Mizan verisi bulunamadi, kontrol atlandi.',
          checkTime: new Date().toISOString()
        }];
      }

      // Son donem KDV beyannamesi (beyanname tipinde olanlar)
      const kdvBeyannameler = data.kdvBeyannameler.filter(b => b.tip === 'BEYANNAME');

      if (kdvBeyannameler.length === 0) {
        return [{
          ruleId: this.ruleId,
          ruleName: this.ruleName,
          category: 'kdv',
          status: 'skip',
          severity: 'info',
          expected: null,
          actual: null,
          evidenceA: { source: data.mizan.parseInfo.kaynak, field: '191', value: 'mevcut' },
          evidenceB: { source: 'N/A', field: 'beyanname', value: 'eksik' },
          message: 'KDV beyannamesi bulunamadi, kontrol atlandi.',
          checkTime: new Date().toISOString()
        }];
      }

      // Her beyanname icin kontrol
      for (const beyanname of kdvBeyannameler) {
        const mizanData = getMizanHesapBakiye(data.mizan, KDV_HESAPLARI.INDIRILECEK_KDV);
        const mizanBakiye = Math.abs(mizanData.bakiye);
        const beyannameDeger = beyanname.indirimler.yurticiAlimlar || 0;
        const donemStr = formatDonem(beyanname.donem);

        const isMatch = isWithinTolerance(beyannameDeger, mizanBakiye);

        results.push(createResult(
          this.ruleId,
          `${this.ruleName} (${donemStr})`,
          isMatch ? 'pass' : 'fail',
          beyannameDeger,
          mizanBakiye,
          {
            source: data.mizan.parseInfo.kaynak,
            field: '191 - Indirilecek KDV',
            value: mizanBakiye
          },
          {
            source: beyanname.parseInfo.kaynak,
            field: 'Yurtici Alimlara Iliskin KDV',
            value: beyannameDeger
          },
          this.legalBasis
        ));
      }

      return results;
    }
  },

  {
    ruleId: 'R-KDV-002',
    ruleName: 'Hesaplanan KDV (391) - Beyanname Kontrolu',
    category: 'kdv',
    severity: 'critical',
    legalBasis: 'KDV Kanunu Md. 10',

    async check(data: CrossCheckInput): Promise<EngineCheckResult[]> {
      const results: EngineCheckResult[] = [];

      if (!data.mizan) {
        return [{
          ruleId: this.ruleId,
          ruleName: this.ruleName,
          category: 'kdv',
          status: 'skip',
          severity: 'info',
          expected: null,
          actual: null,
          evidenceA: { source: 'N/A', field: 'mizan', value: 'eksik' },
          evidenceB: { source: 'N/A', field: 'beyanname', value: 'N/A' },
          message: 'Mizan verisi bulunamadi.',
          checkTime: new Date().toISOString()
        }];
      }

      const kdvBeyannameler = data.kdvBeyannameler.filter(b => b.tip === 'BEYANNAME');

      for (const beyanname of kdvBeyannameler) {
        const mizanData = getMizanHesapBakiye(data.mizan, KDV_HESAPLARI.HESAPLANAN_KDV);
        const mizanBakiye = Math.abs(mizanData.bakiye);
        const beyannameDeger = beyanname.hesaplananKDV || 0;
        const donemStr = formatDonem(beyanname.donem);

        const isMatch = isWithinTolerance(beyannameDeger, mizanBakiye);

        results.push(createResult(
          this.ruleId,
          `${this.ruleName} (${donemStr})`,
          isMatch ? 'pass' : 'fail',
          beyannameDeger,
          mizanBakiye,
          {
            source: data.mizan.parseInfo.kaynak,
            field: '391 - Hesaplanan KDV',
            value: mizanBakiye
          },
          {
            source: beyanname.parseInfo.kaynak,
            field: 'Hesaplanan KDV',
            value: beyannameDeger
          },
          this.legalBasis
        ));
      }

      return results;
    }
  },

  {
    ruleId: 'R-KDV-003',
    ruleName: 'Devreden KDV (190) - Beyanname Kontrolu',
    category: 'kdv',
    severity: 'critical',
    legalBasis: 'KDV Kanunu Md. 29/2',

    async check(data: CrossCheckInput): Promise<EngineCheckResult[]> {
      const results: EngineCheckResult[] = [];

      if (!data.mizan) {
        return [{
          ruleId: this.ruleId,
          ruleName: this.ruleName,
          category: 'kdv',
          status: 'skip',
          severity: 'info',
          expected: null,
          actual: null,
          evidenceA: { source: 'N/A', field: 'mizan', value: 'eksik' },
          evidenceB: { source: 'N/A', field: 'beyanname', value: 'N/A' },
          message: 'Mizan verisi bulunamadi.',
          checkTime: new Date().toISOString()
        }];
      }

      const kdvBeyannameler = data.kdvBeyannameler.filter(b => b.tip === 'BEYANNAME');

      // Son donem beyannamesi
      const sonBeyanname = kdvBeyannameler[kdvBeyannameler.length - 1];

      if (sonBeyanname) {
        const mizanData = getMizanHesapBakiye(data.mizan, KDV_HESAPLARI.DEVREDEN_KDV);
        const mizanBakiye = Math.abs(mizanData.bakiye);
        const beyannameDeger = sonBeyanname.sonuc.devredenKDV || 0;
        const donemStr = formatDonem(sonBeyanname.donem);

        const isMatch = isWithinTolerance(beyannameDeger, mizanBakiye);

        results.push(createResult(
          this.ruleId,
          `${this.ruleName} (${donemStr})`,
          isMatch ? 'pass' : 'fail',
          beyannameDeger,
          mizanBakiye,
          {
            source: data.mizan.parseInfo.kaynak,
            field: '190 - Devreden KDV',
            value: mizanBakiye
          },
          {
            source: sonBeyanname.parseInfo.kaynak,
            field: 'Sonraki Doneme Devreden KDV',
            value: beyannameDeger
          },
          this.legalBasis
        ));
      }

      return results;
    }
  },

  {
    ruleId: 'R-KDV-004',
    ruleName: 'KDV Matematik Kontrolu',
    category: 'kdv',
    severity: 'warning',
    legalBasis: 'KDV Kanunu Md. 29',

    async check(data: CrossCheckInput): Promise<EngineCheckResult[]> {
      const results: EngineCheckResult[] = [];

      const kdvBeyannameler = data.kdvBeyannameler.filter(b => b.tip === 'BEYANNAME');

      for (const beyanname of kdvBeyannameler) {
        // Hesaplanan - Indirim = Odenecek veya Devreden
        const hesaplanan = beyanname.hesaplananKDV || 0;
        const indirim = beyanname.indirimler.toplam || 0;
        const fark = hesaplanan - indirim;

        const beklenen = fark > 0 ? fark : 0;
        const odenecek = beyanname.sonuc.odenecekKDV || 0;
        const donemStr = formatDonem(beyanname.donem);

        const isMatch = isWithinTolerance(beklenen, odenecek);

        results.push({
          ruleId: this.ruleId,
          ruleName: `${this.ruleName} (${donemStr})`,
          category: 'kdv',
          status: isMatch ? 'pass' : 'fail',
          severity: isMatch ? 'info' : 'warning',
          expected: beklenen,
          actual: odenecek,
          difference: isMatch ? undefined : Math.abs(beklenen - odenecek),
          evidenceA: {
            source: beyanname.parseInfo.kaynak,
            field: 'Hesaplanan - Indirim',
            value: `${hesaplanan} - ${indirim} = ${fark}`
          },
          evidenceB: {
            source: beyanname.parseInfo.kaynak,
            field: 'Odenecek KDV',
            value: odenecek
          },
          message: isMatch
            ? 'KDV matematiksel tutarlilik dogrulandi'
            : `KDV matematiksel tutarsizlik: Beklenen ${beklenen.toFixed(2)}, Beyan ${odenecek.toFixed(2)}`,
          legalBasis: this.legalBasis,
          checkTime: new Date().toISOString()
        });
      }

      return results;
    }
  }
];

export async function runMizanKdvChecks(data: CrossCheckInput): Promise<EngineCheckResult[]> {
  const allResults: EngineCheckResult[] = [];

  for (const rule of mizanKdvRules) {
    const results = await rule.check(data);
    allResults.push(...results);
  }

  return allResults;
}
