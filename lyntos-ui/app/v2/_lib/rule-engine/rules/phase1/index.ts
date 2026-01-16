/**
 * LYNTOS Rule Engine - Phase 1 Rules
 * Sprint 5.4 - Hesaplama Kuralları
 *
 * Bu faz dönem sonu hesaplamalarını kontrol eder:
 * - Amortisman
 * - Kıdem tazminatı karşılığı
 * - Şüpheli alacak karşılığı
 * - Stok değerleme
 * - Reeskont
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
// P1-001: AMORTİSMAN KONTROLÜ
// ═══════════════════════════════════════════════════════════════════

export class AmortismanKontrolRule extends BaseRule {
  readonly id = 'P1-001';
  readonly name = 'Amortisman Hesaplama Kontrolü';
  readonly description = 'Maddi duran varlıklar için amortisman ayrılıp ayrılmadığını kontrol eder';
  readonly category = RuleCategory.DEPRECIATION;
  readonly phase = RulePhase.COMPUTE;
  readonly tags = ['amortisman', 'mdv', 'donem-sonu'];
  readonly dependencies: string[] = ['P0-001', 'P0-002'];
  readonly legalRefs = ['VUK 313-321', 'GVK 40'];
  readonly threshold: Threshold = { absoluteAmount: 5000 };

  protected async executeLogic(context: RuleContext): Promise<RuleTriggerOutput | null> {
    // 25x hesapları: Maddi Duran Varlıklar
    const mdvHesaplari = context.mizan.filter(h =>
      h.kod.startsWith('25') && !h.kod.startsWith('257')
    );
    const mdvToplam = mdvHesaplari.reduce((sum, h) =>
      sum + (h.bakiyeYonu === 'B' ? h.bakiye : -h.bakiye), 0
    );

    // 257 hesapları: Birikmiş Amortismanlar
    const birikimAmortisman = context.mizan.filter(h => h.kod.startsWith('257'));
    const amortismanToplam = birikimAmortisman.reduce((sum, h) =>
      sum + (h.bakiyeYonu === 'A' ? h.bakiye : -h.bakiye), 0
    );

    // 770 hesabı: Dönem amortisman gideri
    const donemAmortisman = context.mizan.filter(h => h.kod.startsWith('770'));
    const donemAmortismanTutar = donemAmortisman.reduce((sum, h) =>
      sum + (h.bakiyeYonu === 'B' ? h.bakiye : -h.bakiye), 0
    );

    // MDV varsa ama amortisman yoksa uyarı
    if (mdvToplam > (this.threshold.absoluteAmount || 0) && donemAmortismanTutar === 0) {
      return {
        severity: Severity.HIGH,
        title: 'Amortisman Ayrılmamış',
        summary: `${this.formatTL(mdvToplam)} MDV için dönem amortismanı hesaplanmamış`,
        why: `Maddi duran varlıklar için VUK 313-321 uyarınca amortisman ayrılması zorunludur.
              MDV Toplam: ${this.formatTL(mdvToplam)}
              Birikmiş Amortisman: ${this.formatTL(amortismanToplam)}
              Dönem Amortismanı: ${this.formatTL(donemAmortismanTutar)}`,
        actions: [
          { id: 'amortisman-hesapla', label: 'Amortisman Tablosu Oluştur', type: 'calculation', priority: 'high', assignee: 'SMMM' },
          { id: 'kayit-yap', label: 'Amortisman Kaydı Yap', type: 'correction', priority: 'high', assignee: 'SMMM' },
        ],
        evidenceRefs: [
          { type: 'mizan', source: '25x MDV', value: mdvToplam },
          { type: 'mizan', source: '257 Birikmiş Amortisman', value: amortismanToplam },
          { type: 'mizan', source: '770 Dönem Amortismanı', value: donemAmortismanTutar },
        ],
        impact: {
          area: 'Dönem Sonu',
          potentialIssue: 'Eksik gider, fazla vergi',
          estimatedAmount: mdvToplam * 0.20, // Tahmini %20 amortisman
          magnitude: 'HIGH'
        },
        tags: ['amortisman', 'mdv', 'donem-sonu'],
      };
    }

    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// P1-002: KIDEM TAZMİNATI KARŞILIĞI
// ═══════════════════════════════════════════════════════════════════

export class KidemTazminatiKarsilikRule extends BaseRule {
  readonly id = 'P1-002';
  readonly name = 'Kıdem Tazminatı Karşılığı Kontrolü';
  readonly description = 'Personel gideri varsa kıdem tazminatı karşılığı kontrolü';
  readonly category = RuleCategory.TAX_COMPLIANCE;
  readonly phase = RulePhase.COMPUTE;
  readonly tags = ['kidem', 'karsilik', 'personel'];
  readonly dependencies: string[] = ['P0-001'];
  readonly legalRefs = ['TMS 19', 'VUK 288'];
  readonly threshold: Threshold = { absoluteAmount: 100000 }; // Yıllık 100K personel gideri

  protected async executeLogic(context: RuleContext): Promise<RuleTriggerOutput | null> {
    // 770-779: Personel giderleri (Genel Yönetim dahil)
    const personelGiderleri = context.mizan.filter(h =>
      h.kod.startsWith('77') || h.kod.startsWith('62')
    );
    const personelToplam = personelGiderleri.reduce((sum, h) =>
      sum + (h.bakiyeYonu === 'B' ? h.bakiye : -h.bakiye), 0
    );

    // 472: Kıdem Tazminatı Karşılığı
    const kidemKarsilik = context.mizan.find(h => h.kod.startsWith('472'));
    const kidemToplam = kidemKarsilik ?
      (kidemKarsilik.bakiyeYonu === 'A' ? kidemKarsilik.bakiye : -kidemKarsilik.bakiye) : 0;

    if (personelToplam > (this.threshold.absoluteAmount || 0) && kidemToplam === 0) {
      // 2024 kıdem tazminatı tavanı: 35.058,58 TL
      const tahminiKarsilik = personelToplam * 0.0833; // ~1 aylık brüt

      return {
        severity: Severity.MEDIUM,
        title: 'Kıdem Tazminatı Karşılığı Ayrılmamış',
        summary: `${this.formatTL(personelToplam)} personel gideri var, karşılık yok`,
        why: `Personel çalıştıran işletmelerin kıdem tazminatı karşılığı ayırması önerilir (TMS 19).
              Personel Giderleri: ${this.formatTL(personelToplam)}
              Mevcut Karşılık: ${this.formatTL(kidemToplam)}
              Tahmini İhtiyaç: ${this.formatTL(tahminiKarsilik)}`,
        actions: [
          { id: 'karsilik-hesapla', label: 'Karşılık Hesapla', type: 'calculation', priority: 'medium', assignee: 'SMMM' },
        ],
        evidenceRefs: [
          { type: 'mizan', source: '77x/62x Personel Giderleri', value: personelToplam },
          { type: 'mizan', source: '472 Kıdem Karşılığı', value: kidemToplam },
        ],
        impact: {
          area: 'Finansal Raporlama',
          potentialIssue: 'Eksik yükümlülük',
          estimatedAmount: tahminiKarsilik,
          magnitude: 'MEDIUM'
        },
        tags: ['kidem', 'karsilik', 'tms'],
      };
    }

    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// P1-003: ŞÜPHELİ ALACAK KARŞILIĞI
// ═══════════════════════════════════════════════════════════════════

export class SupheliAlacakKarsilikRule extends BaseRule {
  readonly id = 'P1-003';
  readonly name = 'Şüpheli Alacak Karşılığı Kontrolü';
  readonly description = 'Ticari alacaklar için şüpheli alacak karşılığı değerlendirmesi';
  readonly category = RuleCategory.TAX_COMPLIANCE;
  readonly phase = RulePhase.COMPUTE;
  readonly tags = ['supheli-alacak', 'karsilik', 'alacak'];
  readonly dependencies: string[] = ['P0-001'];
  readonly legalRefs = ['VUK 323', 'VUK 324'];
  readonly threshold: Threshold = { absoluteAmount: 14000 }; // 2024 dava açma sınırı

  protected async executeLogic(context: RuleContext): Promise<RuleTriggerOutput | null> {
    // 120: Alıcılar
    const alicilar = context.mizan.filter(h => h.kod.startsWith('120'));
    const alicilarToplam = alicilar.reduce((sum, h) =>
      sum + (h.bakiyeYonu === 'B' ? h.bakiye : -h.bakiye), 0
    );

    // 128: Şüpheli Ticari Alacaklar
    const supheliAlacak = context.mizan.find(h => h.kod.startsWith('128'));
    const supheliToplam = supheliAlacak ?
      (supheliAlacak.bakiyeYonu === 'B' ? supheliAlacak.bakiye : -supheliAlacak.bakiye) : 0;

    // 129: Şüpheli Alacak Karşılığı (-)
    const karsilik = context.mizan.find(h => h.kod.startsWith('129'));
    const karsilikToplam = karsilik ?
      (karsilik.bakiyeYonu === 'A' ? karsilik.bakiye : -karsilik.bakiye) : 0;

    // Büyük alacak varsa ve karşılık yoksa bilgilendir
    if (alicilarToplam > 500000 && karsilikToplam === 0) {
      const tavsiyeKarsilik = alicilarToplam * 0.02; // %2 genel karşılık önerisi

      return {
        severity: Severity.LOW,
        title: 'Şüpheli Alacak Değerlendirmesi Önerisi',
        summary: `${this.formatTL(alicilarToplam)} alacak için karşılık değerlendirmesi yapılmalı`,
        why: `VUK 323-324 uyarınca tahsili şüpheli hale gelen alacaklar için karşılık ayrılabilir.
              Alıcılar: ${this.formatTL(alicilarToplam)}
              Şüpheli Alacak (128): ${this.formatTL(supheliToplam)}
              Karşılık (129): ${this.formatTL(karsilikToplam)}
              2024 Dava Açma Sınırı: ${this.formatTL(this.threshold.absoluteAmount || 14000)}`,
        actions: [
          { id: 'yaslandirma', label: 'Alacak Yaşlandırma Raporu', type: 'analysis', priority: 'low', assignee: 'SMMM' },
        ],
        evidenceRefs: [
          { type: 'mizan', source: '120 Alıcılar', value: alicilarToplam },
          { type: 'mizan', source: '129 Karşılık', value: karsilikToplam },
        ],
        impact: {
          area: 'Vergi Avantajı',
          potentialIssue: 'Kullanılmayan vergi avantajı',
          estimatedAmount: tavsiyeKarsilik * 0.25,
          magnitude: 'LOW'
        },
        tags: ['supheli-alacak', 'karsilik'],
      };
    }

    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// P1-004: REESKONT HESAPLAMASI
// ═══════════════════════════════════════════════════════════════════

export class ReeskontKontrolRule extends BaseRule {
  readonly id = 'P1-004';
  readonly name = 'Reeskont Hesaplama Kontrolü';
  readonly description = 'Alacak/borç senetleri için reeskont değerlendirmesi';
  readonly category = RuleCategory.TAX_COMPLIANCE;
  readonly phase = RulePhase.COMPUTE;
  readonly tags = ['reeskont', 'senet', 'donem-sonu'];
  readonly dependencies: string[] = ['P0-001'];
  readonly legalRefs = ['VUK 281', 'VUK 285'];
  readonly threshold: Threshold = { absoluteAmount: 50000 };

  protected async executeLogic(context: RuleContext): Promise<RuleTriggerOutput | null> {
    // 121: Alacak Senetleri
    const alacakSenet = context.mizan.filter(h => h.kod.startsWith('121'));
    const alacakSenetToplam = alacakSenet.reduce((sum, h) =>
      sum + (h.bakiyeYonu === 'B' ? h.bakiye : -h.bakiye), 0
    );

    // 321: Borç Senetleri
    const borcSenet = context.mizan.filter(h => h.kod.startsWith('321'));
    const borcSenetToplam = borcSenet.reduce((sum, h) =>
      sum + (h.bakiyeYonu === 'A' ? h.bakiye : -h.bakiye), 0
    );

    // 122/322: Reeskont hesapları
    const alacakReeskont = context.mizan.find(h => h.kod.startsWith('122'));
    const borcReeskont = context.mizan.find(h => h.kod.startsWith('322'));

    const senetToplam = alacakSenetToplam + borcSenetToplam;
    const reeskontVar = alacakReeskont || borcReeskont;

    if (senetToplam > (this.threshold.absoluteAmount || 0) && !reeskontVar) {
      const reeskontOrani = context.oranlar?.faizOranlari?.tcmb_ticari_tl || 55.75;
      const tahminiReeskont = senetToplam * (reeskontOrani / 100) * (90 / 365); // 90 gün ortalama

      return {
        severity: Severity.MEDIUM,
        title: 'Reeskont Hesaplaması Yapılmamış',
        summary: `${this.formatTL(senetToplam)} senet için reeskont değerlendirmesi yapılmalı`,
        why: `VUK 281/285 uyarınca vadeli senetler reeskonta tabi tutulabilir.
              Alacak Senetleri: ${this.formatTL(alacakSenetToplam)}
              Borç Senetleri: ${this.formatTL(borcSenetToplam)}
              TCMB Reeskont Oranı: %${reeskontOrani}
              Tahmini Reeskont (90 gün): ${this.formatTL(tahminiReeskont)}`,
        actions: [
          { id: 'reeskont-hesapla', label: 'Reeskont Tablosu Oluştur', type: 'calculation', priority: 'medium', assignee: 'SMMM' },
        ],
        evidenceRefs: [
          { type: 'mizan', source: '121 Alacak Senetleri', value: alacakSenetToplam },
          { type: 'mizan', source: '321 Borç Senetleri', value: borcSenetToplam },
          { type: 'hesaplama', source: 'Reeskont Oranı', value: `%${reeskontOrani}` },
        ],
        impact: {
          area: 'Vergi Avantajı',
          potentialIssue: 'Kullanılmayan reeskont avantajı',
          estimatedAmount: tahminiReeskont * 0.25,
          magnitude: 'MEDIUM'
        },
        tags: ['reeskont', 'senet'],
      };
    }

    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// P1-005: STOK DEĞERLEME KONTROLÜ
// ═══════════════════════════════════════════════════════════════════

export class StokDegerlemeRule extends BaseRule {
  readonly id = 'P1-005';
  readonly name = 'Stok Değerleme Kontrolü';
  readonly description = 'Stok değerleme yöntemi ve dönem sonu envanter kontrolü';
  readonly category = RuleCategory.TAX_COMPLIANCE;
  readonly phase = RulePhase.COMPUTE;
  readonly tags = ['stok', 'degerleme', 'envanter'];
  readonly dependencies: string[] = ['P0-001'];
  readonly legalRefs = ['VUK 274', 'VUK 275'];
  readonly threshold: Threshold = { absoluteAmount: 100000 };

  protected async executeLogic(context: RuleContext): Promise<RuleTriggerOutput | null> {
    // 15x: Stoklar
    const stoklar = context.mizan.filter(h => h.kod.startsWith('15'));
    const stokToplam = stoklar.reduce((sum, h) =>
      sum + (h.bakiyeYonu === 'B' ? h.bakiye : -h.bakiye), 0
    );

    // 62x: SMM (Satılan Malın Maliyeti)
    const smm = context.mizan.filter(h => h.kod.startsWith('62'));
    const smmToplam = smm.reduce((sum, h) =>
      sum + (h.bakiyeYonu === 'B' ? h.bakiye : -h.bakiye), 0
    );

    // Stok/SMM oranı kontrolü - çok yüksekse envanter sorunu olabilir
    if (stokToplam > (this.threshold.absoluteAmount || 0) && smmToplam > 0) {
      const stokDevir = smmToplam / stokToplam;

      // Stok devir hızı çok düşükse (yılda 2'den az) uyarı
      if (stokDevir < 2) {
        return {
          severity: Severity.LOW,
          title: 'Düşük Stok Devir Hızı',
          summary: `Stok devir hızı: ${stokDevir.toFixed(2)} (yıllık). Envanter değerlemesi gözden geçirilmeli`,
          why: `Düşük stok devir hızı, eskimiş veya değer kaybetmiş stok olabileceğine işaret eder.
                Stok Toplam: ${this.formatTL(stokToplam)}
                SMM: ${this.formatTL(smmToplam)}
                Devir Hızı: ${stokDevir.toFixed(2)}x`,
          actions: [
            { id: 'envanter', label: 'Envanter Sayımı Yap', type: 'verification', priority: 'low', assignee: 'MUKELLEF' },
            { id: 'deger-dusuk', label: 'Değer Düşüklüğü Değerlendir', type: 'analysis', priority: 'low', assignee: 'SMMM' },
          ],
          evidenceRefs: [
            { type: 'mizan', source: '15x Stoklar', value: stokToplam },
            { type: 'mizan', source: '62x SMM', value: smmToplam },
            { type: 'hesaplama', source: 'Devir Hızı', value: stokDevir.toFixed(2) },
          ],
          impact: {
            area: 'Finansal Analiz',
            potentialIssue: 'Olası değer düşüklüğü',
            magnitude: 'LOW'
          },
          tags: ['stok', 'envanter', 'degerleme'],
        };
      }
    }

    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// P1-006: BİNEK OTO GİDER KISITLAMASI
// ═══════════════════════════════════════════════════════════════════

export class BinekOtoGiderKisitlamaRule extends BaseRule {
  readonly id = 'P1-006';
  readonly name = 'Binek Oto Gider Kısıtlaması';
  readonly description = 'Binek otomobil giderleri için KKEG kontrolü';
  readonly category = RuleCategory.TAX_COMPLIANCE;
  readonly phase = RulePhase.COMPUTE;
  readonly tags = ['binek-oto', 'kkeg', 'gider-kisitlama'];
  readonly dependencies: string[] = ['P0-001'];
  readonly legalRefs = ['GVK 40/5', 'GVK 68'];
  readonly threshold: Threshold = { absoluteAmount: 1000 };

  protected async executeLogic(context: RuleContext): Promise<RuleTriggerOutput | null> {
    // 254: Taşıtlar
    const tasitlar = context.mizan.filter(h => h.kod.startsWith('254'));
    const tasitToplam = tasitlar.reduce((sum, h) =>
      sum + (h.bakiyeYonu === 'B' ? h.bakiye : -h.bakiye), 0
    );

    // 770: Genel yönetim giderleri içinde taşıt giderleri olabilir
    // 760: Pazarlama giderleri içinde taşıt giderleri olabilir

    if (tasitToplam > 0) {
      const yil = context.period.yil;
      const limitler = context.oranlar?.binekOtoLimitleri;

      const aylikKiraLimiti = limitler?.aylik_kira_limiti || (yil >= 2025 ? 37000 : 26000);
      const amortismanLimiti = limitler?.amortisman_limiti || (yil >= 2025 ? 2100000 : 1500000);

      // Limit aşımı kontrolü
      if (tasitToplam > amortismanLimiti) {
        const asanKisim = tasitToplam - amortismanLimiti;
        const kkegAmortisman = asanKisim * 0.20; // %20 amortisman KKEG

        return {
          severity: Severity.HIGH,
          title: 'Binek Oto Amortisman Limiti Aşımı',
          summary: `Taşıt bedeli ${yil} limitini ${this.formatTL(asanKisim)} aşıyor`,
          why: `GVK 40/5 uyarınca binek oto amortismanında limit vardır.
                Taşıt Bedeli: ${this.formatTL(tasitToplam)}
                ${yil} Limiti: ${this.formatTL(amortismanLimiti)}
                Aşan Kısım: ${this.formatTL(asanKisim)}
                Tahmini KKEG (yıllık amortisman): ${this.formatTL(kkegAmortisman)}`,
          actions: [
            { id: 'kkeg-hesapla', label: 'KKEG Hesapla', type: 'calculation', priority: 'high', assignee: 'SMMM' },
          ],
          evidenceRefs: [
            { type: 'mizan', source: '254 Taşıtlar', value: tasitToplam },
            { type: 'mevzuat', source: `${yil} Amortisman Limiti`, value: amortismanLimiti },
          ],
          impact: {
            area: 'Vergi Matrahı',
            potentialIssue: 'KKEG eksik hesaplanmış olabilir',
            estimatedAmount: kkegAmortisman,
            magnitude: 'HIGH'
          },
          tags: ['binek-oto', 'kkeg', 'amortisman'],
        };
      }
    }

    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════

export const PHASE_1_RULES = [
  new AmortismanKontrolRule(),
  new KidemTazminatiKarsilikRule(),
  new SupheliAlacakKarsilikRule(),
  new ReeskontKontrolRule(),
  new StokDegerlemeRule(),
  new BinekOtoGiderKisitlamaRule(),
];
