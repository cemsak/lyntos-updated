/**
 * LYNTOS Mizan <-> Banka Ekstre Cross-Check
 *
 * Kontroller:
 * R-BNK-001: 102.xx hesaplari = Ilgili banka kapanis bakiyeleri
 */

import type {
  EngineCheckRule,
  EngineCheckResult,
  CrossCheckInput,
  ToleranceConfig
} from '../types';
import { DEFAULT_TOLERANCE } from '../types';
import type { BankaKodu } from '../../types';

// Banka hesap kodu eslestirmeleri (ornek - gercek eslestirme mukellefe gore degisir)
const BANKA_HESAP_ESLESTIRME: Record<string, string[]> = {
  'YKB': ['102.01', '102.001', '102.10'],
  'AKBANK': ['102.02', '102.002', '102.20'],
  'HALKBANK': ['102.03', '102.003', '102.30'],
  'ZIRAAT': ['102.04', '102.004', '102.40'],
  'ALBARAKA': ['102.05', '102.005', '102.50'],
  'VAKIFBANK': ['102.06', '102.006', '102.60'],
  'GARANTI': ['102.07', '102.007', '102.70'],
  'ISBANK': ['102.08', '102.008', '102.80']
};

// Banka adlari - mizan hesap adinda arama icin
const BANKA_ADLARI: Record<string, string[]> = {
  'YKB': ['YAPI', 'KREDI', 'YKB'],
  'AKBANK': ['AKBANK', 'AKB'],
  'HALKBANK': ['HALK', 'HLK'],
  'ZIRAAT': ['ZIRAAT', 'ZRT'],
  'ALBARAKA': ['ALBARAKA', 'ALB'],
  'VAKIFBANK': ['VAKIF', 'VKF'],
  'GARANTI': ['GARANTI', 'GRT'],
  'ISBANK': ['IS BANK', 'ISBANK', 'ISB']
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

function findBankaHesapBakiye(
  mizan: CrossCheckInput['mizan'],
  bankaKodu: BankaKodu
): { found: boolean; bakiye: number; hesapKodu: string | null } {
  if (!mizan || !mizan.hesaplar) {
    return { found: false, bakiye: 0, hesapKodu: null };
  }

  const possibleCodes = BANKA_HESAP_ESLESTIRME[bankaKodu] || [];

  for (const code of possibleCodes) {
    const hesap = mizan.hesaplar.find(h => h.hesapKodu.startsWith(code));
    if (hesap) {
      const bakiye = hesap.borcBakiye - hesap.alacakBakiye; // 102 borc bakiyeli
      return { found: true, bakiye, hesapKodu: hesap.hesapKodu };
    }
  }

  // 102 altinda banka adini ara
  const searchTerms = BANKA_ADLARI[bankaKodu] || [];
  for (const hesap of mizan.hesaplar) {
    if (hesap.hesapKodu.startsWith('102')) {
      const upper = hesap.hesapAdi.toUpperCase();
      if (searchTerms.some(term => upper.includes(term))) {
        const bakiye = hesap.borcBakiye - hesap.alacakBakiye;
        return { found: true, bakiye, hesapKodu: hesap.hesapKodu };
      }
    }
  }

  return { found: false, bakiye: 0, hesapKodu: null };
}

export const mizanBankaRules: EngineCheckRule[] = [
  {
    ruleId: 'R-BNK-001',
    ruleName: 'Banka Bakiye Kontrolu',
    category: 'banka',
    severity: 'critical',
    legalBasis: 'VUK Md. 219',

    async check(data: CrossCheckInput): Promise<EngineCheckResult[]> {
      const results: EngineCheckResult[] = [];

      if (!data.mizan) {
        return [{
          ruleId: this.ruleId,
          ruleName: this.ruleName,
          category: 'banka',
          status: 'skip',
          severity: 'info',
          expected: null,
          actual: null,
          evidenceA: { source: 'N/A', field: 'mizan', value: 'eksik' },
          evidenceB: { source: 'N/A', field: 'banka', value: 'N/A' },
          message: 'Mizan verisi bulunamadi.',
          checkTime: new Date().toISOString()
        }];
      }

      if (data.bankaEkstreleri.length === 0) {
        return [{
          ruleId: this.ruleId,
          ruleName: this.ruleName,
          category: 'banka',
          status: 'skip',
          severity: 'info',
          expected: null,
          actual: null,
          evidenceA: { source: data.mizan.parseInfo.kaynak, field: '102', value: 'mevcut' },
          evidenceB: { source: 'N/A', field: 'ekstre', value: 'eksik' },
          message: 'Banka ekstresi bulunamadi.',
          checkTime: new Date().toISOString()
        }];
      }

      // Her banka icin kontrol
      for (const ekstre of data.bankaEkstreleri) {
        const bankaKodu = ekstre.banka;
        const ekstreKapanisBakiye = ekstre.toplamlar.kapanisBakiye;

        const mizanData = findBankaHesapBakiye(data.mizan, bankaKodu);

        if (!mizanData.found) {
          results.push({
            ruleId: this.ruleId,
            ruleName: `${this.ruleName} - ${bankaKodu}`,
            category: 'banka',
            status: 'partial',
            severity: 'warning',
            expected: ekstreKapanisBakiye,
            actual: null,
            evidenceA: {
              source: data.mizan.parseInfo.kaynak,
              field: `102.xx (${bankaKodu})`,
              value: 'bulunamadi'
            },
            evidenceB: {
              source: ekstre.parseInfo.kaynak,
              field: 'Kapanis Bakiyesi',
              value: ekstreKapanisBakiye
            },
            message: `${bankaKodu} icin mizan hesabi bulunamadi`,
            suggestion: 'Banka hesap kodunu kontrol ediniz veya hesap eslestirmesi yapiniz.',
            legalBasis: this.legalBasis,
            checkTime: new Date().toISOString()
          });
          continue;
        }

        const isMatch = isWithinTolerance(ekstreKapanisBakiye, mizanData.bakiye);

        results.push({
          ruleId: this.ruleId,
          ruleName: `${this.ruleName} - ${bankaKodu}`,
          category: 'banka',
          status: isMatch ? 'pass' : 'fail',
          severity: isMatch ? 'info' : 'critical',
          expected: ekstreKapanisBakiye,
          actual: mizanData.bakiye,
          difference: isMatch ? undefined : Math.abs(ekstreKapanisBakiye - mizanData.bakiye),
          evidenceA: {
            source: data.mizan.parseInfo.kaynak,
            field: `${mizanData.hesapKodu} - ${bankaKodu}`,
            value: mizanData.bakiye
          },
          evidenceB: {
            source: ekstre.parseInfo.kaynak,
            field: 'Kapanis Bakiyesi',
            value: ekstreKapanisBakiye
          },
          message: isMatch
            ? `${bankaKodu} bakiyesi tutarli`
            : `${bankaKodu} bakiye farki: ${Math.abs(ekstreKapanisBakiye - mizanData.bakiye).toFixed(2)} TL`,
          suggestion: isMatch ? undefined : 'Banka mutabakatini kontrol ediniz, eksik/fazla kayitlari tespit ediniz.',
          legalBasis: this.legalBasis,
          checkTime: new Date().toISOString()
        });
      }

      return results;
    }
  }
];

export async function runMizanBankaChecks(data: CrossCheckInput): Promise<EngineCheckResult[]> {
  const allResults: EngineCheckResult[] = [];

  for (const rule of mizanBankaRules) {
    const results = await rule.check(data);
    allResults.push(...results);
  }

  return allResults;
}
