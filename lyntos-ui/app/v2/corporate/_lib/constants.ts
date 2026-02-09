/**
 * LYNTOS Şirketler Hukuku Sabitleri
 * 2026 güncel vergi ve harç oranları + işlem türleri + sektör teşvikleri
 * Faz 1 - Vergi Avantajı Odaklı Dönüşüm
 */

import type { SirketIslemi, SektorTesviki, TicaretSicilBilgi } from '../_types/corporate';

// =============================================================================
// 2026 GÜNCEL VERGİ VE HARÇ ORANLARI
// =============================================================================

export const GUNCEL_ORANLAR_2026 = {
  damgaVergisi: {
    anaSozlesme: 0.00948,
    genelKurul: 0.00948,
    sermayeArtirimi: 0.00948,
    birlesme: 0.00948,
  },
  ticaretSicilHarci: {
    tesciHarci: 2_750,
    ilanHarci: 1_850,
    belgeHarci: 550,
  },
  noterHarclari: {
    imzaTasdik: 350,
    suretHarci: 75,
  },
  minimumSermaye: {
    as: 250_000,
    as_kayitli: 500_000,
    ltd: 50_000,
  },
};

// =============================================================================
// ŞİRKET İŞLEM TÜRLERİ (Vergi Avantajı Odaklı)
// =============================================================================

