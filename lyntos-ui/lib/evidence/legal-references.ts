/**
 * Mevzuat Referansları
 *
 * VDK kuralları, KURGAN senaryoları ve RAM pattern'leri için
 * yasal dayanak referansları.
 *
 * Kaynak:
 * - Vergi Usul Kanunu (VUK)
 * - Gelir Vergisi Kanunu (GVK)
 * - Kurumlar Vergisi Kanunu (KVK)
 * - Katma Değer Vergisi Kanunu (KDVK)
 * - İlgili Tebliğler
 */

// Mevzuat tipi
export type MevzuatTipi =
  | 'VUK'
  | 'GVK'
  | 'KVK'
  | 'KDVK'
  | 'TTK'
  | 'SGK'
  | 'TEBLIG'
  | 'GENEL_YAZI'
  | 'OZELGE';

// Mevzuat maddesi
export interface MevzuatMaddesi {
  id: string;
  kanun: MevzuatTipi;
  maddeNo: string;
  baslik: string;
  ozet: string;
  tamMetin?: string;
  ilgiliKKodlari?: string[];
  ilgiliKurganSenaryolari?: string[];
  ilgiliRamPatternleri?: string[];
  guncellemeTarihi?: string;
  notlar?: string;
}

// Mevzuat kategorisi
export interface MevzuatKategorisi {
  id: string;
  ad: string;
  kanun: MevzuatTipi;
  maddeler: string[];
}

/**
 * VERGİ USUL KANUNU (VUK) MADDELERİ
 */
