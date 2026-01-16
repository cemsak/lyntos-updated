/**
 * LYNTOS Rule Engine - Phase 3 Rules
 * Sprint 5.5 - Çapraz Kontrol Kuralları
 *
 * Bu faz farklı kaynaklar arası tutarlılık kontrolü yapar:
 * - Mizan ↔ KDV Beyanname
 * - Mizan ↔ Muhtasar
 * - Mizan ↔ Ba/Bs
 * - Kasa ↔ Banka tutarlılığı
 * - Dönem karı tutarlılığı
 */

import {
  BaseRule,
  RulePhase,
  RuleCategory,
  RuleContext,
  RuleTriggerOutput,
  Severity,
  Threshold
} from '../../types';

// ═══════════════════════════════════════════════════════════════════
// P3-001: MİZAN ↔ KDV BEYANNAME MUTABAKATI
// ═══════════════════════════════════════════════════════════════════

export class MizanKdvMutabakatRule extends BaseRule {
  readonly id = 'P3-001';
  readonly name = 'Mizan - KDV Beyanname Mutabakatı';
  readonly description = 'Mizan KDV hesapları ile KDV beyannamesi tutarlılık kontrolü';
  readonly category = RuleCategory.RECONCILIATION;
  readonly phase = RulePhase.CROSSCHECK;
  readonly tags = ['mutabakat', 'kdv', 'beyanname'];
  readonly dependencies: string[] = ['P0-001', 'P0-002'];
  readonly legalRefs = ['KDVK 29', 'VUK 171'];
  readonly threshold: Threshold = { absoluteAmount: 100 };

