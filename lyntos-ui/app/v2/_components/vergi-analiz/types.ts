// ════════════════════════════════════════════════════════════════════════════
// GEÇİCİ VERGİ 12 KRİTİK KONTROL + KURUMLAR VERGİSİ 20 KRİTİK KONTROL
// Kaynak: Burhan Can - Vergi Uzmanı, Bilirkişi, Konkordato Komiseri
// ════════════════════════════════════════════════════════════════════════════

export type GeciciVergiKontrolId =
  | 'GV-01' | 'GV-02' | 'GV-03' | 'GV-04' | 'GV-05' | 'GV-06'
  | 'GV-07' | 'GV-08' | 'GV-09' | 'GV-10' | 'GV-11' | 'GV-12';

export type KurumlarVergisiKontrolId =
  | 'KV-01' | 'KV-02' | 'KV-03' | 'KV-04' | 'KV-05'
  | 'KV-06' | 'KV-07' | 'KV-08' | 'KV-09' | 'KV-10'
  | 'KV-11' | 'KV-12' | 'KV-13' | 'KV-14' | 'KV-15'
  | 'KV-16' | 'KV-17' | 'KV-18' | 'KV-19' | 'KV-20';

export type KontrolDurumu =
  | 'tamamlandi'      // Kontrol yapildi, sorun yok
  | 'bekliyor'        // Henuz kontrol edilmedi
  | 'uyari'           // Dikkat gerektiriyor
  | 'hata'            // Sorun var, duzeltilmeli
  | 'uygulanamaz';    // Bu mukellef icin gecerli degil

export type RiskSeviyesi = 'dusuk' | 'orta' | 'yuksek' | 'kritik';
export type KontrolTipi = 'risk' | 'avantaj' | 'zorunlu';

export interface YasalDayanak {
  kanun: string;
  madde: string;
  aciklama: string;
}

export interface GeciciVergiKontrol {
  id: GeciciVergiKontrolId;
  sira: number;
  baslik: string;
  aciklama: string;
  detayliAciklama: string;
  kontrolNoktasi: string[];
  veriKaynagi: string[];
  hesaplamaFormulu?: string;
  riskSeviyesi: RiskSeviyesi;
  vdkBaglantisi?: string[];
  yasalDayanak: YasalDayanak[];
  oneriler: string[];
  uyarilar: string[];
}