export const VUK_MADDELERI: Record<string, MevzuatMaddesi> = {
  'VUK-3': {
    id: 'VUK-3',
    kanun: 'VUK',
    maddeNo: '3',
    baslik: 'Vergi Kanunlarının Uygulanması ve İspat',
    ozet: 'Vergilendirmede vergiyi doğuran olay ve bu olaya ilişkin muamelelerin gerçek mahiyeti esastır. İktisadi, ticari ve teknik icaplara uymayan veya olayın özelliğine göre normal ve mutad olmayan bir durumun iddia olunması halinde ispat külfeti bunu iddia eden tarafa aittir.',
    ilgiliKKodlari: ['K-25', 'K-26', 'K-27'],
    ilgiliKurganSenaryolari: ['KRG-01', 'KRG-03'],
    notlar:
      'KURGAN sisteminin temel dayanağı. İşlemlerin gerçek mahiyeti önemli.',
  },

  'VUK-134': {
    id: 'VUK-134',
    kanun: 'VUK',
    maddeNo: '134',
    baslik: 'Vergi İncelemesinden Maksat',
    ozet: 'Vergi incelemesinden maksat, ödenmesi gereken vergilerin doğruluğunu araştırmak, tespit etmek ve sağlamaktır.',
    ilgiliKKodlari: ['K-01', 'K-07', 'K-10'],
    notlar: 'VDK inceleme yetkisinin dayanağı.',
  },

  'VUK-171': {
    id: 'VUK-171',
    kanun: 'VUK',
    maddeNo: '171',
    baslik: 'Defter Tutma Mecburiyeti',
    ozet: 'Mükellefler bu kanuna göre tutulması mecburi defterleri vergi uygulaması bakımından tutarlar.',
    ilgiliRamPatternleri: ['RAM-M01', 'RAM-M02'],
    notlar: 'Dönem sonu kayıtları ve bilanço denkliği kontrolünün dayanağı.',
  },

  'VUK-175': {
    id: 'VUK-175',
    kanun: 'VUK',
    maddeNo: '175',
    baslik: 'Bilanço Esasında Tutulacak Defterler',
    ozet: 'Bilanço esasına göre defter tutan mükellefler, yevmiye defteri, defteri kebir ve envanter defteri tutmak zorundadırlar.',
    ilgiliKKodlari: ['K-23'],
    ilgiliRamPatternleri: ['RAM-D02'],
    notlar: 'E-defter zorunluluğunun yasal dayanağı.',
  },

  'VUK-176': {
    id: 'VUK-176',
    kanun: 'VUK',
    maddeNo: '176',
    baslik: 'İşletme Hesabı Esasında Tutulacak Defterler',
    ozet: 'İşletme hesabı esasına göre defter tutanlar, işletme hesabı defteri tutarlar.',
    ilgiliRamPatternleri: ['RAM-S01'],
  },

  'VUK-177': {
    id: 'VUK-177',
    kanun: 'VUK',
    maddeNo: '177',
    baslik: 'Bilanço Esasına Göre Defter Tutma Hadleri',
    ozet: 'Aşağıda yazılı tüccarlar I inci sınıf tüccar sayılır ve bilanço esasına göre defter tutarlar. Hadlerin aşılması halinde izleyen yıldan itibaren bilanço esasına geçilir.',
    ilgiliRamPatternleri: ['RAM-S01'],
    notlar: '2024 yılı için hadler yeniden değerleme oranıyla güncellenir.',
  },

  'VUK-186': {
    id: 'VUK-186',
    kanun: 'VUK',
    maddeNo: '186',
    baslik: 'Envanter Çıkarmak',
    ozet: 'Envanter çıkarmak, bilanço günündeki mevcutları, alacakları ve borçları saymak, ölçmek, tartmak ve değerlemek suretiyle kesin bir şekilde ve müfredatlı olarak tespit etmektir.',
    ilgiliKKodlari: ['K-10'],
    ilgiliKurganSenaryolari: ['KRG-04'],
    notlar: 'Stok-satış uyumsuzluğu kontrolünün dayanağı.',
  },

  'VUK-219': {
    id: 'VUK-219',
    kanun: 'VUK',
    maddeNo: '219',
    baslik: 'Defterlerin Tasdiki',
    ozet: 'Tutulması mecburi olan defterler, ertesi yılda kullanılmak üzere en geç Aralık ayı içinde notere tasdik ettirilir.',
    ilgiliKKodlari: ['K-02', 'K-03', 'K-23'],
    ilgiliRamPatternleri: ['RAM-M01'],
    notlar: 'Kayıt düzeni ve dönem sonu işlemlerinin kontrolü.',
  },

  'VUK-227': {
    id: 'VUK-227',
    kanun: 'VUK',
    maddeNo: '227',
    baslik: 'Belge Düzeni - Tevsik Edici Belgeler',
    ozet: 'Bu kanunda aksine hüküm olmadıkça, bu kanuna göre tutulan ve üçüncü şahıslarla olan münasebet ve muamelelere ait olan kayıtların tevsiki mecburidir.',
    ilgiliKKodlari: ['K-26'],
    ilgiliKurganSenaryolari: ['KRG-14'],
    ilgiliRamPatternleri: ['RAM-D03'],
    notlar: 'Komisyon faturası ve hizmet belgelerinin kontrolü.',
  },

  'VUK-230': {
    id: 'VUK-230',
    kanun: 'VUK',
    maddeNo: '230',
    baslik: 'Faturanın Şekli',
    ozet: 'Fatura, satılan emtia veya yapılan iş karşılığında müşterinin borçlandığı meblağı göstermek üzere emtiayı satan veya işi yapan tüccar tarafından müşteriye verilen ticari vesikadır.',
    ilgiliKurganSenaryolari: ['KRG-05'],
    notlar: 'Sevk irsaliyesi kontrolünün dayanağı.',
  },

  'VUK-232': {
    id: 'VUK-232',
    kanun: 'VUK',
    maddeNo: '232',
    baslik: 'Fatura Kullanma Mecburiyeti',
    ozet: 'Birinci ve ikinci sınıf tüccarlar kazancı basit usulde tespit edilenlerle defter tutmak mecburiyetinde olan çiftçiler, sattıkları emtia veya yaptıkları işler için fatura vermek ve aldıkları emtia veya hizmetler için de fatura istemek ve almak mecburiyetindedirler.',
    ilgiliKKodlari: ['K-08'],
    ilgiliKurganSenaryolari: ['KRG-06'],
    ilgiliRamPatternleri: ['RAM-S02'],
    notlar: 'E-fatura zorunluluğu ve ödeme kontrolü.',
  },

  'VUK-234': {
    id: 'VUK-234',
    kanun: 'VUK',
    maddeNo: '234',
    baslik: 'Gider Pusulası',
    ozet: 'Birinci ve ikinci sınıf tüccarlar, kazancı basit usulde tespit edilenlerle defter tutmak mecburiyetinde olan serbest meslek erbabının ve çiftçilerin vergiden muaf esnafa yaptırdıkları işler veya onlardan satın aldıkları emtia için gider pusulası verirler.',
    ilgiliKKodlari: ['K-08'],
    notlar: 'Kayıt dışı ödemelerin kontrolü.',
  },

  'VUK-256': {
    id: 'VUK-256',
    kanun: 'VUK',
    maddeNo: '256',
    baslik: 'Defter ve Belgelerle Diğer Kayıtların Muhafazası ve İbrazı',
    ozet: 'Bu kanuna göre defter tutmak mecburiyetinde olanlar, tuttukları defterleri, düzenledikleri vesikları ve elektronik kayıtları ilgili bulundukları yılı takip eden yıldan başlamak üzere beş yıl süreyle muhafaza etmeye mecburdurlar.',
    ilgiliKKodlari: ['K-22'],
    ilgiliRamPatternleri: ['RAM-D01'],
  },

  'VUK-257': {
    id: 'VUK-257',
    kanun: 'VUK',
    maddeNo: '257 Mük.',
    baslik: 'Yetkili Makamların Kontrol Yetkisi',
    ozet: 'Maliye Bakanlığı, mükellef ve mükellef olmayan gerçek ve tüzel kişilerden bilgi almaya; mükellefler ve vergi sorumluları adına, bildirimler almaya yetkilidir.',
    ilgiliKKodlari: ['K-10', 'K-22'],
    ilgiliKurganSenaryolari: ['KRG-04'],
    notlar: 'Ba-Bs bildirimi ve stok sayımı kontrolü.',
  },

  'VUK-267': {
    id: 'VUK-267',
    kanun: 'VUK',
    maddeNo: '267',
    baslik: 'Emsal Bedeli ve Emsal Ücreti',
    ozet: 'Emsal bedeli, gerçek bedeli olmayan veya bilinmeyen veyahut doğru olarak tespit edilemeyen bir malın, değerleme gününde satılması halinde emsaline nazaran haiz olacağı değerdir.',
    ilgiliKKodlari: ['K-10', 'K-17'],
    notlar: 'Stok değerlemesi ve gayrimenkul satış bedeli kontrolü.',
  },

  'VUK-274': {
    id: 'VUK-274',
    kanun: 'VUK',
    maddeNo: '274',
    baslik: 'Maliyet Bedeli',
    ozet: 'Emtianın maliyet bedeline nazaran değerleme günündeki satış bedeli %10 ve daha fazla bir düşüklük gösterdiği takdirde mükellef maliyet bedeli yerine emsal bedelini uygulamak yetkisine haizdir.',
    ilgiliKKodlari: ['K-11'],
    ilgiliRamPatternleri: ['RAM-M07'],
    notlar: 'Stok değer düşüklüğü ve değerleme yöntemi kontrolü.',
  },

  'VUK-281': {
    id: 'VUK-281',
    kanun: 'VUK',
    maddeNo: '281',
    baslik: 'Alacaklar',
    ozet: 'Alacaklar mukayyet değerleri ile değerlenir. Mevduat veya kredi sözleşmelerine müstenit alacaklar değerleme gününe kadar hesaplanacak faizleriyle birlikte dikkate alınır. Vadesi gelmemiş olan senede bağlı alacaklar değerleme gününün kıymetine irca olunabilir.',
    ilgiliRamPatternleri: ['RAM-M05'],
    notlar: 'Reeskont hesaplamasının dayanağı.',
  },

  'VUK-285': {
    id: 'VUK-285',
    kanun: 'VUK',
    maddeNo: '285',
    baslik: 'Borçlar',
    ozet: 'Borçlar mukayyet değerleri ile değerlenir. Vadesi gelmemiş olan senede bağlı borçlar değerleme gününün kıymetine irca olunabilir.',
    ilgiliRamPatternleri: ['RAM-M05'],
    notlar: 'Borç senetleri reeskont hesaplaması.',
  },

  'VUK-315': {
    id: 'VUK-315',
    kanun: 'VUK',
    maddeNo: '315',
    baslik: 'Amortisman Oranları',
    ozet: 'Mükellefler amortismana tabi iktisadi kıymetlerini Maliye Bakanlığının tespit ve ilan edeceği oranlar üzerinden itfa ederler.',
    ilgiliKKodlari: ['K-16', 'K-18'],
    ilgiliRamPatternleri: ['RAM-M03'],
    notlar: 'Amortisman oranı ve birikmiş amortisman kontrolü.',
  },

  'VUK-323': {
    id: 'VUK-323',
    kanun: 'VUK',
    maddeNo: '323',
    baslik: 'Şüpheli Alacaklar',
    ozet: 'Ticari ve zirai kazancın elde edilmesi ve idame ettirilmesi ile ilgili olmak şartıyla, dava veya icra safhasında bulunan alacaklar ile yapılan protestoya veya yazı ile bir defadan fazla istenilmesine rağmen borçlu tarafından ödenmemiş bulunan dava ve icra takibine değmeyecek derecede küçük alacaklar şüpheli alacak sayılır.',
    ilgiliKKodlari: ['K-13', 'K-14'],
    ilgiliRamPatternleri: ['RAM-M06'],
    notlar: 'Şüpheli alacak karşılığı ayırma koşulları.',
  },

  'VUK-341': {
    id: 'VUK-341',
    kanun: 'VUK',
    maddeNo: '341',
    baslik: 'Vergi Ziyaı',
    ozet: 'Vergi ziyaı, mükellefin veya sorumlunun vergilendirme ile ilgili ödevlerini zamanında yerine getirmemesi veya eksik yerine getirmesi yüzünden verginin zamanında tahakkuk ettirilmemesini veya eksik tahakkuk ettirilmesini ifade eder.',
    ilgiliKKodlari: ['K-09'],
    ilgiliKurganSenaryolari: ['KRG-10'],
    notlar: 'KDV beyan-fatura uyumsuzluğu yaptırımı.',
  },

  'VUK-344': {
    id: 'VUK-344',
    kanun: 'VUK',
    maddeNo: '344',
    baslik: 'Vergi Ziyaı Cezası',
    ozet: 'Vergi ziyaına sebebiyet verildiği takdirde, mükellef veya sorumlu hakkında ziyaa uğratılan verginin bir katı tutarında vergi ziyaı cezası kesilir.',
    ilgiliKKodlari: ['K-09', 'K-22'],
    ilgiliKurganSenaryolari: ['KRG-10'],
    notlar: '1 kat vergi ziyaı cezası uygulanır.',
  },

  'VUK-359': {
    id: 'VUK-359',
    kanun: 'VUK',
    maddeNo: '359',
    baslik: 'Kaçakçılık Suçları ve Cezaları',
    ozet: 'Vergi kanunlarına göre tutulan veya düzenlenen ve saklanma ve ibraz mecburiyeti bulunan defterlere ve kayıtlara kaydedilmesi gereken hesap ve işlemleri vergi matrahının azalması sonucunu doğuracak şekilde tamamen veya kısmen başka defter, belge veya diğer kayıt ortamlarına kaydeden, defterleri ve belgeleri sahte olarak düzenleyen veya bu belgeleri kullananlar hakkında on sekiz aydan beş yıla kadar hapis cezasına hükmolunur.',
    ilgiliKKodlari: ['K-25', 'K-26', 'K-27'],
    ilgiliKurganSenaryolari: [
      'KRG-01',
      'KRG-03',
      'KRG-04',
      'KRG-05',
      'KRG-06',
      'KRG-07',
      'KRG-14',
    ],
    notlar:
      'SAHTE BELGE: 3-8 yıl hapis cezası. KURGAN sonrası "bilmiyordum" savunması zor.',
  },

  'VUK-370': {
    id: 'VUK-370',
    kanun: 'VUK',
    maddeNo: '370',
    baslik: 'İzaha Davet',
    ozet: 'Vergi incelemesine başlanılmadan veya takdir komisyonuna sevk edilmeden önce verginin ziyaa uğramış olabileceğine ilişkin emareler bulunduğuna dair yetkili merciler tarafından yapılmış ön tespitler hakkında tespit tarihine kadar ihbarda bulunulmamış olması kaydıyla, mükellefler izaha davet edilebilir.',
    ilgiliKKodlari: ['K-25'],
    ilgiliKurganSenaryolari: [
      'KRG-01',
      'KRG-03',
      'KRG-04',
      'KRG-07',
      'KRG-10',
      'KRG-14',
    ],
    notlar:
      'KURGAN izaha davet mekanizmasının dayanağı. 30 gün içinde izahat verilmeli.',
  },

  'VUK-371': {
    id: 'VUK-371',
    kanun: 'VUK',
    maddeNo: '371',
    baslik: 'Pişmanlık ve Islah',
    ozet: 'Beyana dayanan vergilerde vergi ziyaı cezasını gerektiren fiilleri işleyen mükelleflerle bunların işlenişine iştirak eden diğer kişilerin kanuna aykırı hareketlerini ilgili makamlara kendiliğinden dilekçe ile haber vermesi hâlinde, vergi ziyaı cezası kesilmez.',
    notlar: 'KURGAN tespiti öncesinde pişmanlık başvurusu mümkün.',
  },
};