export const SIRKET_ISLEMLERI: SirketIslemi[] = [
  {
    id: 'kurulus-as',
    kod: 'KUR-01',
    ad: 'A.Ş. Kuruluşu',
    aciklama: 'Anonim şirket kuruluş işlemleri (tek/çok ortaklı)',
    sirketTuru: ['A.Ş.'],
    gerekliEvraklar: [
      'Ana sözleşme (noterde tasdik)',
      'Kurucu beyanı',
      'Pay taahhütnamesi',
      'Banka bloke yazısı (%25 sermaye)',
      'İmza beyannamesi',
      'Kurucuların kimlik fotokopisi',
      'İkametgah belgesi',
      'Potansiyel vergi numarası',
    ],
    ttkMadde: 'TTK 335-353',
    damgaVergisiOrani: 0.00948,
    tahminiSure: '5-10 iş günü',
    zorlukDerecesi: 3,
    notlar: ['Tek kişi ile kurulabilir', 'Kayıtlı sermaye sistemini tercih edebilir'],
    onemliHususlar: ['Asgari sermaye 250.000 TL', 'Sermayenin %25\'i peşin bloke'],
    kategori: 'kurulus',
    vergiAvantaji: 'KVK md.32/A kapsamında yatırım teşvik belgeli kuruluşlarda indirimli KV uygulanır. Teknoloji geliştirme bölgelerinde kurulan A.Ş.\'lerde KV muafiyeti mevcuttur.',
    enAzVergiYolu: 'Yatırım teşvik belgesi alınarak kuruluş yapılması halinde indirimli kurumlar vergisi oranı (%0-%20 arası) uygulanır. Teknopark/OSB\'de kuruluş değerlendirilmeli.',
    kvkIstisna: 'KVK md.32/A - Teşvik belgeli yatırımlarda indirimli KV. Teknokent KV muafiyeti (2028 sonuna kadar).',
    kdvIstisna: 'KDVK md.13/d - Yatırım teşvik belgesi kapsamında makine-teçhizat alımlarında KDV istisnası.',
  },
  {
    id: 'kurulus-ltd',
    kod: 'KUR-02',
    ad: 'Ltd. Şti. Kuruluşu',
    aciklama: 'Limited şirket kuruluş işlemleri',
    sirketTuru: ['Ltd.Şti.'],
    gerekliEvraklar: [
      'Ana sözleşme',
      'Ortak imza beyannamesi',
      'Müdür atama kararı',
      'Kimlik fotokopileri',
      'İkametgah belgesi',
    ],
    ttkMadde: 'TTK 573-644',
    damgaVergisiOrani: 0.00948,
    tahminiSure: '3-7 iş günü',
    zorlukDerecesi: 2,
    notlar: ['En fazla 50 ortak', 'Pay defteri tutulması zorunlu'],
    onemliHususlar: ['Asgari sermaye 50.000 TL', 'Tüm sermaye başlangıçta taahhüt'],
    kategori: 'kurulus',
    vergiAvantaji: 'Kuruluş maliyeti A.Ş.\'ye göre düşüktür. KVK md.32/A teşvikleri Ltd. için de geçerlidir.',
    enAzVergiYolu: 'Başlangıçta Ltd. olarak kurulup, büyüme aşamasında A.Ş.\'ye tür değiştirme yapılması vergi açısından avantajlıdır. Tür değiştirmede KVK md.19-20 istisnaları uygulanır.',
    kvkIstisna: 'KVK md.32/A - Teşvik belgeli yatırımlarda indirimli KV oranı uygulanır.',
    kdvIstisna: 'KDVK md.13/d - Yatırım teşvik belgesi kapsamındaki alımlarda KDV istisnası.',
  },
  {
    id: 'sermaye-artirimi',
    kod: 'SER-01',
    ad: 'Sermaye Artırımı',
    aciklama: 'Nakit veya ayni sermaye artırımı',
    sirketTuru: ['A.Ş.', 'Ltd.Şti.'],
    gerekliEvraklar: [
      'Genel kurul kararı',
      'Yeni sermaye taahhütnamesi',
      'Banka bloke yazısı (%25)',
      'Ana sözleşme tadil metni',
    ],
    ttkMadde: 'TTK 456-472',
    damgaVergisiOrani: 0.00948,
    tahminiSure: '10-15 iş günü',
    zorlukDerecesi: 3,
    notlar: ['İç kaynaklardan artırım mümkün', 'Primli artırım yapılabilir'],
    onemliHususlar: ['2026 asgari sermaye uyumu', 'Önceki sermaye tamamen ödenmiş olmalı'],
    kategori: 'sermaye',
    vergiAvantaji: 'İç kaynaklardan (yeniden değerleme fonu, geçmiş yıl kârları) yapılan sermaye artırımında nakit çıkışı yoktur. KVK md.5/1-ç kapsamında fonların sermayeye eklenmesi vergisizdir.',
    enAzVergiYolu: 'Öncelikle iç kaynaklardan (yeniden değerleme fonu, olağanüstü yedekler) artırım yapılmalı. Nakit artırımda KVK md.10/1-ı nakdi sermaye artırımı faiz indirimi (%50 TCMB faiz oranı) uygulanır.',
    kvkIstisna: 'KVK md.10/1-ı - Nakdi sermaye artırımında faiz indirimi (artırılan sermaye x TCMB faizi x %50). KVK md.5/1-ç - Fonların sermayeye eklenmesinde istisna.',
    kdvIstisna: 'Ayni sermaye konulması halinde KDV uygulanır, ancak KDVK md.17/4-c kapsamında devir niteliğinde ise istisna söz konusu olabilir.',
  },
  {
    id: 'birlesme',
    kod: 'BIR-01',
    ad: 'Birleşme',
    aciklama: 'Şirket birleşme işlemleri (devralma/yeni kuruluş)',
    sirketTuru: ['A.Ş.', 'Ltd.Şti.', 'Koop.'],
    gerekliEvraklar: [
      'Birleşme sözleşmesi',
      'Birleşme raporu',
      'Son 3 yıl bilançosu',
      'Uzman değerleme raporu',
      'Genel kurul kararları',
    ],
    ttkMadde: 'TTK 136-158',
    damgaVergisiOrani: 0.00948,
    tahminiSure: '2-4 ay',
    zorlukDerecesi: 5,
    notlar: ['Küçük ölçekli birleşmede kolaylaştırılmış prosedür', 'Vergi avantajları mümkün'],
    onemliHususlar: ['Değerleme raporu YMM\'den', 'KVK devir vergisizliği şartları'],
    kategori: 'yapisal',
    vergiAvantaji: 'KVK md.19-20 kapsamında "devir" şartları sağlanırsa birleşme vergisiz gerçekleşir. Devrolan şirketin zararları 5 yıl süreyle devralan şirkette kullanılabilir.',
    enAzVergiYolu: 'Devralma şeklinde birleşme tercih edilmeli. KVK md.19 şartları: (1) Bilanço değerleriyle devir, (2) Devralan şirket paylarının ortaklara verilmesi. Böylece kurumlar vergisi, KDV ve damga vergisi istisnası uygulanır.',
    kvkIstisna: 'KVK md.19-20 - Devir şartları sağlanırsa KV doğmaz. Devrolan şirketin geçmiş yıl zararları devralan şirkette 5 yıl mahsup edilebilir.',
    kdvIstisna: 'KDVK md.17/4-c - Birleşme, devir ve bölünme işlemlerinde KDV istisnası uygulanır. Damga vergisi istisnası da mevcuttur.',
  },
  {
    id: 'tur-degisimi',
    kod: 'TUR-01',
    ad: 'Tür Değiştirme',
    aciklama: 'Şirket türü değişikliği (Ltd.→A.Ş. veya A.Ş.→Ltd.)',
    sirketTuru: ['A.Ş.', 'Ltd.Şti.'],
    gerekliEvraklar: [
      'Tür değiştirme planı',
      'Tür değiştirme raporu',
      'Yeni türe göre ana sözleşme',
      'Bilanço',
      'Değerleme raporu',
    ],
    ttkMadde: 'TTK 180-190',
    damgaVergisiOrani: 0.00948,
    tahminiSure: '1-2 ay',
    zorlukDerecesi: 4,
    notlar: ['Ortaklık yapısı korunur', 'Şirket mevcudiyeti kesintisiz'],
    onemliHususlar: ['Ltd.Şti.→A.Ş. için 250.000 TL sermaye', 'Ortaklık oranları değişmemeli'],
    kategori: 'yapisal',
    vergiAvantaji: 'KVK md.19/2 kapsamında tür değiştirme "devir" hükmündedir ve vergisiz gerçekleştirilebilir. Şirketin hukuki devamlılığı korunduğundan taşınmaz/iştirak hissesi satışı gerekmez.',
    enAzVergiYolu: 'Tür değiştirme KVK md.19/2 gereği "devir" hükmünde olduğundan, bilanço değerleri aynen devredilmeli. Yeniden değerleme yapılmamalı, aksi halde vergi doğar.',
    kvkIstisna: 'KVK md.19/2 - Tür değiştirme devir hükmünde, kurumlar vergisi doğmaz. Bilanço değerleri aynen devredilmelidir.',
    kdvIstisna: 'KDVK md.17/4-c - Tür değiştirme işlemlerinde KDV istisnası uygulanır.',
  },
  {
    id: 'hisse-devri-ltd',
    kod: 'DEV-01',
    ad: 'Ltd. Şti. Hisse Devri',
    aciklama: 'Limited şirket hisse devir işlemleri',
    sirketTuru: ['Ltd.Şti.'],
    gerekliEvraklar: [
      'Hisse devir sözleşmesi (noterde)',
      'Ortaklar kurulu onay kararı',
      'Pay defteri güncelleme',
    ],
    ttkMadde: 'TTK 595',
    damgaVergisiOrani: 0.00948,
    tahminiSure: '1-2 hafta',
    zorlukDerecesi: 2,
    notlar: ['Noter huzurunda yazılı şekil şartı', 'Pay defterine işleme zorunlu'],
    onemliHususlar: ['Değer artış kazancı vergisi', 'Şirket borçlarından sorumluluk 5 yıl'],
    kategori: 'devir',
    vergiAvantaji: 'KVK md.5/1-e kapsamında 2 yıldan fazla elde tutulan iştirak hisselerinin satışında %75 istisna uygulanır (A.Ş. ortağı kurumlar için). Gerçek kişiler için GVK md.80 - 2 yıl elde tutma süresinden sonra değer artış kazancı vergisi yoktur.',
    enAzVergiYolu: 'İştirak hissesi 2 yıldan fazla elde tutulduysa satışta %75 KV istisnası uygulanır. Gerçek kişi ortaklar açısından 2 yıl bekleme süresi sonrası devir vergi avantajı sağlar. Devir bedeli emsal bedelin altında belirlenirse transfer fiyatlandırması riski doğar.',
    kvkIstisna: 'KVK md.5/1-e - 2 yıl+ elde tutulan iştirak hissesi satışında %75 istisna. Satış bedelinin 2 yıl özel fon hesabında tutulması şartı.',
    kdvIstisna: 'KDVK md.17/4-r - İştirak hisselerinin tesliminde KDV istisnası (2 yıl+ elde tutma şartı ile).',
  },
  {
    id: 'tasfiye',
    kod: 'TAS-01',
    ad: 'Tasfiye',
    aciklama: 'Şirket tasfiye işlemleri (başlama/sona erme)',
    sirketTuru: ['A.Ş.', 'Ltd.Şti.', 'Koop.'],
    gerekliEvraklar: [
      'Tasfiye genel kurul kararı',
      'Tasfiye memuru atama kararı',
      'Tasfiye başlangıç bilançosu',
      'Alacaklılara davet ilanları',
    ],
    ttkMadde: 'TTK 533-548',
    damgaVergisiOrani: 0,
    tahminiSure: '6-12 ay',
    zorlukDerecesi: 4,
    notlar: ['1 yıl alacaklı bekleme süresi', 'Tasfiye memuru şirketi temsil'],
    onemliHususlar: ['Vergi dairesi kapatma', 'Personel kıdem tazminatları'],
    kategori: 'tasfiye',
    vergiAvantaji: 'Tasfiye döneminde KVK md.17 uyarınca vergi tasfiye kârı üzerinden hesaplanır. Tasfiye başlangıç/bitiş bilançosu farkı üzerinden vergileme yapılır. Zarar varsa KV doğmaz.',
    enAzVergiYolu: 'Tasfiye öncesi taşınmaz/iştirak satışlarında KVK md.5/1-e istisnası kullanılabilir. Kıdem tazminatı karşılıkları gider yazılabilir. Tasfiye süresince vergi planlaması yapılmalı.',
    kvkIstisna: 'KVK md.17 - Tasfiye döneminin tespiti ve vergileme. KVK md.5/1-e - Taşınmaz/iştirak satışında %75 istisna tasfiye döneminde de geçerlidir.',
    kdvIstisna: 'KDVK md.17/4-r - 2 yıl+ elde tutulan taşınmaz ve iştirak hissesi satışında KDV istisnası tasfiye döneminde de uygulanır.',
  },
];

