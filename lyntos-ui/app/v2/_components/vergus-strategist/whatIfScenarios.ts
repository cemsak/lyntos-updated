import type { WhatIfScenario } from './whatIfTypes';
import { TAX_RATES_2025 } from './whatIfTypes';

// What-If Senaryolari - SMMM/YMM Odakli
export const WHAT_IF_SCENARIOS: WhatIfScenario[] = [
  {
    id: 'ihracat-istisnasi',
    name: 'İhracat Hasılat İstisnası',
    description: 'İhracat hasılatının %5\'i kurumlar vergisinden istisna',
    category: 'istisna',
    inputLabel: 'İhracat Hasılatı',
    inputUnit: 'TL',
    defaultValue: 5000000,
    minValue: 0,
    maxValue: 500000000,
    legalBasis: 'KVK Md. 5/1-e',
    difficulty: 'kolay',
    applicableConditions: [
      'İhracat faaliyeti bulunmalı',
      'Döviz kazandırıcı faaliyet belgesi faydalı',
    ],
    calculate: (ihracatHasilati, base) => {
      const istisna = ihracatHasilati * 0.05;
      const currentTax = base.kvMatrahi * TAX_RATES_2025.kv;
      const newMatrah = Math.max(0, base.kvMatrahi - istisna);
      const newTax = newMatrah * TAX_RATES_2025.kv;
      const saving = currentTax - newTax;

      return {
        currentTax,
        newTax,
        saving,
        effectiveRate: newTax / base.kvMatrahi * 100,
        calculations: [
          `İhracat Hasılatı: ${ihracatHasilati.toLocaleString('tr-TR')} TL`,
          `İstisna Oranı: %5`,
          `İstisna Tutarı: ${istisna.toLocaleString('tr-TR')} TL`,
          `Mevcut Matrah: ${base.kvMatrahi.toLocaleString('tr-TR')} TL`,
          `Yeni Matrah: ${newMatrah.toLocaleString('tr-TR')} TL`,
          `Vergi Tasarrufu: ${saving.toLocaleString('tr-TR')} TL`,
        ],
        requirements: [
          'Beyanname üzerinde istisna ayrıca gösterilmeli',
          'İhracat belgeleri muhafaza edilmeli',
        ],
      };
    },
  },

  {
    id: 'arge-indirimi',
    name: 'Ar-Ge Harcama İndirimi',
    description: 'Ar-Ge harcamalarının %100\'ü ilave indirim',
    category: 'indirim',
    inputLabel: 'Ar-Ge Harcaması',
    inputUnit: 'TL',
    defaultValue: 1000000,
    minValue: 0,
    maxValue: 100000000,
    legalBasis: 'KVK Md. 10, 5746 SK',
    difficulty: 'orta',
    applicableConditions: [
      'Ar-Ge merkezi veya tasarım merkezi belgesi',
      'En az 15 tam zamanlı Ar-Ge personeli',
      'TÜBİTAK onaylı projeler avantajlı',
    ],
    calculate: (argeHarcamasi, base) => {
      const ilaveindirim = argeHarcamasi; // %100 ilave
      const currentTax = base.kvMatrahi * TAX_RATES_2025.kv;
      const newMatrah = Math.max(0, base.kvMatrahi - ilaveindirim);
      const newTax = newMatrah * TAX_RATES_2025.kv;
      const saving = currentTax - newTax;

      // Ek personel teşvikleri
      const personelTesvik = argeHarcamasi * 0.30 * 0.95; // Varsayım: harcamanın %30'u personel, %95 GV teşviki

      return {
        currentTax,
        newTax,
        saving: saving + personelTesvik,
        effectiveRate: newTax / base.kvMatrahi * 100,
        calculations: [
          `Ar-Ge Harcaması: ${argeHarcamasi.toLocaleString('tr-TR')} TL`,
          `İlave İndirim (%100): ${ilaveindirim.toLocaleString('tr-TR')} TL`,
          `Personel GV Teşviki (tahmini): ${personelTesvik.toLocaleString('tr-TR')} TL`,
          `KV Tasarrufu: ${saving.toLocaleString('tr-TR')} TL`,
          `Toplam Tasarruf: ${(saving + personelTesvik).toLocaleString('tr-TR')} TL`,
        ],
        requirements: [
          'Ar-Ge merkezi belgesi alınmalı',
          'Ar-Ge projesi tanımlanmalı ve belgelenmeli',
          'Ar-Ge personeli ayrı takip edilmeli',
        ],
        warnings: [
          'Ar-Ge harcamaları %100 belgelenmeli',
          'Proje başarısızlığında bile indirim geçerli',
        ],
      };
    },
  },

  {
    id: 'teknokent-istisnasi',
    name: 'Teknokent Kazanç İstisnası',
    description: 'Yazılım ve Ar-Ge kazançları %100 istisna (2028\'e kadar)',
    category: 'istisna',
    inputLabel: 'Teknokent Kazancı',
    inputUnit: 'TL',
    defaultValue: 3000000,
    minValue: 0,
    maxValue: 100000000,
    legalBasis: '4691 SK Geç.Md.2',
    difficulty: 'orta',
    applicableConditions: [
      'TGB\'de kayıtlı şirket olmalı',
      'Yazılım veya Ar-Ge faaliyeti yapılmalı',
      '2028 sonuna kadar geçerli',
    ],
    calculate: (teknokentKazanci, base) => {
      const istisna = teknokentKazanci; // %100 istisna
      const currentTax = base.kvMatrahi * TAX_RATES_2025.kv;
      const newMatrah = Math.max(0, base.kvMatrahi - istisna);
      const newTax = newMatrah * TAX_RATES_2025.kv;
      const saving = currentTax - newTax;

      return {
        currentTax,
        newTax,
        saving,
        effectiveRate: newTax / base.kvMatrahi * 100,
        calculations: [
          `Teknokent Kazancı: ${teknokentKazanci.toLocaleString('tr-TR')} TL`,
          `İstisna Oranı: %100`,
          `KV Tasarrufu: ${saving.toLocaleString('tr-TR')} TL`,
          `Efektif KV Oranı: %${(newTax / base.kvMatrahi * 100).toFixed(1)}`,
        ],
        requirements: [
          'TGB\'de ofis/çalışma alanı gerekli',
          'Yazılım geliştirme veya Ar-Ge faaliyeti belgeli olmalı',
          'Bölge dışı çalışma %50 ile sınırlı',
        ],
        warnings: [
          'İstisna 31.12.2028\'e kadar geçerli',
          'Bölge dışı faaliyetler istisna kapsamında değil',
        ],
      };
    },
  },

  {
    id: 'yatirim-tesviki',
    name: 'Yatırım Teşvik İndirimi',
    description: 'Bölgesel yatırım teşviki ile indirimli KV oranı',
    category: 'tesvik',
    inputLabel: 'Yatırım Tutarı',
    inputUnit: 'TL',
    defaultValue: 10000000,
    minValue: 0,
    maxValue: 1000000000,
    legalBasis: 'KVK Md. 32/A',
    difficulty: 'zor',
    applicableConditions: [
      'Yatırım teşvik belgesi alınmalı',
      'Bölgeye göre indirim oranı değişir',
      'Asgari yatırım tutarı şartı var',
    ],
    calculate: (yatirimTutari, base) => {
      // 5. bölge varsayımı: %40 yatırıma katkı, %80 vergi indirimi
      const yatirimaKatkiOrani = 0.40;
      const vergiIndirimiOrani = 0.80;
      const indirimlKvOrani = TAX_RATES_2025.kv * (1 - vergiIndirimiOrani);

      const toplamKatki = yatirimTutari * yatirimaKatkiOrani;
      const currentTax = base.kvMatrahi * TAX_RATES_2025.kv;
      const newTax = base.kvMatrahi * indirimlKvOrani;
      const saving = Math.min(currentTax - newTax, toplamKatki);

      return {
        currentTax,
        newTax,
        saving,
        effectiveRate: indirimlKvOrani * 100,
        calculations: [
          `Yatırım Tutarı: ${yatirimTutari.toLocaleString('tr-TR')} TL`,
          `Bölge: 5. Bölge (varsayım)`,
          `Yatırıma Katkı Oranı: %${(yatirimaKatkiOrani * 100).toFixed(0)}`,
          `Toplam Katkı Tutarı: ${toplamKatki.toLocaleString('tr-TR')} TL`,
          `İndirimli KV Oranı: %${(indirimlKvOrani * 100).toFixed(0)}`,
          `Yıllık KV Tasarrufu: ${saving.toLocaleString('tr-TR')} TL`,
        ],
        requirements: [
          'Yatırım teşvik belgesi başvurusu',
          'Asgari sabit yatırım tutarı',
          'Yatırım konusu uygunluğu',
        ],
        warnings: [
          'Teşvik belgesi olmadan yatırıma başlanmamalı',
          'Yatırım süresi ve koşullarına dikkat',
        ],
      };
    },
  },

  {
    id: 'istirak-kazanci',
    name: 'İştirak Kazancı İstisnası',
    description: 'Bağlı ortaklıklardan alınan temettüler %100 istisna',
    category: 'istisna',
    inputLabel: 'Temettü Geliri',
    inputUnit: 'TL',
    defaultValue: 2000000,
    minValue: 0,
    maxValue: 100000000,
    legalBasis: 'KVK Md. 5/1-a',
    difficulty: 'kolay',
    applicableConditions: [
      'En az %10 ortaklık payı',
      'En az 1 yıl elde tutma',
      'Tam mükellef kurumdan temettü',
    ],
    calculate: (temettuGeliri, base) => {
      const istisna = temettuGeliri;
      const currentTax = base.kvMatrahi * TAX_RATES_2025.kv;
      const newMatrah = Math.max(0, base.kvMatrahi - istisna);
      const newTax = newMatrah * TAX_RATES_2025.kv;
      const saving = currentTax - newTax;

      return {
        currentTax,
        newTax,
        saving,
        effectiveRate: newTax / base.kvMatrahi * 100,
        calculations: [
          `Temettü Geliri: ${temettuGeliri.toLocaleString('tr-TR')} TL`,
          `İstisna: %100`,
          `KV Tasarrufu: ${saving.toLocaleString('tr-TR')} TL`,
        ],
        requirements: [
          'İştirak oranı en az %10 olmalı',
          'İştirak en az 1 yıldır elde tutulmalı',
          'Temettü brüt kaydedilip istisna düşülmeli',
        ],
      };
    },
  },

  {
    id: 'sgk-tesvik',
    name: 'SGK İstihdam Teşvikleri',
    description: 'İlave istihdam için SGK prim teşviki',
    category: 'tesvik',
    inputLabel: 'İlave Personel Sayısı',
    inputUnit: 'kişi',
    defaultValue: 5,
    minValue: 0,
    maxValue: 500,
    legalBasis: '7103 SK, 6111 SK',
    difficulty: 'orta',
    applicableConditions: [
      'İlave istihdam yaratılmalı',
      'Personel kayıtları düzenli tutulmalı',
      'E-Bildirge sistemiyle uyumlu',
    ],
    calculate: (ilavePersonel, base) => {
      // Varsayım: Ortalama brüt maaş 35.000 TL
      const ortalamaButMaas = 35000;
      const aylikTesvik = ilavePersonel * ortalamaButMaas * 0.0575; // %5.75 işveren payı teşviki
      const yillikTesvik = aylikTesvik * 12;

      return {
        currentTax: base.kvMatrahi * TAX_RATES_2025.kv,
        newTax: base.kvMatrahi * TAX_RATES_2025.kv,
        saving: yillikTesvik,
        effectiveRate: TAX_RATES_2025.kv * 100,
        calculations: [
          `İlave Personel: ${ilavePersonel} kişi`,
          `Varsayılan Brüt Maaş: ${ortalamaButMaas.toLocaleString('tr-TR')} TL`,
          `Aylık SGK Teşviki: ${aylikTesvik.toLocaleString('tr-TR')} TL`,
          `Yıllık Toplam Teşvik: ${yillikTesvik.toLocaleString('tr-TR')} TL`,
        ],
        requirements: [
          'İşe giriş bildirgeleri zamanında verilmeli',
          'Teşvik şartları her ay kontrol edilmeli',
          'SGK borcu bulunmamalı',
        ],
        warnings: [
          'Teşvik süreleri sınırlı (genellikle 12 ay)',
          'Bazı teşvikler birlikte kullanılamaz',
        ],
      };
    },
  },
];