/**
 * GELİR VERGİSİ KANUNU (GVK) MADDELERİ
 */
export const GVK_MADDELERI: Record<string, MevzuatMaddesi> = {
  'GVK-40': {
    id: 'GVK-40',
    kanun: 'GVK',
    maddeNo: '40',
    baslik: 'İndirilecek Giderler',
    ozet: 'Safi kazancın tespit edilmesi için, aşağıdaki giderlerin indirilmesi kabul edilir: Ticari kazancın elde edilmesi ve idame ettirilmesi için yapılan genel giderler.',
    ilgiliKKodlari: ['K-19', 'K-21'],
    ilgiliRamPatternleri: ['RAM-V02', 'RAM-V04', 'RAM-V05'],
    notlar: 'KKEG kontrolünün temel dayanağı.',
  },

  'GVK-41': {
    id: 'GVK-41',
    kanun: 'GVK',
    maddeNo: '41',
    baslik: 'Gider Kabul Edilmeyen Ödemeler',
    ozet: 'Teşebbüs sahibinin kendisine, eşine, küçük çocuklarına yapılan ödemeler ile işletmeye konulan sermaye üzerinden yürütülen faizler; her türlü para ve vergi cezaları ile gecikme zamları; vergi usul kanunu hükümlerine göre ödenen gecikme faizleri gider olarak kabul edilmez.',
    ilgiliRamPatternleri: ['RAM-V04', 'RAM-V05'],
    notlar: 'Vergi cezaları ve MTV KKEG sayılır.',
  },

  'GVK-89': {
    id: 'GVK-89',
    kanun: 'GVK',
    maddeNo: '89',
    baslik: 'Diğer İndirimler',
    ozet: 'Gelir vergisi matrahının tespitinde, gelir vergisi beyannamesinde bildirilecek gelirlerden bazı indirimler yapılabilir: Bağış ve yardımlar.',
    ilgiliKKodlari: ['K-19'],
    ilgiliRamPatternleri: ['RAM-B03'],
    notlar: 'Bağış indirimi işleminin dayanağı.',
  },

  'GVK-94': {
    id: 'GVK-94',
    kanun: 'GVK',
    maddeNo: '94',
    baslik: 'Vergi Tevkifatı',
    ozet: 'Kamu idare ve müesseseleri, iktisadi kamu müesseseleri, sair kurumlar, ticaret şirketleri, iş ortaklıkları, dernekler, vakıflar, dernek ve vakıfların iktisadi işletmeleri, kooperatifler, yatırım fonu yönetenler ile gerçek gelirlerini beyan etmeye mecbur olan ticaret ve serbest meslek erbabı istihkak sahiplerine ödedikleri aşağıda belirtilen gelirlerden tevkifat yapmakla yükümlüdürler.',
    ilgiliKKodlari: ['K-01'],
    notlar: 'Örtülü kazanç dağıtımı stopaj yükümlülüğü.',
  },

  'GVK-Muk80': {
    id: 'GVK-Muk80',
    kanun: 'GVK',
    maddeNo: 'Mük. 80',
    baslik: 'Değer Artışı Kazançları',
    ozet: 'İvazsız olarak iktisap edilenler hariç, beş yıldan fazla bir süre elde tutulan mal ve hakların satışından doğan kazançlar değer artışı kazancı olarak vergilendirilir.',
    ilgiliKKodlari: ['K-17'],
    notlar: 'Gayrimenkul satış bedeli kontrolünde kullanılır.',
  },

  'GVK-Muk120': {
    id: 'GVK-Muk120',
    kanun: 'GVK',
    maddeNo: 'Mük. 120',
    baslik: 'Geçici Vergi',
    ozet: 'Ticari kazanç sahipleri ile serbest meslek erbabı cari vergilendirme döneminin gelir vergisine mahsup edilmek üzere, bu Kanunun ticari veya mesleki kazancın tespitine ilişkin hükümlerine göre geçici vergi öderler.',
    ilgiliKKodlari: ['K-24'],
    ilgiliRamPatternleri: ['RAM-B02'],
    notlar: 'Geçici vergi - yıllık vergi matrah farkı kontrolü.',
  },
};

