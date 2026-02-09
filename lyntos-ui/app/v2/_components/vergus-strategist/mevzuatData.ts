/**
 * Mevzuat Referans Verileri
 * Sprint 9.1 - LYNTOS V2 Big 4 Enhancement
 *
 * Types, constants, and database for legal references
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type MevzuatTipi = 'VUK' | 'GVK' | 'KVK' | 'KDVK' | 'TTK' | 'SGK' | 'TEBLIG' | 'OZELGE' | 'SIRKULER';

export interface YasalDayanak {
  id: string;
  kanun: MevzuatTipi;
  maddeNo: string;
  baslik: string;
  ozet: string;
  tamMetin?: string;
  resmiGazeteTarihi?: string;
  resmiGazeteNo?: string;
  guncellemeTarihi?: string;
  onemliNotlar?: string[];
  uygulamaOrnekleri?: string[];
  iliskiliMaddeler?: string[];
  ozelgeler?: OzelgeRef[];
}

export interface OzelgeRef {
  no: string;
  tarih: string;
  konu: string;
  ozet: string;
  link?: string;
}

// ── Colors ─────────────────────────────────────────────────────────────────

export const MEVZUAT_COLORS: Record<MevzuatTipi, { bg: string; text: string; border: string }> = {
  VUK: { bg: 'bg-[#E6F9FF]', text: 'text-[#0049AA]', border: 'border-[#ABEBFF]' },
  GVK: { bg: 'bg-[#ECFDF5]', text: 'text-[#00804D]', border: 'border-[#AAE8B8]' },
  KVK: { bg: 'bg-[#E6F9FF]', text: 'text-[#0049AA]', border: 'border-[#ABEBFF]' },
  KDVK: { bg: 'bg-[#FFFBEB]', text: 'text-[#FA841E]', border: 'border-[#FFF08C]' },
  TTK: { bg: 'bg-[#F5F6F8]', text: 'text-[#5A5A5A]', border: 'border-[#E5E5E5]' },
  SGK: { bg: 'bg-[#FEF2F2]', text: 'text-[#BF192B]', border: 'border-[#FFC7C9]' },
  TEBLIG: { bg: 'bg-[#E6F9FF]', text: 'text-[#0049AA]', border: 'border-[#ABEBFF]' },
  OZELGE: { bg: 'bg-[#FFFBEB]', text: 'text-[#FA841E]', border: 'border-[#FFF08C]' },
  SIRKULER: { bg: 'bg-[#E6F9FF]', text: 'text-[#0049AA]', border: 'border-[#ABEBFF]' },
};

// ── Database ───────────────────────────────────────────────────────────────

export const MEVZUAT_DATABASE: Record<string, YasalDayanak> = {
  // Kurumlar Vergisi İstisnaları
  'KVK-5/1-e': {
    id: 'KVK-5/1-e',
    kanun: 'KVK',
    maddeNo: '5/1-e',
    baslik: 'İhracat ve Yurt Dışı İnşaat Kazanç İstisnası',
    ozet: 'İhracat hasılatının %5\'i, yurt dışı inşaat işlerinden elde edilen kazançların %50\'si kurumlar vergisinden istisnadır.',
    resmiGazeteTarihi: '2024-12-28',
    guncellemeTarihi: '2024-12-28',
    onemliNotlar: [
      '2024 yılı ve sonrası için %5 istisna (ihracat)',
      'Yurt dışı inşaat işleri için %50 istisna',
      'İstisna beyanname üzerinde ayrıca gösterilmeli',
    ],
    uygulamaOrnekleri: [
      '10.000.000 TL ihracat hasılatı → 500.000 TL istisna',
      'Yurt dışı inşaat karı 2.000.000 TL → 1.000.000 TL istisna',
    ],
    ozelgeler: [
      {
        no: '2024-01-GİB-4100',
        tarih: '2024-03-15',
        konu: 'İhracat İstisnası Uygulama Esasları',
        ozet: 'Döviz kazandırıcı faaliyetlerin ihracat istisnası kapsamında değerlendirilmesi',
      },
    ],
  },

  'KVK-5/1-a': {
    id: 'KVK-5/1-a',
    kanun: 'KVK',
    maddeNo: '5/1-a',
    baslik: 'İştirak Kazançları İstisnası',
    ozet: 'Tam mükellef kurumlardan elde edilen iştirak kazançları %100 istisnadır.',
    onemliNotlar: [
      'En az %10 ortaklık payı gerekli',
      'En az 1 yıl elde tutma şartı',
      'Kar payı brüt olarak kaydedilip istisna düşülmeli',
    ],
    uygulamaOrnekleri: [
      'A şirketinin B şirketindeki %15 hissesinden 500.000 TL temettü → Tamamı istisna',
    ],
  },

  'KVK-10': {
    id: 'KVK-10',
    kanun: 'KVK',
    maddeNo: '10',
    baslik: 'Diğer İndirimler - Ar-Ge ve Tasarım',
    ozet: 'Ar-Ge ve tasarım harcamalarının %100\'ü ilave indirim olarak kazançtan düşülebilir.',
    guncellemeTarihi: '2025-01-01',
    onemliNotlar: [
      '5746 sayılı Kanun kapsamında Ar-Ge merkezi olunmalı',
      'Ar-Ge personeli ücretlerinde %95 gelir vergisi teşviki',
      '2025 yılında %100 ilave indirim devam ediyor',
      'Sigorta primi işveren payında %50 teşvik',
    ],
    uygulamaOrnekleri: [
      'Ar-Ge harcaması 1.000.000 TL → 1.000.000 TL ilave indirim',
      'KV oranı %25 ile → 250.000 TL vergi avantajı',
    ],
    ozelgeler: [
      {
        no: '2024-11-GİB-5746',
        tarih: '2024-11-20',
        konu: 'Ar-Ge Merkezi Personel Teşviki',
        ozet: 'Ar-Ge merkezinde çalışan mühendislerin ücret teşviki uygulaması',
      },
    ],
  },

  // Teknokent İstisnası
  '4691-Geç-2': {
    id: '4691-Geç-2',
    kanun: 'KVK',
    maddeNo: '4691 Geç.2',
    baslik: 'Teknokent Yazılım Kazanç İstisnası',
    ozet: 'Teknoloji Geliştirme Bölgelerinde yazılım ve Ar-Ge faaliyetlerinden elde edilen kazançlar 31.12.2028 tarihine kadar kurumlar vergisinden istisnadır.',
    resmiGazeteTarihi: '2024-07-15',
    guncellemeTarihi: '2024-12-31',
    onemliNotlar: [
      'İstisna süresi 31.12.2028\'e kadar uzatıldı',
      'Yazılım geliştirme ve Ar-Ge gelirleri kapsam dahilinde',
      'Bölge dışı faaliyetler için %50 istisnadan yararlanılamaz',
      'Ar-Ge personeli en az 15 kişi olmalı (küçük ölçekli için 5 kişi)',
    ],
    uygulamaOrnekleri: [
      'Teknokentte yazılım satışından 5.000.000 TL kar → Tamamı istisna',
      'KV oranı %25 ile → 1.250.000 TL vergi tasarrufu',
    ],
    ozelgeler: [
      {
        no: '2024-09-TGB-001',
        tarih: '2024-09-10',
        konu: 'Teknokent Dışı Çalışma Esasları',
        ozet: 'Pandemi sonrası %50 bölge dışı çalışma hakkının kullanımı',
      },
    ],
  },

  // Yatırım Teşvikleri
  'KVK-32/A': {
    id: 'KVK-32/A',
    kanun: 'KVK',
    maddeNo: '32/A',
    baslik: 'Yatırım Teşvik Belgesi İndirimi',
    ozet: 'Yatırım teşvik belgesi kapsamında yapılan yatırımlar için indirimli kurumlar vergisi uygulanır.',
    guncellemeTarihi: '2025-01-01',
    onemliNotlar: [
      '2025 yılı için 6. bölge: %0 kurumlar vergisi',
      '5. bölge: %5, 4. bölge: %10 oranları geçerli',
      'Yatırım tamamlanana kadar %100 vergi indirimi',
      'Yatırıma katkı oranı bölgeye göre %15-%55 arası',
    ],
    uygulamaOrnekleri: [
      '6. bölgede 10M TL yatırım → KV oranı %0',
      '5. bölgede 5M TL yatırım → KV oranı %5',
    ],
  },

  // SGK Teşvikleri
  '5510-81': {
    id: '5510-81',
    kanun: 'SGK',
    maddeNo: '5510/81',
    baslik: 'İşveren Prim Teşvikleri',
    ozet: 'Çeşitli SGK teşvikleri ile işveren sigorta prim yükü azaltılabilir.',
    guncellemeTarihi: '2025-01-01',
    onemliNotlar: [
      '6111 teşviki: 18-29 yaş arası işe alımlarda 12 ay teşvik',
      '7103 teşviki: İlave istihdam için 12 ay prim desteği',
      'Kadın ve genç istihdamında ek teşvikler',
      'Engelli istihdamında %100 prim indirimi',
    ],
    uygulamaOrnekleri: [
      '25 yaşında yeni işe alınan çalışan → 12 ay %6 işveren payı',
      'Engelli çalışan → Tüm işveren payı Hazine tarafından karşılanır',
    ],
  },

  // VUK Enflasyon Düzeltmesi
  'VUK-Mükerrer 298': {
    id: 'VUK-Mükerrer-298',
    kanun: 'VUK',
    maddeNo: 'Mükerrer 298',
    baslik: 'Enflasyon Düzeltmesi',
    ozet: 'Enflasyon düzeltmesi kapsamında parasal olmayan kıymetler yeniden değerlenir.',
    guncellemeTarihi: '2025-01-01',
    onemliNotlar: [
      '2025 yılı için enflasyon düzeltmesi ZORUNLU',
      'Yİ-ÜFE endeksi kullanılacak',
      'Düzeltme farkları vergi matrahını ETKİLEMEZ (2025 için)',
      'Son beyan tarihi: 30.04.2026',
    ],
    uygulamaOrnekleri: [
      '2020\'de alınan 1.000.000 TL bina → 2025 düzeltilmiş değer ~3.500.000 TL',
      'Düzeltme farkı 2.500.000 TL → Özkaynak artışı (vergisiz)',
    ],
  },

  // Örtülü Sermaye
  'KVK-12': {
    id: 'KVK-12',
    kanun: 'KVK',
    maddeNo: '12',
    baslik: 'Örtülü Sermaye',
    ozet: 'Ortaklardan alınan borçların öz sermayenin 3 katını aşan kısmı örtülü sermaye sayılır ve faizi gider yazılamaz.',
    onemliNotlar: [
      'Borç/Özkaynak oranı > 3:1 ise örtülü sermaye',
      'Örtülü sermaye faizi KKEG',
      'Kar dağıtımı sayılır → Stopaj gerekebilir',
      'İlişkili kişi tanımı geniş yorumlanır',
    ],
    uygulamaOrnekleri: [
      'Özkaynak 1.000.000 TL, Ortaktan borç 5.000.000 TL',
      '3.000.000 TL\'ye kadar normal → 2.000.000 TL örtülü sermaye',
      '2.000.000 TL faizi KKEG olarak dikkate alınmalı',
    ],
    ozelgeler: [
      {
        no: '2024-05-GİB-KVK-12',
        tarih: '2024-05-20',
        konu: 'Örtülü Sermaye Faiz Hesaplaması',
        ozet: 'Dönem içi ortalama borç tutarı üzerinden hesaplama yöntemi',
      },
    ],
  },

  // Transfer Fiyatlandırması
  'KVK-13': {
    id: 'KVK-13',
    kanun: 'KVK',
    maddeNo: '13',
    baslik: 'Transfer Fiyatlandırması',
    ozet: 'İlişkili kişilerle yapılan işlemlerde emsallere uygunluk ilkesine uyulmalıdır.',
    onemliNotlar: [
      'Yıllık transfer fiyatlandırması raporu zorunlu (belirli hadler üstü)',
      'Peşin fiyatlandırma anlaşması (APA) yapılabilir',
      'Emsallere aykırı fiyat → Örtülü kazanç dağıtımı',
      'Ceza: %100 vergi ziyaı + gecikme faizi',
    ],
    uygulamaOrnekleri: [
      'Grup şirketine piyasa fiyatının altında mal satışı → Örtülü kazanç',
      'Yurt dışı ilişkili şirkete lisans ödemesi → Belgeleme gerekli',
    ],
  },
};

// ── Strategy Mapping ───────────────────────────────────────────────────────

export const STRATEGY_TO_MEVZUAT: Record<string, string[]> = {
  'ihracat-istisnasi': ['KVK-5/1-e'],
  'istirak-kazanci': ['KVK-5/1-a'],
  'arge-indirimi': ['KVK-10'],
  'teknokent-istisnasi': ['4691-Geç-2'],
  'yatirim-tesviki': ['KVK-32/A'],
  'sgk-tesvikleri': ['5510-81'],
  'enflasyon-duzeltmesi': ['VUK-Mükerrer-298'],
  'ortulu-sermaye': ['KVK-12'],
  'transfer-fiyatlandirmasi': ['KVK-13'],
};