// =============================================================================
// SEKTÖR TEŞVİKLERİ (2026 Güncel)
// =============================================================================

export const SEKTOR_TESVIKLERI: SektorTesviki[] = [
  {
    id: 'arge',
    sektor: 'Ar-Ge ve Tasarım',
    tesvik: 'Ar-Ge İndirimi',
    avantaj: 'Ar-Ge harcamalarının %100\'ü kurum kazancından indirilebilir. Personel ücretlerinde gelir vergisi stopajı desteği (%80-%95).',
    kvOrani: '%100 indirim + stopaj desteği',
    kosullar: [
      'Ar-Ge merkezi belgesi (en az 15 tam zamanlı Ar-Ge personeli)',
      'TÜBİTAK onaylı proje',
      'Ar-Ge faaliyetlerinin ayrı muhasebeleştirilmesi',
    ],
    yasalDayanak: '5746 sayılı Ar-Ge Kanunu, KVK md.10',
    naceKodlari: ['72', '62', '63', '26'],
    sektorAnahtarKelimeleri: ['ar-ge', 'araştırma', 'geliştirme', 'tasarım', 'inovasyon', 'r&d'],
  },
  {
    id: 'teknopark',
    sektor: 'Teknoloji Geliştirme Bölgeleri',
    tesvik: 'Teknokent KV Muafiyeti',
    avantaj: 'Yazılım, tasarım ve Ar-Ge gelirlerinde kurumlar vergisi muafiyeti (2028 sonuna kadar). KDV istisnası.',
    kvOrani: '%0 KV (muafiyet)',
    kosullar: [
      'Teknoloji geliştirme bölgesinde faaliyet',
      'Yazılım/Ar-Ge/tasarım faaliyeti',
      'Muafiyet 31.12.2028\'e kadar geçerli',
    ],
    yasalDayanak: '4691 sayılı Teknoloji Geliştirme Bölgeleri Kanunu',
    naceKodlari: ['62', '63', '58', '61'],
    sektorAnahtarKelimeleri: ['yazılım', 'teknoloji', 'bilişim', 'it', 'software', 'teknopark', 'teknokent'],
  },
  {
    id: 'osb',
    sektor: 'Organize Sanayi Bölgeleri',
    tesvik: 'OSB Teşvikleri',
    avantaj: 'Emlak vergisi muafiyeti (5 yıl), bina inşaat harcı istisnası, atık su bedeli indirimi.',
    kvOrani: 'Yatırım teşvik belgesine göre indirimli KV',
    kosullar: [
      'OSB\'de arsa tahsisi/satın alma',
      'Üretim faaliyeti yürütme',
      'OSB yönetmeliğine uyum',
    ],
    yasalDayanak: '4562 sayılı OSB Kanunu, KVK md.32/A',
    naceKodlari: ['10', '11', '13', '14', '15', '16', '17', '20', '22', '23', '24', '25', '27', '28', '29', '30', '31', '32'],
    sektorAnahtarKelimeleri: ['imalat', 'üretim', 'fabrika', 'sanayi', 'osb', 'manufacturing'],
  },
  {
    id: 'yatirim-tesvik',
    sektor: 'Yatırım Teşvik Belgeli İşletmeler',
    tesvik: 'Yatırım Teşvik Sistemi',
    avantaj: 'İndirimli KV (%0-%20), KDV istisnası, gümrük muafiyeti, SGK prim desteği, faiz desteği.',
    kvOrani: 'Bölgeye göre %0-%20 indirimli KV',
    kosullar: [
      'Yatırım teşvik belgesi alınması',
      'Asgari yatırım tutarı şartı (bölgeye göre değişir)',
      'Yatırım süresi içinde tamamlanma',
    ],
    yasalDayanak: '2012/3305 sayılı BKK, KVK md.32/A',
    sektorAnahtarKelimeleri: ['yatırım', 'teşvik', 'investment'],
  },
  {
    id: 'ihracat',
    sektor: 'İhracat',
    tesvik: 'İhracat Teşvikleri',
    avantaj: 'İhracat gelirlerinin %50\'si KV beyannamesinde indirim (imalatçı ihracatçılar). Dahilde işleme rejimi kapsamında KDV/ÖTV ertelemesi.',
    kvOrani: '%50 indirim (imalatçı ihracatçı)',
    kosullar: [
      'İhracat taahhüdünün yerine getirilmesi',
      'Dahilde işleme izin belgesi',
      'Fiili ihracatın gerçekleştirilmesi',
    ],
    yasalDayanak: 'KVK md.32/A, 3218 sayılı Serbest Bölgeler Kanunu',
    naceKodlari: ['46', '47'],
    sektorAnahtarKelimeleri: ['ihracat', 'dış ticaret', 'export', 'ithalat', 'gümrük'],
  },
  {
    id: 'tarim',
    sektor: 'Tarım ve Hayvancılık',
    tesvik: 'Tarımsal Teşvikler',
    avantaj: 'Tarımsal faaliyetlerden elde edilen kazançlarda indirimli vergi. Çiftçi belgesi ile KDV avantajları.',
    kvOrani: 'GVK md.94 - %2-%4 stopaj',
    kosullar: [
      'Tarımsal faaliyet belgesi',
      'Çiftçi kayıt sistemi kaydı',
      'Hayvancılık/bitkisel üretim yapılması',
    ],
    yasalDayanak: 'GVK md.52-53, KDVK md.1/3-c, 5488 sayılı Tarım Kanunu',
    naceKodlari: ['01', '02', '03'],
    sektorAnahtarKelimeleri: ['tarım', 'hayvancılık', 'çiftçi', 'bitkisel', 'ziraat', 'agriculture'],
  },
];