/**
 * KURUMLAR VERGİSİ KANUNU (KVK) MADDELERİ
 */
export const KVK_MADDELERI: Record<string, MevzuatMaddesi> = {
  'KVK-5-1a': {
    id: 'KVK-5-1a',
    kanun: 'KVK',
    maddeNo: '5/1-a',
    baslik: 'İştirak Kazançları İstisnası',
    ozet: 'Tam mükellefiyete tabi başka bir kurumun sermayesine %10 veya daha fazla oranda iştirak edilmesinden elde edilen kazançlar kurumlar vergisinden istisnadır.',
    ilgiliRamPatternleri: ['RAM-B04'],
    notlar: 'İştirak kazancı istisnası şartları: %10+ iştirak, 1+ yıl elde tutma.',
  },

  'KVK-6': {
    id: 'KVK-6',
    kanun: 'KVK',
    maddeNo: '6',
    baslik: 'Safi Kurum Kazancı',
    ozet: 'Kurumlar vergisi, mükelleflerin bir hesap dönemi içinde elde ettikleri safî kurum kazancı üzerinden hesaplanır. Safî kurum kazancının tespitinde Gelir Vergisi Kanununun ticarî kazanç hakkındaki hükümleri uygulanır.',
    ilgiliKKodlari: ['K-07', 'K-12'],
    ilgiliKurganSenaryolari: ['KRG-08', 'KRG-13'],
    ilgiliRamPatternleri: ['RAM-B01'],
    notlar: 'KV beyannamesi ticari bilanço karı hesaplaması.',
  },

  'KVK-8': {
    id: 'KVK-8',
    kanun: 'KVK',
    maddeNo: '8',
    baslik: 'İndirilecek Giderler',
    ozet: 'Ticarî kazanç gibi hesaplanan kurum kazancının tespitinde, Gelir Vergisi Kanununda yer alan giderler indirilir.',
    ilgiliRamPatternleri: ['RAM-V02', 'RAM-V03', 'RAM-V06'],
    notlar: 'SGK primi, kıdem tazminatı, binek oto amortisman kontrolleri.',
  },

  'KVK-10': {
    id: 'KVK-10',
    kanun: 'KVK',
    maddeNo: '10',
    baslik: 'Diğer İndirimler',
    ozet: 'Kurumlar vergisi matrahının tespitinde; kurumlar vergisi beyannamesi üzerinde ayrıca gösterilmek şartıyla, kurum kazancından bazı indirimler yapılır.',
    ilgiliKKodlari: ['K-19'],
    ilgiliRamPatternleri: ['RAM-B03'],
    notlar: 'Bağış ve yardım indirimi kontrolü.',
  },

  'KVK-11': {
    id: 'KVK-11',
    kanun: 'KVK',
    maddeNo: '11',
    baslik: 'Kabul Edilmeyen İndirimler',
    ozet: 'Kurum kazancının tespitinde bazı giderler indirilemez: Öz sermaye üzerinden ödenen veya hesaplanan faizler, örtülü sermaye üzerinden ödenen veya hesaplanan faiz vb.',
    ilgiliRamPatternleri: ['RAM-V04', 'RAM-V05'],
    notlar: 'MTV ve gecikme zammı KKEG kontrolü.',
  },

  'KVK-12': {
    id: 'KVK-12',
    kanun: 'KVK',
    maddeNo: '12',
    baslik: 'Örtülü Sermaye',
    ozet: 'Kurumların, ortaklarından veya ortaklarla ilişkili olan kişilerden doğrudan veya dolaylı olarak temin ederek işletmede kullandıkları borçların, hesap dönemi içinde herhangi bir tarihte kurumun öz sermayesinin üç katını aşan kısmı, ilgili hesap dönemi için örtülü sermaye sayılır.',
    ilgiliKKodlari: ['K-04', 'K-05'],
    ilgiliKurganSenaryolari: ['KRG-07'],
    notlar: 'Örtülü sermaye sınırı: Borç/Özkaynak > 3:1. Faiz gider yazılamaz.',
  },

  'KVK-13': {
    id: 'KVK-13',
    kanun: 'KVK',
    maddeNo: '13',
    baslik: 'Transfer Fiyatlandırması Yoluyla Örtülü Kazanç Dağıtımı',
    ozet: 'Kurumlar, ilişkili kişilerle emsallere uygunluk ilkesine aykırı olarak tespit ettikleri bedel veya fiyat üzerinden mal veya hizmet alım ya da satımında bulunursa, kazanç tamamen veya kısmen transfer fiyatlandırması yoluyla örtülü olarak dağıtılmış sayılır.',
    ilgiliKKodlari: ['K-01', 'K-04', 'K-05', 'K-06'],
    ilgiliKurganSenaryolari: ['KRG-07', 'KRG-14'],
    notlar:
      'İlişkili kişi işlemleri emsallere uygun olmalı. Transfer fiyatlandırması raporu.',
  },

  'KVK-32': {
    id: 'KVK-32',
    kanun: 'KVK',
    maddeNo: '32',
    baslik: 'Kurumlar Vergisi Oranı ve Geçici Vergi',
    ozet: 'Kurumlar vergisi, kurum kazancı üzerinden %20 oranında alınır. Kurumlar vergisi mükellefleri de geçici vergi öder.',
    ilgiliKKodlari: ['K-24'],
    ilgiliRamPatternleri: ['RAM-B02'],
    notlar: 'Geçici vergi matrahı kontrolü.',
  },
};