export interface KurumlarVergisiKontrol {
  id: KurumlarVergisiKontrolId;
  sira: number;
  baslik: string;
  aciklama: string;
  detayliAciklama: string;
  kontrolNoktasi: string[];
  veriKaynagi: string[];
  hesaplamaFormulu?: string;
  kontrolTipi: KontrolTipi;
  riskSeviyesi: RiskSeviyesi;
  vdkBaglantisi?: string[];
  yasalDayanak: YasalDayanak[];
  oneriler: string[];
  uyarilar: string[];
  potansiyelTasarruf?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// GEÇİCİ VERGİ 12 KRİTİK KONTROL
// ════════════════════════════════════════════════════════════════════════════

export const GECICI_VERGI_KONTROLLER: GeciciVergiKontrol[] = [
  {
    id: 'GV-01',
    sira: 1,
    baslik: 'Banka & Faiz Tahakkuklari',
    aciklama: 'Donem sonu faiz gelir/gider tahakkuklari',
    detayliAciklama: 'Vadeli mevduat faiz gelirleri ve kredi faiz giderleri donem sonunda tahakkuk ettirilmelidir.',
    kontrolNoktasi: [
      'Vadeli mevduat hesaplari faiz tahakkuku',
      'Kredi faiz gider tahakkuku',
      'Finansal kiralama faiz ayristirmasi',
      'Repo/ters repo faiz tahakkuku',
    ],
    veriKaynagi: ['banka_ekstresi', 'mizan_ayrintili'],
    riskSeviyesi: 'orta',
    vdkBaglantisi: ['K-04'],
    yasalDayanak: [
      { kanun: 'VUK', madde: '281-285', aciklama: 'Alacak/borc degerlemesi' },
    ],
    oneriler: [
      'Tum vadeli mevduatlarin islemis faizini hesaplayin',
      'Kredi geri odeme tablosundan donem faizini ayirin',
    ],
    uyarilar: [
      'Tahakkuk yapilmazsa vergi matrahi hatali hesaplanir',
    ],
  },
  {
    id: 'GV-02',
    sira: 2,
    baslik: 'Kur Degerlemeleri (VUK 280)',
    aciklama: 'Dovizli kalemlerin donem sonu degerlemesi',
    detayliAciklama: 'Yabanci para cinsinden borc, alacak, kasa ve banka hesaplari donem sonu TCMB doviz alis kuruyla degerlenmelidir.',
    kontrolNoktasi: [
      'Dovizli alacaklar (120-127)',
      'Dovizli borclar (320-329)',
      'Doviz kasasi (100)',
      'Doviz banka hesaplari (102)',
    ],
    veriKaynagi: ['mizan_ayrintili'],
    hesaplamaFormulu: 'Kur Farki = (Donem Sonu Kur - Kayit Kuru) x Doviz Tutari',
    riskSeviyesi: 'yuksek',
    yasalDayanak: [
      { kanun: 'VUK', madde: '280', aciklama: 'Yabanci paralar degerlemesi' },
    ],
    oneriler: [
      'TCMB donem sonu doviz alis kurlarini kullanin',
      'Her doviz cinsi icin ayri degerleme yapin',
    ],
    uyarilar: [
      'Kur degerlemesi yapilmazsa matrah ciddi sekilde hatali olur',
    ],
  },
  {
    id: 'GV-03',
    sira: 3,
    baslik: 'Stok & Maliyet (SMM)',
    aciklama: 'Satilan malin maliyeti ve stok degerlemesi',
    detayliAciklama: 'Dönem sonu stok sayımı yapılmalı, SMM doğru hesaplanmalıdır.',
    kontrolNoktasi: [
      'Donem sonu stok sayimi yapildi mi?',
      'Stok degerleme yontemi tutarli mi?',
      'SMM hesabi (620-623) dogru mu?',
      'Fire, zayiat kayitlari tam mi?',
    ],
    veriKaynagi: ['mizan_ayrintili', 'e_fatura_listesi'],
    hesaplamaFormulu: 'SMM = Donem Basi Stok + Alislar - Donem Sonu Stok',
    riskSeviyesi: 'yuksek',
    vdkBaglantisi: ['K-10'],
    yasalDayanak: [
      { kanun: 'VUK', madde: '274-277', aciklama: 'Emtia degerlemesi' },
    ],
    oneriler: [
      'Fiziki stok sayimi yapin veya dogrulayin',
      'Degerleme yontemini yil icinde degistirmeyin',
    ],
    uyarilar: [
      'Stok fazlaligi/eksikligi VDK riski olusturur',
    ],
  },
  {
    id: 'GV-04',
    sira: 4,
    baslik: 'Donemsellik (180/280 Hesaplar)',
    aciklama: 'Gelecek donemlere ait gelir ve giderlerin ayristirilmasi',
    detayliAciklama: 'Pesin odenen giderler ve pesin tahsil edilen gelirler ilgili donemlere paylasitirilmalidir.',
    kontrolNoktasi: [
      '180 Gelecek Aylara Ait Giderler',
      '280 Gelecek Yillara Ait Giderler',
      '380 Gelecek Aylara Ait Gelirler',
      '480 Gelecek Yillara Ait Gelirler',
    ],
    veriKaynagi: ['mizan_ayrintili'],
    riskSeviyesi: 'orta',
    yasalDayanak: [
      { kanun: 'VUK', madde: '283', aciklama: 'Donemsellik ilkesi' },
    ],
    oneriler: [
      'Yillik sigorta policelerini aylara bolun',
      'Pesin odenen kiralari donemlere paylastirin',
    ],
    uyarilar: [
      'Donemsellik hatasi matrahi etkiler',
    ],
  },
  {
    id: 'GV-05',
    sira: 5,
    baslik: 'Amortisman & Binek Otolar',
    aciklama: 'Amortisman hesaplamasi ve binek oto kisitlamasi',
    detayliAciklama: 'Sabit kiymetlerin amortismani hesaplanmali, binek otolarda maliyet ve amortisman kisitlamasi uygulanmalidir.',
    kontrolNoktasi: [
      'Amortisman hesaplandi mi?',
      'Kist amortisman uygulandi mi?',
      'Binek oto maliyet siniri (2024: 1.500.000 TL)',
      'Binek oto amortisman siniri (2024: 500.000 TL)',
    ],
    veriKaynagi: ['mizan_ayrintili'],
    riskSeviyesi: 'orta',
    vdkBaglantisi: ['K-12'],
    yasalDayanak: [
      { kanun: 'GVK', madde: '40/5', aciklama: 'Binek oto gider kisitlamasi' },
      { kanun: 'VUK', madde: '313-321', aciklama: 'Amortisman' },
    ],
    oneriler: [
      'Amortisman tablosunu guncelleyin',
      'Binek oto alimlarini KKEG acisindan kontrol edin',
    ],
    uyarilar: [
      'Binek oto kisitlamasi KKEG olarak beyana eklenmeli',
    ],
  },
  {
    id: 'GV-06',
    sira: 6,
    baslik: 'Supheli Alacaklar',
    aciklama: 'Supheli alacak karsiligi ayrilmasi',
    detayliAciklama: 'Tahsili supheli hale gelen alacaklar icin yasal sartlar saglandiginda karsilik ayrilabilir.',
    kontrolNoktasi: [
      'Dava/icra acilmis alacaklar',
      'Protesto edilmis alacaklar',
      '129 Supheli Alacaklar Karsiligi',
      'Kucuk alacak siniri (2024: 14.000 TL)',
    ],
    veriKaynagi: ['mizan_ayrintili'],
    riskSeviyesi: 'yuksek',
    vdkBaglantisi: ['K-05'],
    yasalDayanak: [
      { kanun: 'VUK', madde: '323', aciklama: 'Supheli alacaklar' },
    ],
    oneriler: [
      'Vadesi gecmis alacaklari listeleyin',
      'Yasal takip baslatilan alacaklari belirleyin',
    ],
    uyarilar: [
      'Sartlar saglanmadan karsilik ayrilmasi KKEG olur',
    ],
  },
  {
    id: 'GV-07',
    sira: 7,
    baslik: 'KDV Mutabakati',
    aciklama: 'KDV beyanlari ile mizan tutarliligi',
    detayliAciklama: 'KDV beyannamelerindeki matrah ve KDV tutarlari mizan kayitlariyla uyumlu olmalidir.',
    kontrolNoktasi: [
      'Beyan edilen KDV matrahi = Satis hasilati?',
      '191 Indirilecek KDV bakiyesi = Beyan?',
      '391 Hesaplanan KDV bakiyesi = Beyan?',
      'Devreden KDV tutarliligi',
    ],
    veriKaynagi: ['mizan_ayrintili', 'beyan_kdv'],
    riskSeviyesi: 'yuksek',
    vdkBaglantisi: ['K-01'],
    yasalDayanak: [
      { kanun: 'KDVK', madde: '29', aciklama: 'Indirim' },
    ],
    oneriler: [
      'Aylik KDV mutabakati yapin',
      'Matrah farki varsa nedenini arastirin',
    ],
    uyarilar: [
      'KDV uyumsuzlugu VDK\'nin 1 numarali inceleme sebebi',
    ],
  },
  {
    id: 'GV-08',
    sira: 8,
    baslik: 'Stopaj & Iadeler',
    aciklama: 'Tevkifat uygulamalari ve iade talepleri',
    detayliAciklama: 'Stopaj (tevkifat) dogru uygulanmali, mahsup/iade haklari zamaninda kullanilmalidir.',
    kontrolNoktasi: [
      'Kira stopaji (GVK Md.94)',
      'Serbest meslek stopaji',
      'Yillara yaygin insaat stopaji',
      'Kurumlar vergisi mahsuplari',
    ],
    veriKaynagi: ['mizan_ayrintili', 'beyan_muhtasar'],
    riskSeviyesi: 'orta',
    yasalDayanak: [
      { kanun: 'GVK', madde: '94', aciklama: 'Vergi tevkifati' },
      { kanun: 'KVK', madde: '15', aciklama: 'Vergi kesintisi' },
    ],
    oneriler: [
      'Kesilen stopajlari takip edin',
      'Mahsup hakkinizi kullanin',
    ],
    uyarilar: [
      'Stopaj eksikligi cezali tarhiyata yol acar',
    ],
  },
  {
    id: 'GV-09',
    sira: 9,
    baslik: 'KKEG Kontrolu',
    aciklama: 'Kanunen Kabul Edilmeyen Giderler',
    detayliAciklama: 'Vergi matrahindan indirilemeyen giderler beyannamede matraha eklenmelidir.',
    kontrolNoktasi: [
      'Ortulu sermaye faizi',
      'Transfer fiyatlandirmasi farklari',
      'Binek oto kisitlamasi',
      'Kidem tazminati karsiliklari',
      'Belgesiz giderler',
      'Finansman gider kisitlamasi',
    ],
    veriKaynagi: ['mizan_ayrintili'],
    riskSeviyesi: 'yuksek',
    yasalDayanak: [
      { kanun: 'GVK', madde: '41', aciklama: 'Gider kabul edilmeyen odemeler' },
      { kanun: 'KVK', madde: '11', aciklama: 'Kabul edilmeyen indirimler' },
    ],
    oneriler: [
      'KKEG listesi olusturun',
      'Her kalem icin yasal dayanak belirleyin',
    ],
    uyarilar: [
      'KKEG eksik beyani vergi ziyai cezasi gerektirir',
    ],
  },
  {
    id: 'GV-10',
    sira: 10,
    baslik: 'Gecmis Yil Zararlari',
    aciklama: 'Mahsup edilebilir zarar kontrolu',
    detayliAciklama: 'Gecmis 5 yilin zararlari ilgili donem karindan mahsup edilebilir.',
    kontrolNoktasi: [
      'Mahsup edilecek zarar tutari',
      '5 yillik sure kontrolu',
      'Zarar yillari ve tutarlari',
      '580 Gecmis Yil Zararlari hesabi',
    ],
    veriKaynagi: ['mizan_ayrintili'],
    riskSeviyesi: 'orta',
    yasalDayanak: [
      { kanun: 'KVK', madde: '9', aciklama: 'Zarar mahsubu' },
    ],
    oneriler: [
      'Gecmis beyannameleri kontrol edin',
      '5 yili gecen zararlari iptal edin',
    ],
    uyarilar: [
      'Sure gecmis zararlar mahsup edilemez',
    ],
  },
  {
    id: 'GV-11',
    sira: 11,
    baslik: 'Fatura Kesim (Cut-Off)',
    aciklama: 'Donem sonu fatura tarih kontrolu',
    detayliAciklama: 'Satis faturalari mal teslimi/hizmet ifasi tarihinde kesilmeli, donem kaydirmasi yapilmamalidir.',
    kontrolNoktasi: [
      'Son gun kesilen faturalar',
      'Ilk gun kesilen faturalar',
      'Sevk irsaliyeleri ile fatura eslestirmesi',
      'Hizmet faturalari donem kontrolu',
    ],
    veriKaynagi: ['e_fatura_listesi'],
    riskSeviyesi: 'yuksek',
    vdkBaglantisi: ['K-06'],
    yasalDayanak: [
      { kanun: 'VUK', madde: '231', aciklama: 'Fatura nizami' },
    ],
    oneriler: [
      'Donem sonu hafta faturalarini inceleyin',
      'Sevk tarihi ile fatura tarihini karsilastirin',
    ],
    uyarilar: [
      'Kasitli donem kaydirma vergi sucu olusturabilir',
    ],
  },
  {
    id: 'GV-12',
    sira: 12,
    baslik: 'Adat & Transfer Fiyatlandirmasi',
    aciklama: 'Iliskili taraf islemleri ve emsallere uygunluk',
    detayliAciklama: 'Ortaklarla, ilişkili şirketlerle yapılan işlemler emsallere uygun fiyatlarla yapılmalıdır.',
    kontrolNoktasi: [
      '131 Ortaklardan Alacaklar',
      '231 Ortaklara Borclar',
      '331 Ortaklara Borclar',
      'Iliskili sirketlerle islemler',
      'Adat faizi hesabi',
    ],
    veriKaynagi: ['mizan_ayrintili'],
    hesaplamaFormulu: 'Adat Faizi = Ortalama Bakiye x (TCMB Reeskont / 365) x Gun',
    riskSeviyesi: 'yuksek',
    vdkBaglantisi: ['K-03'],
    yasalDayanak: [
      { kanun: 'KVK', madde: '12', aciklama: 'Ortulu sermaye' },
      { kanun: 'KVK', madde: '13', aciklama: 'Transfer fiyatlandirmasi' },
    ],
    oneriler: [
      'Ortaklar cari hesabi bakiyesini kontrol edin',
      'Borc bakiyesi varsa adat faizi hesaplayin',
    ],
    uyarilar: [
      'Ortulu sermaye faizi KKEG olur',
    ],
  },
];

// ════════════════════════════════════════════════════════════════════════════
// KURUMLAR VERGİSİ 20 KRİTİK KONTROL
// ════════════════════════════════════════════════════════════════════════════

export const KURUMLAR_VERGISI_KONTROLLER: KurumlarVergisiKontrol[] = [
  {
    id: 'KV-01',
    sira: 1,
    baslik: 'Ticari Kar -> Mali Kar Mutabakati',
    aciklama: 'Muhasebe karindan vergi matrahina gecis kontrolu',
    detayliAciklama: 'Ticari bilanco kari/zarari ile mali kar/zarar arasindaki farklarin tam ve dogru sekilde hesaplanmasi.',
    kontrolNoktasi: [
      'Ticari bilanco kari/zarari dogru mu?',
      'KKEG toplami eklenmis mi?',
      'Vergiye tabi olmayan gelirler cikarilmis mi?',
      'Istisnalar dogru uygulanmis mi?',
      'Mali kar/zarar dogru hesaplanmis mi?',
    ],
    veriKaynagi: ['mizan_ayrintili', 'bilanco', 'gelir_tablosu'],
    hesaplamaFormulu: 'Mali Kar = Ticari Kar + KKEG - Vergiye Tabi Olmayan Gelirler - Istisnalar - Gecmis Yil Zararlari',
    kontrolTipi: 'zorunlu',
    riskSeviyesi: 'kritik',
    yasalDayanak: [
      { kanun: 'KVK', madde: '6', aciklama: 'Safi kurum kazanci' },
    ],
    oneriler: [
      'Beyanname taslagini Excel\'de hazirlayin',
      'Her satiri kaynaklariyla eslestirin',
    ],
    uyarilar: [
      'Mutabakat tablosu olmadan beyanname vermeyin',
    ],
  },
  {
    id: 'KV-02',
    sira: 2,
    baslik: 'KKEG Tespiti ve Siniflandirmasi',
    aciklama: 'Kanunen Kabul Edilmeyen Giderlerin tam tespiti',
    detayliAciklama: 'GVK 41. madde ve KVK 11. maddede sayilan giderlerin tam olarak tespit edilmesi.',
    kontrolNoktasi: [
      'Ortulu sermaye faizi',
      'Transfer fiyatlandirmasi farki',
      'Binek oto kisitlamasi',
      'Kidem tazminati karsiligi',
      'Belgesiz giderler',
      'Para ve vergi cezalari',
    ],
    veriKaynagi: ['mizan_ayrintili'],
    kontrolTipi: 'zorunlu',
    riskSeviyesi: 'kritik',
    yasalDayanak: [
      { kanun: 'GVK', madde: '41', aciklama: 'Gider kabul edilmeyen odemeler' },
      { kanun: 'KVK', madde: '11', aciklama: 'Kabul edilmeyen indirimler' },
    ],
    oneriler: [
      'KKEG listesi olusturun ve her kalem icin yasal dayanak yazin',
    ],
    uyarilar: [
      'KKEG eksik beyani vergi ziyai cezasi gerektirir',
    ],
  },
  {
    id: 'KV-03',
    sira: 3,
    baslik: 'Kur Degerlemesi (VUK 280)',
    aciklama: 'Dovizli kalemlerin donem sonu degerlemesi',
    detayliAciklama: 'Yabanci para cinsinden tum varlik ve borclarin 31 Aralik TCMB doviz alis kuru ile degerlemesi.',
    kontrolNoktasi: [
      'Doviz kasasi (100) degerlemesi',
      'Doviz banka hesaplari (102)',
      'Dovizli alacaklar (120-127)',
      'Dovizli borclar (320-329)',
    ],
    veriKaynagi: ['mizan_ayrintili', 'banka_ekstresi'],
    hesaplamaFormulu: 'Kur Farki = (31.12 TCMB Alis Kuru - Kayit Kuru) x Doviz Tutari',
    kontrolTipi: 'zorunlu',
    riskSeviyesi: 'yuksek',
    vdkBaglantisi: ['K-02'],
    yasalDayanak: [
      { kanun: 'VUK', madde: '280', aciklama: 'Yabanci paralar' },
    ],
    oneriler: [
      'TCMB doviz kurlarini 31.12 tarihli alin',
    ],
    uyarilar: [
      'Kur degerlemesi yapilmazsa matrah hatali olur',
    ],
  },
  {
    id: 'KV-04',
    sira: 4,
    baslik: 'Reeskont Hesaplamasi',
    aciklama: 'Alacak ve borc senetlerinin donem sonu reeskontu',
    detayliAciklama: 'Vadesi gelmemis alacak ve borc senetlerinin ic iskonto yontemi ile donem sonuna indirgenmesi.',
    kontrolNoktasi: [
      'Alacak senetleri reeskontu (121)',
      'Borc senetleri reeskontu (321)',
      'Ic iskonto yontemi kullanilmis mi?',
    ],
    veriKaynagi: ['mizan_ayrintili'],
    hesaplamaFormulu: 'Reeskont = Nominal - [Nominal / (1 + (Faiz x Gun / 360))]',
    kontrolTipi: 'risk',
    riskSeviyesi: 'orta',
    yasalDayanak: [
      { kanun: 'VUK', madde: '281', aciklama: 'Alacak reeskontu' },
      { kanun: 'VUK', madde: '285', aciklama: 'Borc reeskontu' },
    ],
    oneriler: [
      'Senet vadelerini listeleyin',
    ],
    uyarilar: [
      'Alacak reeskontu yapip borc reeskontu yapmamak KKEG',
    ],
  },
  {
    id: 'KV-05',
    sira: 5,
    baslik: 'Amortisman Kontrolu',
    aciklama: 'Sabit kiymet amortismanlari ve kisitlamalar',
    detayliAciklama: 'Sabit kiymetlerin amortisman hesaplamasi, yontem tutarliligi, binek oto kisitlamasi.',
    kontrolNoktasi: [
      'Amortisman yontemi tutarli mi?',
      'Faydali omurler teblige uygun mu?',
      'Kist amortisman uygulandi mi?',
      'Binek oto amortisman kisitlamasi',
    ],
    veriKaynagi: ['mizan_ayrintili'],
    kontrolTipi: 'risk',
    riskSeviyesi: 'orta',
    vdkBaglantisi: ['K-12'],
    yasalDayanak: [
      { kanun: 'VUK', madde: '313-321', aciklama: 'Amortisman' },
    ],
    oneriler: [
      'Amortisman tablosunu guncelleyin',
    ],
    uyarilar: [
      'Binek oto sinirlari her yil guncellenir',
    ],
  },
  {
    id: 'KV-06',
    sira: 6,
    baslik: 'Supheli Alacak Karsiliklari',
    aciklama: 'VUK 323 kapsaminda karsilik ayirma sartlari',
    detayliAciklama: 'Tahsili supheli hale gelen alacaklar icin karsilik ayrilabilmesi yasada belirlenen sartlara baglidir.',
    kontrolNoktasi: [
      'Dava/icra takibi baslatilmis mi?',
      'Protesto edilmis mi?',
      'Kucuk alacak siniri (14.000 TL)',
    ],
    veriKaynagi: ['mizan_ayrintili'],
    kontrolTipi: 'risk',
    riskSeviyesi: 'yuksek',
    vdkBaglantisi: ['K-05'],
    yasalDayanak: [
      { kanun: 'VUK', madde: '323', aciklama: 'Supheli alacaklar' },
    ],
    oneriler: [
      'Her alacak icin yasal takip belgesini dosyalayin',
    ],
    uyarilar: [
      'Sartlar saglanmadan karsilik = KKEG',
    ],
  },
  {
    id: 'KV-07',
    sira: 7,
    baslik: 'Stok Degerlemesi & SMM',
    aciklama: 'Stok sayimi, degerleme ve maliyet hesaplamasi',
    detayliAciklama: 'Donem sonu stok sayimi, degerleme yontemi tutarliligi ve SMM hesaplamasi.',
    kontrolNoktasi: [
      'Fiziki stok sayimi yapildi mi?',
      'Degerleme yontemi tutarli mi?',
      'SMM hesabi formule uygun mu?',
    ],
    veriKaynagi: ['mizan_ayrintili', 'e_fatura_listesi'],
    hesaplamaFormulu: 'SMM = Donem Basi Stok + Alislar - Donem Sonu Stok',
    kontrolTipi: 'zorunlu',
    riskSeviyesi: 'kritik',
    vdkBaglantisi: ['K-10'],
    yasalDayanak: [
      { kanun: 'VUK', madde: '274-278', aciklama: 'Emtia degerlemesi' },
    ],
    oneriler: [
      'Stok sayim tutanagi imzalatin',
    ],
    uyarilar: [
      'SMM hatali ise tum kar/zarar hatali',
    ],
  },
  {
    id: 'KV-08',
    sira: 8,
    baslik: 'Transfer Fiyatlandirmasi',
    aciklama: 'Iliskili kisilerle islemlerde emsallere uygunluk',
    detayliAciklama: 'Iliskili kisilerle yapilan islemlerin emsallere uygun fiyatlarla yapilmasi zorunludur.',
    kontrolNoktasi: [
      'Iliskili taraflar tespit edilmis mi?',
      'Emsallere uygunluk analizi yapilmis mi?',
      'Transfer fiyatlandirmasi raporu hazirlanmis mi?',
    ],
    veriKaynagi: ['mizan_ayrintili', 'e_fatura_listesi'],
    kontrolTipi: 'risk',
    riskSeviyesi: 'kritik',
    vdkBaglantisi: ['K-03'],
    yasalDayanak: [
      { kanun: 'KVK', madde: '13', aciklama: 'Transfer fiyatlandirmasi' },
    ],
    oneriler: [
      'Iliskili taraf matrisini olusturun',
    ],
    uyarilar: [
      'TF farki = KKEG + Stopaj',
    ],
  },
  {
    id: 'KV-09',
    sira: 9,
    baslik: 'Ortulu Sermaye',
    aciklama: 'Ortaklardan alinan borclarin sermayenin 3 katini asmasi',
    detayliAciklama: 'Ortak borclarinin oz sermayenin 3 katini asan kismi ortulu sermaye sayilir.',
    kontrolNoktasi: [
      'Oz sermaye tutari hesaplandi mi?',
      'Ortak borclari tespit edildi mi?',
      '3 kat siniri asildi mi?',
    ],
    veriKaynagi: ['mizan_ayrintili'],
    hesaplamaFormulu: 'Ortulu Sermaye = Ortak Borclari - (Oz Sermaye x 3)',
    kontrolTipi: 'risk',
    riskSeviyesi: 'kritik',
    vdkBaglantisi: ['K-04'],
    yasalDayanak: [
      { kanun: 'KVK', madde: '12', aciklama: 'Ortulu sermaye' },
    ],
    oneriler: [
      'Oz sermayeyi her donem basi hesaplayin',
    ],
    uyarilar: [
      'Ortulu sermaye faizi hem KKEG hem stopaj dogurur',
    ],
  },
  {
    id: 'KV-10',
    sira: 10,
    baslik: 'Finansman Gider Kisitlamasi',
    aciklama: 'Yabanci kaynaklari oz kaynaklari asan isletmelerde %10 kisitlama',
    detayliAciklama: 'Yabanci kaynaklari oz kaynaklarini asan kurumlar, asan kisma iliskin finansman giderlerinin %10\'unu gider olarak dikkate alamazlar.',
    kontrolNoktasi: [
      'Yabanci kaynak > Oz kaynak mi?',
      'Asan kisim hesaplandi mi?',
      '%10 KKEG hesaplandi mi?',
    ],
    veriKaynagi: ['mizan_ayrintili', 'bilanco'],
    hesaplamaFormulu: 'KKEG = Finansman Gideri x (Fazla / Yabanci Kaynak) x %10',
    kontrolTipi: 'risk',
    riskSeviyesi: 'yuksek',
    vdkBaglantisi: ['K-04'],
    yasalDayanak: [
      { kanun: 'KVK', madde: '11/1-i', aciklama: 'Finansman gider kisitlamasi' },
    ],
    oneriler: [
      'Bilanco yapisini analiz edin',
    ],
    uyarilar: [
      'Her yil ayri hesaplama yapilir',
    ],
  },
  {
    id: 'KV-11',
    sira: 11,
    baslik: 'Istirak Kazanci Istisnasi',
    aciklama: 'Tam mukellef kurumlardan alinan temettuler istisnasi',
    detayliAciklama: 'Tam mukellef baska bir kurumun sermayesine istirakten elde edilen kar paylari kurumlar vergisinden istisnadir.',
    kontrolNoktasi: [
      'Istirak edilen kurum tam mukellef mi?',
      'Kar payi karari alinmis mi?',
      'Istisna tutari beyannameye yazilmis mi?',
    ],
    veriKaynagi: ['mizan_ayrintili'],
    kontrolTipi: 'avantaj',
    riskSeviyesi: 'orta',
    yasalDayanak: [
      { kanun: 'KVK', madde: '5/1-a', aciklama: 'Istirak kazanclari istisnasi' },
    ],
    oneriler: [
      'Temettu gelirlerini ayri hesapta izleyin',
    ],
    uyarilar: [],
    potansiyelTasarruf: 'Temettu x %25 = Tasarruf',
  },
  {
    id: 'KV-12',
    sira: 12,
    baslik: 'Gayrimenkul/Istirak Satis Kazanci Istisnasi',
    aciklama: 'En az 2 yil aktifte bulunan varliklarin satis kazancinin %50 istisnasi',
    detayliAciklama: 'En az 2 tam yil sureyle aktiflerinde yer alan tasinmazlarin satisindan dogan kazanclarin %50\'si istisnadir.',
    kontrolNoktasi: [
      '2 yil elde tutma sarti saglandi mi?',
      'Kazanc 5 yil ozel fon hesabinda tutulacak mi?',
      'Istisna orani %50 dogru uygulanmis mi?',
    ],
    veriKaynagi: ['mizan_ayrintili'],
    kontrolTipi: 'avantaj',
    riskSeviyesi: 'orta',
    yasalDayanak: [
      { kanun: 'KVK', madde: '5/1-e', aciklama: 'Tasinmaz satis kazanci' },
    ],
    oneriler: [
      'Ozel fon hesabi (549) acin',
    ],
    uyarilar: [
      'Sartlar bozulursa istisna geri alinir',
    ],
    potansiyelTasarruf: 'Kazanc x %50 x %25 = Tasarruf',
  },
  {
    id: 'KV-13',
    sira: 13,
    baslik: 'AR-GE ve Tasarim Indirimi',
    aciklama: 'AR-GE ve tasarim faaliyetlerinden kaynaklanan indirimler',
    detayliAciklama: '5746 sayili Kanun kapsaminda AR-GE ve tasarim merkezlerinde yapilan faaliyetlerden saglanan indirimler.',
    kontrolNoktasi: [
      'AR-GE merkezi belgesi var mi?',
      'AR-GE harcamalari ayristirilmis mi?',
      'AR-GE indirimi (%100 ek indirim) hesaplanmis mi?',
    ],
    veriKaynagi: ['mizan_ayrintili'],
    kontrolTipi: 'avantaj',
    riskSeviyesi: 'dusuk',
    yasalDayanak: [
      { kanun: '5746', madde: '3', aciklama: 'AR-GE indirimi' },
    ],
    oneriler: [
      'AR-GE projelerini belgelendirin',
    ],
    uyarilar: [],
    potansiyelTasarruf: 'AR-GE Harcamasi x %100 x %25 = Tasarruf',
  },
  {
    id: 'KV-14',
    sira: 14,
    baslik: 'Ihracat Indirimi (%5 Puan)',
    aciklama: 'Ihracattan elde edilen kazanclara 5 puan indirimli oran',
    detayliAciklama: 'Ihracat yapan kurumlarin munhasiran ihracattan elde ettikleri kazanclarina kurumlar vergisi orani 5 puan indirimli uygulanir.',
    kontrolNoktasi: [
      'Ihracat hasilati ayristirilmis mi?',
      'Ihracat maliyeti ayristirilmis mi?',
      'Indirimli oran dogru uygulanmis mi?',
    ],
    veriKaynagi: ['mizan_ayrintili', 'e_fatura_listesi'],
    hesaplamaFormulu: 'Indirimli KV = Ihracat Kazanci x %20 (yerine %25)',
    kontrolTipi: 'avantaj',
    riskSeviyesi: 'dusuk',
    yasalDayanak: [
      { kanun: 'KVK', madde: '32/7', aciklama: 'Ihracat indirimi' },
    ],
    oneriler: [
      'Ihracat kazancini ayri hesaplayin',
    ],
    uyarilar: [],
    potansiyelTasarruf: 'Ihracat Kazanci x %5 = Tasarruf',
  },
  {
    id: 'KV-15',
    sira: 15,
    baslik: 'Nakdi Sermaye Faiz Indirimi',
    aciklama: 'Nakit sermaye artirimlarinda faiz indirimi',
    detayliAciklama: 'Nakit olarak artirilan sermaye uzerinden TCMB ticari kredi faiz oraninin %50\'si kurumlar vergisi matrahindan indirilebilir.',
    kontrolNoktasi: [
      'Nakit sermaye artirimi yapilmis mi?',
      'Nakdin bankaya yatirildigi belgenmis mi?',
      'Indirim tutari dogru hesaplanmis mi?',
    ],
    veriKaynagi: ['mizan_ayrintili'],
    hesaplamaFormulu: 'Indirim = Nakit Sermaye x TCMB Orani x %50',
    kontrolTipi: 'avantaj',
    riskSeviyesi: 'dusuk',
    yasalDayanak: [
      { kanun: 'KVK', madde: '10/1-i', aciklama: 'Nakdi sermaye artisi indirimi' },
    ],
    oneriler: [
      'Sermaye artirisini nakit olarak yapin',
    ],
    uyarilar: [],
    potansiyelTasarruf: 'Nakit Sermaye x TCMB Orani x %50 x %25 = Tasarruf',
  },
  {
    id: 'KV-16',
    sira: 16,
    baslik: 'Yatirim Tesvik Indirimi',
    aciklama: 'Yatirim tesvik belgesi kapsaminda indirimli kurumlar vergisi',
    detayliAciklama: 'Yatirim tesvik belgesi sahibi mukellefler, yatirimdan elde ettikleri kazanclara indirimli kurumlar vergisi uygulayabilirler.',
    kontrolNoktasi: [
      'Yatirim tesvik belgesi var mi?',
      'Yatirim harcamalari tutari',
      'Yatirima katki tutari',
    ],
    veriKaynagi: ['mizan_ayrintili'],
    kontrolTipi: 'avantaj',
    riskSeviyesi: 'dusuk',
    yasalDayanak: [
      { kanun: 'KVK', madde: '32/A', aciklama: 'Indirimli kurumlar vergisi' },
    ],
    oneriler: [
      'Yatirimi belge kapsaminda yapin',
    ],
    uyarilar: [
      '02.08.2024 sonrasi belgelerde AKV etkisi var',
    ],
    potansiyelTasarruf: 'Yatirima Katki Tutari kadar vergi tasarrufu',
  },
  {
    id: 'KV-17',
    sira: 17,
    baslik: 'Gecmis Yil Zararlari Mahsubu',
    aciklama: '5 yillik zarar mahsup hakki',
    detayliAciklama: 'Gecmis 5 yilin zararlari cari donem kazancindan mahsup edilebilir.',
    kontrolNoktasi: [
      'Mahsup edilecek zarar var mi?',
      'Zarar yillari 5 yili gecmemis mi?',
      'Her yil zarari ayri ayri gosterilmis mi?',
    ],
    veriKaynagi: ['mizan_ayrintili'],
    kontrolTipi: 'zorunlu',
    riskSeviyesi: 'orta',
    yasalDayanak: [
      { kanun: 'KVK', madde: '9', aciklama: 'Zarar mahsubu' },
    ],
    oneriler: [
      'Zarar mahsup tablosu tutun',
    ],
    uyarilar: [
      'Sure gecen zarar hakki kaybedilir',
    ],
  },
  {
    id: 'KV-18',
    sira: 18,
    baslik: 'Enflasyon Duzeltmesi Etkisi',
    aciklama: 'VUK Gecici 33 kapsaminda enflasyon duzeltmesi',
    detayliAciklama: '2024 ve 2025 yillarinda enflasyon duzeltmesi zorunlu olup, bu donemlerde duzeltmeden kaynaklanan kar/zarar vergi matrahini etkilemez.',
    kontrolNoktasi: [
      'Enflasyon duzeltmesi yapilmis mi?',
      'Parasal/Parasal olmayan ayrimi dogru mu?',
      'Duzeltme katsayilari dogru mu?',
    ],
    veriKaynagi: ['mizan_ayrintili', 'bilanco'],
    kontrolTipi: 'zorunlu',
    riskSeviyesi: 'kritik',
    yasalDayanak: [
      { kanun: 'VUK', madde: 'Muk.298', aciklama: 'Enflasyon duzeltmesi' },
      { kanun: 'VUK', madde: 'Gecici 33', aciklama: '2024-2025 uygulamasi' },
    ],
    oneriler: [
      'Duzeltme tablolari hazirlayin',
      'YMM ile calisin',
    ],
    uyarilar: [
      '2024-2025: Duzeltme farki vergi matrahini ETKILEMEZ',
      '2026\'dan itibaren matrahi ETKILER',
    ],
  },
  {
    id: 'KV-19',
    sira: 19,
    baslik: 'Asgari Kurumlar Vergisi (AKV)',
    aciklama: '2025\'ten itibaren uygulanan asgari vergi sistemi',
    detayliAciklama: 'Kurumlarin istisna ve indirimler dusuldukten sonra hesaplanan vergilerinin, ticari bilanco karinin %10\'unun altina dusmesi halinde, asgari vergi odeme zorunlulugu.',
    kontrolNoktasi: [
      'Ticari bilanco kari nedir?',
      'Hesaplanan KV, bilanco karinin %10\'u altinda mi?',
      'AR-GE indirimi AKV\'dan istisna mi?',
    ],
    veriKaynagi: ['mizan_ayrintili', 'bilanco'],
    hesaplamaFormulu: 'Asgari KV = Ticari Bilanco Kari x %10',
    kontrolTipi: 'zorunlu',
    riskSeviyesi: 'kritik',
    yasalDayanak: [
      { kanun: '7524', madde: '1-9', aciklama: 'Asgari kurumlar vergisi' },
    ],
    oneriler: [
      'Her beyanname icin AKV senaryosu calisin',
    ],
    uyarilar: [
      '2025\'TEN ITIBAREN GECERLI',
      'Yuksek istisna kullananlar etkilenir',
    ],
  },
  {
    id: 'KV-20',
    sira: 20,
    baslik: 'Stopaj Mahsubu ve Iade',
    aciklama: 'Kesilen vergilerin mahsubu ve iade talebi',
    detayliAciklama: 'Yil icinde kesilen stopajlarin kurumlar vergisinden mahsubu ve fazla kesilen vergilerin iadesi.',
    kontrolNoktasi: [
      'Kesilen stopajlar tespit edilmis mi?',
      'Stopaj belgeleri tam mi?',
      'Gecici vergi mahsubu yapilmis mi?',
    ],
    veriKaynagi: ['mizan_ayrintili', 'beyan_kurumlar'],
    hesaplamaFormulu: 'Odenecek KV = Hesaplanan KV - Stopajlar - Gecici Vergi',
    kontrolTipi: 'zorunlu',
    riskSeviyesi: 'orta',
    yasalDayanak: [
      { kanun: 'KVK', madde: '34', aciklama: 'Vergi kesintisi ve mahsubu' },
    ],
    oneriler: [
      'Stopaj belgelerini toplayin',
    ],
    uyarilar: [
      'Belgesiz stopaj mahsup edilemez',
    ],
  },
];

// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

export function getKurumlarVergisiKontrollerByTip(tip: KontrolTipi): KurumlarVergisiKontrol[] {
  return KURUMLAR_VERGISI_KONTROLLER.filter(k => k.kontrolTipi === tip);
}

export function getKurumlarVergisiRiskKontroller(): KurumlarVergisiKontrol[] {
  return KURUMLAR_VERGISI_KONTROLLER.filter(k => k.kontrolTipi === 'risk');
}

export function getKurumlarVergisiAvantajKontroller(): KurumlarVergisiKontrol[] {
  return KURUMLAR_VERGISI_KONTROLLER.filter(k => k.kontrolTipi === 'avantaj');
}

export function getKurumlarVergisiZorunluKontroller(): KurumlarVergisiKontrol[] {
  return KURUMLAR_VERGISI_KONTROLLER.filter(k => k.kontrolTipi === 'zorunlu');
}

export function getGeciciVergiKontrolById(id: GeciciVergiKontrolId): GeciciVergiKontrol | undefined {
  return GECICI_VERGI_KONTROLLER.find(k => k.id === id);
}

export function getKurumlarVergisiKontrolById(id: KurumlarVergisiKontrolId): KurumlarVergisiKontrol | undefined {
  return KURUMLAR_VERGISI_KONTROLLER.find(k => k.id === id);
}