// =============================================================================
// TİCARET SİCİLİ BİLGİLERİ (2026 Güncel Harçlar)
// =============================================================================

export const TICARET_SICILI_HARCLARI: TicaretSicilBilgi[] = [
  {
    islemTuru: 'A.Ş. Kuruluş Tescili',
    tesciHarci: 2_750,
    ilanHarci: 1_850,
    noterMasrafi: 3_500,
    ttsgZorunlu: true,
    gerekliEvraklar: ['Ana sözleşme', 'İmza beyannamesi', 'Banka dekontu', 'Kurucu beyanı'],
  },
  {
    islemTuru: 'Ltd. Şti. Kuruluş Tescili',
    tesciHarci: 2_750,
    ilanHarci: 1_850,
    noterMasrafi: 2_000,
    ttsgZorunlu: true,
    gerekliEvraklar: ['Ana sözleşme', 'İmza beyannamesi', 'Müdür atama kararı'],
  },
  {
    islemTuru: 'Sermaye Artırımı Tescili',
    tesciHarci: 2_750,
    ilanHarci: 1_850,
    noterMasrafi: 1_500,
    ttsgZorunlu: true,
    gerekliEvraklar: ['GK kararı', 'Ana sözleşme tadil metni', 'Banka dekontu'],
  },
  {
    islemTuru: 'Adres Değişikliği',
    tesciHarci: 2_750,
    ilanHarci: 1_850,
    noterMasrafi: 500,
    ttsgZorunlu: true,
    gerekliEvraklar: ['GK/Ortaklar kurulu kararı', 'Yeni adres belgesi'],
  },
  {
    islemTuru: 'Yönetim Kurulu / Müdür Değişikliği',
    tesciHarci: 2_750,
    ilanHarci: 1_850,
    noterMasrafi: 1_200,
    ttsgZorunlu: true,
    gerekliEvraklar: ['GK/Ortaklar kurulu kararı', 'İmza beyannamesi', 'Kimlik fotokopisi'],
  },
  {
    islemTuru: 'Şube Açılışı',
    tesciHarci: 2_750,
    ilanHarci: 1_850,
    noterMasrafi: 1_500,
    ttsgZorunlu: true,
    gerekliEvraklar: ['GK kararı', 'Şube temsilci atama', 'İmza beyannamesi'],
  },
  {
    islemTuru: 'Tasfiye Başlangıcı',
    tesciHarci: 2_750,
    ilanHarci: 1_850,
    noterMasrafi: 1_000,
    ttsgZorunlu: true,
    gerekliEvraklar: ['GK kararı', 'Tasfiye memuru atama', 'Tasfiye başlangıç bilançosu'],
  },
];