/**
 * KATMA DEĞER VERGİSİ KANUNU (KDVK) MADDELERİ
 */
export const KDVK_MADDELERI: Record<string, MevzuatMaddesi> = {
  'KDVK-29': {
    id: 'KDVK-29',
    kanun: 'KDVK',
    maddeNo: '29',
    baslik: 'Vergi İndirimi',
    ozet: 'Mükellefler, yaptıkları vergiye tabi işlemler üzerinden hesaplanan katma değer vergisinden, bu Kanunda aksine hüküm olmadıkça, faaliyetlerine ilişkin olarak yüklendikleri katma değer vergisini indirebilirler.',
    ilgiliKKodlari: ['K-09'],
    ilgiliKurganSenaryolari: ['KRG-10', 'KRG-12'],
    notlar: 'KDV beyanı - e-fatura uyumu kontrolü.',
  },

  'KDVK-30': {
    id: 'KDVK-30',
    kanun: 'KDVK',
    maddeNo: '30',
    baslik: 'İndirilemeyecek Katma Değer Vergisi',
    ozet: 'Aşağıdaki vergiler mükellefin vergiye tabi işlemleri üzerinden hesaplanan katma değer vergisinden indirilemez: b) Faaliyetleri kısmen veya tamamen binek otomobillerinin kiralanması veya çeşitli şekillerde işletilmesi olanların bu amaçla kullandıkları hariç olmak üzere işletmelere ait binek otomobillerinin alış vesikalarında gösterilen katma değer vergisi.',
    ilgiliKKodlari: ['K-20'],
    ilgiliRamPatternleri: ['RAM-V01'],
    notlar: 'Binek oto KDV indirimi yasağı.',
  },

  'KDVK-32': {
    id: 'KDVK-32',
    kanun: 'KDVK',
    maddeNo: '32',
    baslik: 'İstisna Edilmiş İşlemlerde İndirim',
    ozet: 'Bu Kanunun 11, 13, 14 ve 15 inci maddeleri ile 17 nci maddenin (4) numaralı fıkrasının (s) bendi uyarınca vergiden istisna edilmiş bulunan işlemlerle ilgili fatura ve benzeri vesikalarda gösterilen katma değer vergisi, mükellefin vergiye tabi işlemleri üzerinden hesaplanacak katma değer vergisinden indirilir.',
    ilgiliKurganSenaryolari: ['KRG-11'],
    notlar: 'KDV iade taleplerinin dayanağı.',
  },

  'KDVK-36': {
    id: 'KDVK-36',
    kanun: 'KDVK',
    maddeNo: '36',
    baslik: 'Fazla veya Yersiz Ödenen Verginin İadesi',
    ozet: 'Fazla veya yersiz ödenen vergiler, verginin fazla veya yersiz ödendiğinin anlaşıldığı tarihten itibaren genel hükümler çerçevesinde iade edilir.',
    ilgiliKurganSenaryolari: ['KRG-12'],
    notlar: 'Devreden KDV kontrolü.',
  },
};