  protected async executeLogic(context: RuleContext): Promise<RuleTriggerOutput | null> {
    // 191: İndirilecek KDV
    const indirilecekKdv = context.mizan.filter(h => h.kod.startsWith('191'));
    const indirilecekToplam = indirilecekKdv.reduce((sum, h) =>
      sum + (h.bakiyeYonu === 'B' ? h.bakiye : -h.bakiye), 0
    );

    // 391: Hesaplanan KDV
    const hesaplananKdv = context.mizan.filter(h => h.kod.startsWith('391'));
    const hesaplananToplam = hesaplananKdv.reduce((sum, h) =>
      sum + (h.bakiyeYonu === 'A' ? h.bakiye : -h.bakiye), 0
    );

    // 360: Ödenecek Vergi ve Fonlar (KDV kısmı)
    const odenecekKdv = context.mizan.filter(h => h.kod.startsWith('360'));
    const odenecekToplam = odenecekKdv.reduce((sum, h) =>
      sum + (h.bakiyeYonu === 'A' ? h.bakiye : -h.bakiye), 0
    );

    // 190: Devreden KDV
    const devredenKdv = context.mizan.find(h => h.kod.startsWith('190'));
    const devredenToplam = devredenKdv ?
      (devredenKdv.bakiyeYonu === 'B' ? devredenKdv.bakiye : -devredenKdv.bakiye) : 0;

    // Basit mutabakat: Hesaplanan - İndirilecek = Ödenecek veya Devreden
    const hesapFark = hesaplananToplam - indirilecekToplam;
    const beklenenOdenecek = hesapFark > 0 ? hesapFark : 0;
    const beklenenDevreden = hesapFark < 0 ? Math.abs(hesapFark) : 0;

    const odenecekFark = Math.abs(beklenenOdenecek - odenecekToplam);
    const devredenFark = Math.abs(beklenenDevreden - devredenToplam);

    if (odenecekFark > (this.threshold.absoluteAmount || 0) || devredenFark > (this.threshold.absoluteAmount || 0)) {
      return {
        severity: Severity.HIGH,
        title: 'KDV Mutabakat Uyumsuzluğu',
        summary: `KDV hesapları arasında ${this.formatTL(Math.max(odenecekFark, devredenFark))} fark var`,
        why: `Mizan KDV hesapları ile beklenen değerler uyuşmuyor.
              Hesaplanan KDV (391): ${this.formatTL(hesaplananToplam)}
              İndirilecek KDV (191): ${this.formatTL(indirilecekToplam)}
              Fark: ${this.formatTL(hesapFark)}
              ---
              Ödenecek KDV (360): ${this.formatTL(odenecekToplam)} (Beklenen: ${this.formatTL(beklenenOdenecek)})
              Devreden KDV (190): ${this.formatTL(devredenToplam)} (Beklenen: ${this.formatTL(beklenenDevreden)})`,
        actions: [
          { id: 'kdv-mutabakat', label: 'KDV Mutabakat Tablosu', type: 'analysis', priority: 'high', assignee: 'SMMM' },
          { id: 'beyanname-kontrol', label: 'Beyanname Kontrolü', type: 'verification', priority: 'high', assignee: 'SMMM' },
        ],
        evidenceRefs: [
          { type: 'mizan', source: '391 Hesaplanan KDV', value: hesaplananToplam },
          { type: 'mizan', source: '191 İndirilecek KDV', value: indirilecekToplam },
          { type: 'mizan', source: '360 Ödenecek KDV', value: odenecekToplam },
          { type: 'mizan', source: '190 Devreden KDV', value: devredenToplam },
        ],
        impact: {
          area: 'Beyanname Uyumu',
          potentialIssue: 'KDV beyannamesi ile mizan uyumsuz',
          estimatedAmount: Math.max(odenecekFark, devredenFark),
          magnitude: 'HIGH'
        },
        tags: ['kdv', 'mutabakat', 'beyanname'],
      };
    }

    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// P3-002: GELİR-GİDER DENGESİ KONTROLÜ
// ═══════════════════════════════════════════════════════════════════

export class GelirGiderDengeRule extends BaseRule {
  readonly id = 'P3-002';
  readonly name = 'Gelir-Gider Dengesi Kontrolü';
  readonly description = 'Gelir ve gider hesaplarının dönem karı ile tutarlılığı';
  readonly category = RuleCategory.RECONCILIATION;
  readonly phase = RulePhase.CROSSCHECK;
  readonly tags = ['gelir', 'gider', 'kar', 'mutabakat'];
  readonly dependencies: string[] = ['P0-001'];
  readonly legalRefs = ['MSUGT', 'TMS 1'];
  readonly threshold: Threshold = { absoluteAmount: 100 };

  protected async executeLogic(context: RuleContext): Promise<RuleTriggerOutput | null> {
    // 6xx: Gelir hesapları
    const gelirler = context.mizan.filter(h => h.kod.startsWith('6'));
    const gelirToplam = gelirler.reduce((sum, h) =>
      sum + (h.bakiyeYonu === 'A' ? h.bakiye : -h.bakiye), 0
    );

    // 7xx: Gider hesapları (maliyet)
    const giderler = context.mizan.filter(h => h.kod.startsWith('7'));
    const giderToplam = giderler.reduce((sum, h) =>
      sum + (h.bakiyeYonu === 'B' ? h.bakiye : -h.bakiye), 0
    );

    // 690: Dönem Karı veya Zararı
    const donemKari = context.mizan.find(h => h.kod.startsWith('690'));
    const donemKariTutar = donemKari ?
      (donemKari.bakiyeYonu === 'A' ? donemKari.bakiye : -donemKari.bakiye) : 0;

    // 590: Dönem Net Karı
    const donemNetKari = context.mizan.find(h => h.kod.startsWith('590'));
    const netKarTutar = donemNetKari ?
      (donemNetKari.bakiyeYonu === 'A' ? donemNetKari.bakiye : -donemNetKari.bakiye) : 0;

    // Hesaplanan kar
    const hesaplananKar = gelirToplam - giderToplam;
    const fark = Math.abs(hesaplananKar - donemKariTutar);

    // Dönem sonu kapatma yapılmamış olabilir
    if (donemKariTutar === 0 && Math.abs(hesaplananKar) > 10000) {
      return {
        severity: Severity.MEDIUM,
        title: 'Dönem Sonu Kapatma Yapılmamış',
        summary: `Hesaplanan kar/zarar: ${this.formatTL(hesaplananKar)}, 690 hesabı boş`,
        why: `Gelir ve gider hesapları dönem sonunda 690'a kapatılmalıdır.
              Gelirler (6xx): ${this.formatTL(gelirToplam)}
              Giderler (7xx): ${this.formatTL(giderToplam)}
              Hesaplanan Kar/Zarar: ${this.formatTL(hesaplananKar)}
              690 Dönem Karı: ${this.formatTL(donemKariTutar)}`,
        actions: [
          { id: 'kapatma', label: 'Dönem Sonu Kapatma Kayıtları', type: 'correction', priority: 'medium', assignee: 'SMMM' },
        ],
        evidenceRefs: [
          { type: 'mizan', source: '6xx Gelirler', value: gelirToplam },
          { type: 'mizan', source: '7xx Giderler', value: giderToplam },
          { type: 'hesaplama', source: 'Kar/Zarar', value: hesaplananKar },
        ],
        impact: {
          area: 'Dönem Sonu',
          potentialIssue: 'Bilanço/Gelir Tablosu tamamlanamaz',
          magnitude: 'MEDIUM'
        },
        tags: ['donem-sonu', 'kapatma', 'kar'],
      };
    }

    // Fark varsa uyarı
    if (fark > (this.threshold.absoluteAmount || 0) && donemKariTutar !== 0) {
      return {
        severity: Severity.HIGH,
        title: 'Gelir-Gider / Dönem Karı Uyumsuzluğu',
        summary: `Hesaplanan kar ile 690 arasında ${this.formatTL(fark)} fark var`,
        why: `Gelir-Gider farkı dönem karı ile uyuşmuyor.
              Hesaplanan: ${this.formatTL(hesaplananKar)}
              690 Kayıtlı: ${this.formatTL(donemKariTutar)}
              Fark: ${this.formatTL(fark)}`,
        actions: [
          { id: 'analiz', label: 'Fark Analizi Yap', type: 'analysis', priority: 'high', assignee: 'SMMM' },
        ],
        evidenceRefs: [
          { type: 'hesaplama', source: 'Hesaplanan Kar', value: hesaplananKar },
          { type: 'mizan', source: '690 Dönem Karı', value: donemKariTutar },
        ],
        impact: {
          area: 'Finansal Raporlama',
          potentialIssue: 'Kar/zarar tutarsızlığı',
          estimatedAmount: fark,
          magnitude: 'HIGH'
        },
        tags: ['kar', 'mutabakat'],
      };
    }

    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// P3-003: KASA-BANKA TUTARLILIĞI
// ═══════════════════════════════════════════════════════════════════

export class KasaBankaTutarlilikRule extends BaseRule {
  readonly id = 'P3-003';
  readonly name = 'Kasa-Banka Tutarlılık Kontrolü';
  readonly description = 'Kasa ve banka hesapları arası mantıksal tutarlılık';
  readonly category = RuleCategory.RECONCILIATION;
  readonly phase = RulePhase.CROSSCHECK;
  readonly tags = ['kasa', 'banka', 'nakit'];
  readonly dependencies: string[] = ['P0-001'];
  readonly legalRefs = ['VUK 171'];
  readonly threshold: Threshold = { ratio: 10 }; // Kasa/Banka oranı

  protected async executeLogic(context: RuleContext): Promise<RuleTriggerOutput | null> {
    // 100: Kasa
    const kasa = context.mizan.filter(h => h.kod.startsWith('100'));
    const kasaToplam = kasa.reduce((sum, h) =>
      sum + (h.bakiyeYonu === 'B' ? h.bakiye : -h.bakiye), 0
    );

    // 102: Bankalar
    const banka = context.mizan.filter(h => h.kod.startsWith('102'));
    const bankaToplam = banka.reduce((sum, h) =>
      sum + (h.bakiyeYonu === 'B' ? h.bakiye : -h.bakiye), 0
    );

    // Kasa çok yüksek, banka çok düşük - anormal durum
    if (kasaToplam > 0 && bankaToplam >= 0) {
      const kasaBankaOrani = bankaToplam > 0 ? kasaToplam / bankaToplam : (kasaToplam > 10000 ? 999 : 0);

      if (kasaBankaOrani > (this.threshold.ratio || 10)) {
        return {
          severity: Severity.MEDIUM,
          title: 'Kasa/Banka Oranı Anormal',
          summary: `Kasa ${this.formatTL(kasaToplam)}, Banka ${this.formatTL(bankaToplam)} - Oran: ${kasaBankaOrani.toFixed(1)}x`,
          why: `Modern işletmelerde kasanın bankadan çok yüksek olması anormal kabul edilir.
                Kasa (100): ${this.formatTL(kasaToplam)}
                Banka (102): ${this.formatTL(bankaToplam)}
                Kasa/Banka: ${kasaBankaOrani.toFixed(1)}x

                Bu durum VDK K-09 kriteri açısından da risk oluşturur.`,
          actions: [
            { id: 'kasa-analiz', label: 'Kasa Hareketlerini İncele', type: 'analysis', priority: 'medium', assignee: 'SMMM' },
          ],
          evidenceRefs: [
            { type: 'mizan', source: '100 Kasa', value: kasaToplam },
            { type: 'mizan', source: '102 Banka', value: bankaToplam },
          ],
          impact: {
            area: 'Nakit Yönetimi',
            potentialIssue: 'Anormal nakit yapısı',
            magnitude: 'MEDIUM'
          },
          tags: ['kasa', 'banka', 'nakit'],
        };
      }
    }

    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// P3-004: STOPAJ MUTABAKATI
// ═══════════════════════════════════════════════════════════════════

export class StopajMutabakatRule extends BaseRule {
  readonly id = 'P3-004';
  readonly name = 'Stopaj Mutabakatı';
  readonly description = 'Stopaj kesintileri ile muhtasar beyanname tutarlılığı';
  readonly category = RuleCategory.RECONCILIATION;
  readonly phase = RulePhase.CROSSCHECK;
  readonly tags = ['stopaj', 'muhtasar', 'mutabakat'];
  readonly dependencies: string[] = ['P0-001'];
  readonly legalRefs = ['GVK 94', 'GVK 98'];
  readonly threshold: Threshold = { absoluteAmount: 100 };

  protected async executeLogic(context: RuleContext): Promise<RuleTriggerOutput | null> {
    // 360: Ödenecek Vergi ve Fonlar
    const odenecekVergi = context.mizan.filter(h => h.kod.startsWith('360'));
    const vergiToplam = odenecekVergi.reduce((sum, h) =>
      sum + (h.bakiyeYonu === 'A' ? h.bakiye : -h.bakiye), 0
    );

    // 361: Ödenecek Sosyal Güvenlik Kesintileri
    const sgkKesinti = context.mizan.filter(h => h.kod.startsWith('361'));
    const sgkToplam = sgkKesinti.reduce((sum, h) =>
      sum + (h.bakiyeYonu === 'A' ? h.bakiye : -h.bakiye), 0
    );

    // Personel gideri varsa stopaj da olmalı
    const personelGider = context.mizan.filter(h => h.kod.startsWith('770') || h.kod.startsWith('760'));
    const personelToplam = personelGider.reduce((sum, h) =>
      sum + (h.bakiyeYonu === 'B' ? h.bakiye : -h.bakiye), 0
    );

    // Personel gideri var ama stopaj/SGK yok
    if (personelToplam > 50000 && (vergiToplam === 0 || sgkToplam === 0)) {
      return {
        severity: Severity.HIGH,
        title: 'Stopaj/SGK Eksikliği',
        summary: `${this.formatTL(personelToplam)} personel gideri var, stopaj/SGK hesapları boş`,
        why: `Personel çalıştıran işletmelerde gelir vergisi stopajı ve SGK kesintisi olmalıdır.
              Personel Giderleri: ${this.formatTL(personelToplam)}
              360 Ödenecek Vergi: ${this.formatTL(vergiToplam)}
              361 Ödenecek SGK: ${this.formatTL(sgkToplam)}`,
        actions: [
          { id: 'stopaj-kontrol', label: 'Stopaj Hesaplamalarını Kontrol Et', type: 'verification', priority: 'high', assignee: 'SMMM' },
          { id: 'muhtasar-kontrol', label: 'Muhtasar Beyanname Kontrolü', type: 'verification', priority: 'high', assignee: 'SMMM' },
        ],
        evidenceRefs: [
          { type: 'mizan', source: '77x/76x Personel Giderleri', value: personelToplam },
          { type: 'mizan', source: '360 Ödenecek Vergi', value: vergiToplam },
          { type: 'mizan', source: '361 Ödenecek SGK', value: sgkToplam },
        ],
        impact: {
          area: 'Vergi Uyumu',
          potentialIssue: 'Eksik stopaj/SGK beyanı',
          estimatedAmount: personelToplam * 0.35, // Tahmini %35 kesinti
          magnitude: 'HIGH'
        },
        tags: ['stopaj', 'sgk', 'personel'],
      };
    }

    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// P3-005: ALICI-SATICI BAKİYE KONTROLÜ
// ═══════════════════════════════════════════════════════════════════

export class AliciSaticiDengeRule extends BaseRule {
  readonly id = 'P3-005';
  readonly name = 'Alıcı-Satıcı Bakiye Kontrolü';
  readonly description = 'Ticari alacak ve borç hesaplarının mantıksal kontrolü';
  readonly category = RuleCategory.RECONCILIATION;
  readonly phase = RulePhase.CROSSCHECK;
  readonly tags = ['alici', 'satici', 'ticari'];
  readonly dependencies: string[] = ['P0-001'];
  readonly legalRefs = ['VUK 171', 'TTK 64'];
  readonly threshold: Threshold = { absoluteAmount: 1000 };

  protected async executeLogic(context: RuleContext): Promise<RuleTriggerOutput | null> {
    // 120: Alıcılar (Alacak bakiye vermeli - yani borç fazlası)
    const alicilar = context.mizan.filter(h => h.kod.startsWith('120'));
    const alicilarBorc = alicilar.reduce((sum, h) => sum + h.borc, 0);
    const alicilarAlacak = alicilar.reduce((sum, h) => sum + h.alacak, 0);

    // 320: Satıcılar (Borç bakiye vermeli - yani alacak fazlası)
    const saticilar = context.mizan.filter(h => h.kod.startsWith('320'));
    const saticilarBorc = saticilar.reduce((sum, h) => sum + h.borc, 0);
    const saticilarAlacak = saticilar.reduce((sum, h) => sum + h.alacak, 0);

    const issues: string[] = [];

    // Alıcılarda alacak bakiye (ters bakiye) kontrolü
    if (alicilarAlacak > alicilarBorc && (alicilarAlacak - alicilarBorc) > (this.threshold.absoluteAmount || 0)) {
      issues.push(`Alıcılar hesabı ${this.formatTL(alicilarAlacak - alicilarBorc)} alacak bakiye veriyor (ters bakiye)`);
    }

    // Satıcılarda borç bakiye (ters bakiye) kontrolü
    if (saticilarBorc > saticilarAlacak && (saticilarBorc - saticilarAlacak) > (this.threshold.absoluteAmount || 0)) {
      issues.push(`Satıcılar hesabı ${this.formatTL(saticilarBorc - saticilarAlacak)} borç bakiye veriyor (ters bakiye)`);
    }

    if (issues.length > 0) {
      return {
        severity: Severity.MEDIUM,
        title: 'Alıcı/Satıcı Ters Bakiye',
        summary: issues.join('; '),
        why: `Alıcılar normalde borç, satıcılar normalde alacak bakiye vermelidir.
              Ters bakiye, avans veya mahsup işlemleri olabilir, kontrol edilmelidir.

              120 Alıcılar - Borç: ${this.formatTL(alicilarBorc)}, Alacak: ${this.formatTL(alicilarAlacak)}
              320 Satıcılar - Borç: ${this.formatTL(saticilarBorc)}, Alacak: ${this.formatTL(saticilarAlacak)}`,
        actions: [
          { id: 'cari-analiz', label: 'Cari Hesap Analizi', type: 'analysis', priority: 'medium', assignee: 'SMMM' },
          { id: 'avans-kontrol', label: 'Avans Hesaplarını Kontrol Et', type: 'verification', priority: 'medium', assignee: 'SMMM' },
        ],
        evidenceRefs: [
          { type: 'mizan', source: '120 Alıcılar', value: `B:${alicilarBorc} A:${alicilarAlacak}` },
          { type: 'mizan', source: '320 Satıcılar', value: `B:${saticilarBorc} A:${saticilarAlacak}` },
        ],
        impact: {
          area: 'Cari Hesaplar',
          potentialIssue: 'Ters bakiye veya sınıflandırma hatası',
          magnitude: 'MEDIUM'
        },
        tags: ['alici', 'satici', 'ters-bakiye'],
      };
    }

    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════

export const PHASE_3_RULES = [
  new MizanKdvMutabakatRule(),
  new GelirGiderDengeRule(),
  new KasaBankaTutarlilikRule(),
  new StopajMutabakatRule(),
  new AliciSaticiDengeRule(),
];