// =============================================================================
// ASGARİ SERMAYE TAMAMLAMA TAKVİMİ
// =============================================================================

export const ASGARI_SERMAYE_TAKVIMI = {
  sonTarih: '31.12.2026',
  as: {
    eskiAsgarı: 50_000,
    yeniAsgari: 250_000,
    kayitliSermaye: 500_000,
    aciklama: 'Anonim şirketlerin asgari sermayesi 250.000 TL\'ye yükseltilmiştir. Kayıtlı sermaye sistemine geçmek isteyen şirketler için başlangıç sermayesi 500.000 TL olmalıdır.',
  },
  ltd: {
    eskiAsgarı: 10_000,
    yeniAsgari: 50_000,
    aciklama: 'Limited şirketlerin asgari sermayesi 50.000 TL\'ye yükseltilmiştir.',
  },
  uyarilar: [
    'Mevcut şirketler 31.12.2026\'ya kadar sermayelerini yeni asgari tutarlara yükseltmelidir.',
    'Süresinde artırım yapılmazsa şirket infisah etmiş (sona ermiş) sayılır.',
    'Sermaye artırımında KVK md.10/1-ı nakdi sermaye faiz indirimi uygulanabilir.',
    'İç kaynaklardan (yedek akçe, geçmiş yıl kârları) artırım mümkündür.',
  ],
};