/**
 * TÜM MEVZUAT MADDELERİNİ BİRLEŞTİR
 */
export const TUM_MEVZUAT: Record<string, MevzuatMaddesi> = {
  ...VUK_MADDELERI,
  ...GVK_MADDELERI,
  ...KVK_MADDELERI,
  ...KDVK_MADDELERI,
};

// K-Kodu'na göre ilgili mevzuatı getir
export const getMevzuatByKKodu = (kKodu: string): MevzuatMaddesi[] => {
  return Object.values(TUM_MEVZUAT).filter((m) =>
    m.ilgiliKKodlari?.includes(kKodu)
  );
};

// KURGAN senaryosuna göre ilgili mevzuatı getir
export const getMevzuatByKurganSenaryo = (
  senaryoId: string
): MevzuatMaddesi[] => {
  return Object.values(TUM_MEVZUAT).filter((m) =>
    m.ilgiliKurganSenaryolari?.includes(senaryoId)
  );
};

// RAM pattern'ine göre ilgili mevzuatı getir
export const getMevzuatByRamPattern = (patternId: string): MevzuatMaddesi[] => {
  return Object.values(TUM_MEVZUAT).filter((m) =>
    m.ilgiliRamPatternleri?.includes(patternId)
  );
};

// Mevzuat istatistikleri
export const MEVZUAT_ISTATISTIK = {
  toplamMadde: Object.keys(TUM_MEVZUAT).length,
  kanunlar: {
    VUK: Object.keys(VUK_MADDELERI).length,
    GVK: Object.keys(GVK_MADDELERI).length,
    KVK: Object.keys(KVK_MADDELERI).length,
    KDVK: Object.keys(KDVK_MADDELERI).length,
  },
};
