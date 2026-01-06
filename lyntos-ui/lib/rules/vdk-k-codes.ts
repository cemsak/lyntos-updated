/**
 * VDK K-Kodlari (Risk Kriterleri)
 *
 * VDK-RAS (Risk Analiz Sistemi) tarafindan mukellefleri
 * degerlendirmek icin kullanilan kriterler.
 *
 * Kaynak:
 * - VDK 2024 Faaliyet Raporu
 * - RAM Senaryolari
 * - KURGAN Rehberi
 *
 * NOT: Bu kodlar VDK'nin gercek sisteminden derlenmistir.
 * SMMM'lerin mukelleflerini proaktif olarak kontrol etmesi icin tasarlanmistir.
 */

import type { KKodu, KKoduKategori } from '../types/vdk-types';

export const VDK_K_CODES: Record<string, KKodu> = {
  // ═══════════════════════════════════════════════════════════════════
  // LIKIDITE VE NAKIT RISKLERI
  // ═══════════════════════════════════════════════════════════════════

  'K-01': {
    kod: 'K-01',
    ad: 'Yuksek Kasa Bakiyesi',
    aciklama:
      'Kasa hesabi bakiyesinin aktif toplarina oraninin sektor ortalamasinin uzerinde olmasi. VDK incelemelerinde en sik tespit edilen risk unsurlarindan biridir.',
    kategori: 'LIKIDITE',
    esik: { uyari: 0.05, kritik: 0.15 }, // %5 uyari, %15 kritik
    formul: 'Kasa (100) / Toplam Aktif',
    formulKodu: 'hesap100 / toplamAktif',
    vdkOncelik: 'YUKSEK',
    kurganIliskili: true,
    yaptirimRiski:
      'Ortulu kazanc dagitimi (KVK 13), kayit disi hasilat suphesi, vergi ziyai cezasi',
    oneri:
      'Kasa bakiyesini azaltin: Bankaya yatirin, ortaklara yasal yollarla dagitin veya yuksek bakiyenin nedenini belgeleyin (nakit satis yogun sektor, vb.)',
    mevzuat: ['VUK 134', 'GVK 94', 'KVK 13'],
    sektorelKarsilastirma: true,
  },

  'K-02': {
    kod: 'K-02',
    ad: 'Negatif Kasa Bakiyesi',
    aciklama:
      'Kasa hesabinin alacak (negatif) bakiye vermesi. Fiziksel olarak imkansiz bir durumdur ve kayit hatasi veya eksik tahsilat kaydi gostergesidir.',
    kategori: 'LIKIDITE',
    esik: { kritik: 0 }, // Negatif bakiye = kritik
    formul: 'Kasa (100) < 0',
    formulKodu: 'hesap100 < 0',
    vdkOncelik: 'KRITIK',
    kurganIliskili: true,
    yaptirimRiski:
      'Kayit disi hasilat, defter kayitlarinin guvenilirligi sorgulanmasi, vergi incelemesi',
    oneri:
      'Derhal kasa hareketlerini kontrol edin. Eksik tahsilat kaydi olabilir veya fatura kesilip kasa tahsilati kaydedilmemis olabilir.',
    mevzuat: ['VUK 134', 'VUK 171', 'VUK 219'],
  },

  'K-03': {
    kod: 'K-03',
    ad: 'Banka Hesabi Negatif Bakiye',
    aciklama:
      'Banka hesaplarinin negatif bakiye vermesi. Kredili mevduat hesabi (KMH) kullaniliyorsa normaldir, ancak belgelenmeli.',
    kategori: 'LIKIDITE',
    esik: { uyari: 0, kritik: -100000 }, // -100K TL uzeri kritik
    formul: 'Bankalar (102) < 0 && KMH Belgesi Yok',
    formulKodu: 'hesap102 < 0',
    vdkOncelik: 'ORTA',
    kurganIliskili: false,
    yaptirimRiski: 'Kayit hatasi, eksik borc kaydi',
    oneri:
      'Negatif bakiye KMH (Kredili Mevduat Hesabi) kaynakiysa banka ekstreleriyle belgeleyin. Degilse kayit hatasini duzeltin.',
    mevzuat: ['VUK 219'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // ORTAKLAR ILE ILISKILER
  // ═══════════════════════════════════════════════════════════════════

  'K-04': {
    kod: 'K-04',
    ad: 'Ortaklardan Alacaklar Yuksekligi',
    aciklama:
      '131-Ortaklardan Alacaklar hesabinin sermayeye oraninin yuksek olmasi. Ortulu sermaye ve transfer fiyatlandirmasi riski olusturur.',
    kategori: 'ORTAKLAR',
    esik: { uyari: 0.1, kritik: 0.3 }, // Sermayenin %10 uyari, %30 kritik
    formul: '131 Ortaklardan Alacaklar / 500 Sermaye',
    formulKodu: 'hesap131 / hesap500',
    vdkOncelik: 'YUKSEK',
    kurganIliskili: true,
    yaptirimRiski:
      'Ortulu sermaye (KVK 12), transfer fiyatlandirmasi yoluyla ortulu kazanc dagitimi (KVK 13), %20 vergi ziyai cezasi',
    oneri:
      'Ortaklardan alacaklar icin: 1) Emsallere uygun faiz hesaplayin ve gelir yazin, 2) Tahsil edin, 3) Sermayeye mahsup edin. 1 yil icinde cozume kavusturun.',
    mevzuat: ['KVK 12', 'KVK 13', 'GVK 41'],
  },

  'K-05': {
    kod: 'K-05',
    ad: 'Ortaklara Borclar / Ozkaynak Orani (Ortulu Sermaye)',
    aciklama:
      '331-Ortaklara Borclar hesabinin ozkaynaklara oraninin yuksek olmasi. 3:1 oranini asan kisim ortulu sermaye sayilir.',
    kategori: 'ORTAKLAR',
    esik: { uyari: 2.0, kritik: 3.0 }, // 2x uyari, 3x kritik (ortulu sermaye siniri)
    formul: '331 Ortaklara Borclar / Toplam Ozkaynaklar',
    formulKodu: 'hesap331 / toplamOzkaynak',
    vdkOncelik: 'KRITIK',
    kurganIliskili: true,
    yaptirimRiski:
      'Ortulu sermaye (KVK 12): Odenen faizlerin kanunen kabul edilmeyen gider sayilmasi, kar dagitimi sayilarak stopaj',
    oneri:
      'Borc/ozkaynak oranini 3:1 altina indirin. Borcu sermayeye cevirin veya odeyin. Faiz odemelerini kontrol edin.',
    mevzuat: ['KVK 12', 'KVK 13'],
  },

  'K-06': {
    kod: 'K-06',
    ad: 'Iliskili Kisi Islem Hacmi',
    aciklama:
      'Iliskili kisilerle yapilan islemlerin toplam islem hacmine oraninin yuksek olmasi. Transfer fiyatlandirmasi riski.',
    kategori: 'ORTAKLAR',
    esik: { uyari: 0.3, kritik: 0.5 }, // %30 uyari, %50 kritik
    formul: 'Iliskili Kisi Islemleri / Toplam Islem Hacmi',
    formulKodu: 'iliskiliKisiIslemleri / toplamIslemHacmi',
    vdkOncelik: 'YUKSEK',
    kurganIliskili: true,
    yaptirimRiski:
      'Transfer fiyatlandirmasi yoluyla ortulu kazanc dagitimi (KVK 13), vergi ziyai cezasi',
    oneri:
      'Iliskili kisi islemlerinde emsallere uygunluk ilkesine dikkat edin. Transfer fiyatlandirmasi raporu hazirlayin.',
    mevzuat: ['KVK 13', 'Transfer Fiyatlandirmasi Genel Tebligi'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // SATISLAR VE GELIRLER
  // ═══════════════════════════════════════════════════════════════════

  'K-07': {
    kod: 'K-07',
    ad: 'Dusuk Karlilik Orani',
    aciklama:
      'Brut kar marjinin sektor ortalamasinin cok altinda olmasi. Maliyet sisirmesi veya eksik hasilat beyani suphesi olusturur.',
    kategori: 'SATISLAR',
    esik: { uyari: 0.5, kritik: 0.25 }, // Sektor ortalamasinin %50 ve %25 alti
    formul: 'Brut Kar / Net Satislar vs Sektor Ortalamasi',
    formulKodu: '(hesap600 - hesap621) / hesap600',
    vdkOncelik: 'ORTA',
    kurganIliskili: true,
    yaptirimRiski: 'Eksik hasilat beyani, sahte fatura ile maliyet sisirmesi suphesi',
    oneri:
      'Karlilik dusuklugunun nedenini belgeleyin: Rekabet baskisi, hammadde fiyat artisi, pazar kaybi vb. Sektor raporu hazirlayin.',
    mevzuat: ['VUK 134', 'KVK 6'],
    sektorelKarsilastirma: true,
  },

  'K-08': {
    kod: 'K-08',
    ad: 'Satis-Tahsilat Uyumsuzlugu',
    aciklama:
      'Net satislar ile banka tahsilatlari arasindaki farkin yuksek olmasi. Kayit disi satis veya elden tahsilat gostergesi.',
    kategori: 'SATISLAR',
    esik: { uyari: 0.1, kritik: 0.25 }, // %10 ve %25 fark
    formul: '|Net Satislar - Banka Tahsilatlari| / Net Satislar',
    formulKodu: 'Math.abs(hesap600 - bankaTahsilatlari) / hesap600',
    vdkOncelik: 'YUKSEK',
    kurganIliskili: true,
    yaptirimRiski: 'Kayit disi satis, elden tahsilat, vergi ziyai',
    oneri:
      'Tum tahsilatlari banka uzerinden yapin. Mevcut farki belgeleyin: Vadeli satislar, cek/senet tahsilatlari vb.',
    mevzuat: ['VUK 232', 'VUK 234', 'VUK 257'],
  },

  'K-09': {
    kod: 'K-09',
    ad: 'KDV Beyani - E-Fatura Uyumsuzlugu',
    aciklama:
      'KDV beyannamesi matrahi ile e-fatura toplamlari arasindaki fark. KURGAN tarafindan anlik tespit edilir.',
    kategori: 'BEYANNAME',
    esik: { uyari: 0.01, kritik: 0.05 }, // %1 ve %5 fark
    formul: '|KDV Beyan Matrahi - E-Fatura Toplami| / KDV Beyan Matrahi',
    formulKodu: 'Math.abs(kdvBeyanMatrahi - eFaturaToplami) / kdvBeyanMatrahi',
    vdkOncelik: 'KRITIK',
    kurganIliskili: true,
    yaptirimRiski: 'Eksik/fazla KDV beyani, vergi ziyai cezasi, usulsuzluk cezasi',
    oneri:
      'Her ay KDV beyannamesi vermeden once e-fatura toplamlariyla karsilastirin. Farkin nedenini tespit edin.',
    mevzuat: ['KDVK 29', 'VUK 341', 'VUK 344'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // STOK VE MALIYET
  // ═══════════════════════════════════════════════════════════════════

  'K-10': {
    kod: 'K-10',
    ad: 'Kaydi Stok - Fiili Stok Uyumsuzlugu',
    aciklama:
      'Kaydi stok bakiyesi ile fiili envanter arasindaki fark. VDK saha denetimlerinde en sik tespit edilen risk.',
    kategori: 'STOK',
    esik: { uyari: 0.05, kritik: 0.15 }, // %5 ve %15 fark
    formul: '|Kaydi Stok - Fiili Stok| / Kaydi Stok',
    formulKodu: 'Math.abs(kaydiStok - fiiliStok) / kaydiStok',
    vdkOncelik: 'KRITIK',
    kurganIliskili: true,
    yaptirimRiski:
      'Kayit disi satis (stok fazlasi), sahte fatura ile maliyet sisirmesi (stok eksigi)',
    oneri:
      'Yil sonu mutlaka fiili envanter sayimi yapin. Farklari fire, zayi veya sayim farki olarak belgeleyin. Onemli farklar icin tutanak duzenleyin.',
    mevzuat: ['VUK 186', 'VUK 257', 'VUK 267'],
  },

  'K-11': {
    kod: 'K-11',
    ad: 'Dusuk Stok Devir Hizi',
    aciklama:
      'Stok devir hizinin sektor ortalamasinin cok altinda olmasi. Atil stok veya deger dusukluğu riski.',
    kategori: 'STOK',
    esik: { uyari: 0.5, kritik: 0.25 }, // Sektor ortalamasinin %50 ve %25 alti
    formul: 'SMM / Ortalama Stok vs Sektor Ortalamasi',
    formulKodu: 'hesap621 / ((acilisStok + kaparisStok) / 2)',
    vdkOncelik: 'ORTA',
    kurganIliskili: false,
    yaptirimRiski: 'Deger dusukluğu kaydi ihmali, gercek olmayan stok bakiyesi',
    oneri:
      'Stok yaslandirma analizi yapin. 1 yildan fazla hareket gormeyen stoklar icin deger dusukluğu karsiligi ayirin.',
    mevzuat: ['VUK 274', 'VUK 278'],
    sektorelKarsilastirma: true,
  },

  'K-12': {
    kod: 'K-12',
    ad: 'Yuksek SMM / Satis Orani',
    aciklama:
      'Satilan malin maliyetinin net satislara oraninin sektor ortalamasinin uzerinde olmasi. Maliyet sisirmesi suphesi.',
    kategori: 'STOK',
    esik: { uyari: 1.2, kritik: 1.5 }, // Sektor ortalamasinin 1.2x ve 1.5x uzeri
    formul: 'SMM / Net Satislar vs Sektor Ortalamasi',
    formulKodu: 'hesap621 / hesap600',
    vdkOncelik: 'YUKSEK',
    kurganIliskili: true,
    yaptirimRiski: 'Sahte fatura ile maliyet sisirmesi, vergi ziyai',
    oneri:
      'Maliyet yapinizi gozden gecirin. Tedarikci faturalarini kontrol edin. Sektor karsilastirmasi yapin.',
    mevzuat: ['VUK 134', 'KVK 6'],
    sektorelKarsilastirma: true,
  },

  // ═══════════════════════════════════════════════════════════════════
  // ALACAK VE BORC YONETIMI
  // ═══════════════════════════════════════════════════════════════════

  'K-13': {
    kod: 'K-13',
    ad: 'Yuksek Alacak Tahsilat Suresi',
    aciklama:
      'Ortalama alacak tahsilat suresinin sektor ortalamasinin uzerinde olmasi. Supheli alacak riski.',
    kategori: 'ALACAK_BORC',
    esik: { uyari: 90, kritik: 180 }, // 90 gun uyari, 180 gun kritik
    formul: '(Ticari Alacaklar / Net Satislar) x 365',
    formulKodu: '(hesap120 / hesap600) * 365',
    vdkOncelik: 'ORTA',
    kurganIliskili: false,
    yaptirimRiski: 'Supheli alacak karsiligi yetersizliği, gercek olmayan alacak bakiyesi',
    oneri:
      'Alacak yaslandirma analizi yapin. 1 yili gecen alacaklar icin dava acin veya icra takibi baslatin, karsilik ayirin.',
    mevzuat: ['VUK 323', 'VUK 324'],
  },

  'K-14': {
    kod: 'K-14',
    ad: 'Supheli Alacak Karsiligi Yetersizliği',
    aciklama: '1 yili gecen alacaklar icin karsilik ayrilmamasi. VUK 323 ihlali.',
    kategori: 'ALACAK_BORC',
    esik: { kritik: 365 }, // 365 gun gecen alacaklar
    formul: 'Yasi > 365 gun olan alacaklar && Karsilik = 0',
    formulKodu: 'alacakYasi > 365 && hesap129 == 0',
    vdkOncelik: 'ORTA',
    kurganIliskili: false,
    yaptirimRiski: 'Vergi matrahi yukselmesi, gercekci olmayan bilanco',
    oneri:
      "VUK 323'e gore supheli alacaklar icin dava veya icra takibi baslatin. Karsilik ayirarak gider yazin.",
    mevzuat: ['VUK 323'],
  },

  'K-15': {
    kod: 'K-15',
    ad: 'Saticilar Hesabi Ters Bakiye',
    aciklama: '320-Saticilar hesabinin borc (pozitif) bakiye vermesi. Normal olmayan durum.',
    kategori: 'ALACAK_BORC',
    esik: { kritik: 0 },
    formul: '320 Saticilar Bakiyesi > 0',
    formulKodu: 'hesap320 > 0',
    vdkOncelik: 'ORTA',
    kurganIliskili: false,
    yaptirimRiski: 'Kayit hatasi, fazla odeme kaydi',
    oneri:
      'Saticilar hesabini kontrol edin. Borc bakiye varsa: Avans odemesi veya fazla odeme olabilir. 159-Verilen Siparis Avanslari hesabina aktarin.',
    mevzuat: ['VUK 219', 'Tek Duzen Hesap Plani'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // DURAN VARLIK VE AMORTISMAN
  // ═══════════════════════════════════════════════════════════════════

  'K-16': {
    kod: 'K-16',
    ad: 'Amortisman Uyumsuzlugu',
    aciklama:
      'Birikmis amortisman toplaminin duran varlik toplamini asmasi. Muhasebe hatasi.',
    kategori: 'DURAN_VARLIK',
    esik: { kritik: 1.0 }, // Birikmis amortisman / Duran varlik > 1
    formul: 'Birikmis Amortisman / Duran Varliklar > 1',
    formulKodu:
      '(hesap257 + hesap258) / (hesap250 + hesap251 + hesap252 + hesap253 + hesap254 + hesap255)',
    vdkOncelik: 'KRITIK',
    kurganIliskili: false,
    yaptirimRiski: 'Muhasebe hatasi, fazla gider yazimi, defter kayitlarinin guvenilirligi',
    oneri:
      'Sabit kiymet kartlarini kontrol edin. Satilan veya hurda edilen varliklarin amortismanlari silinmemis olabilir. Duzeltme kaydi yapin.',
    mevzuat: [
      'VUK 315',
      'VUK 316',
      'VUK 317',
      'VUK 318',
      'VUK 319',
      'VUK 320',
    ],
  },

  'K-17': {
    kod: 'K-17',
    ad: 'Duran Varlik Satis Bedeli Dusukluğu',
    aciklama:
      'Gayrimenkul satis bedelinin tapu kaydindaki kredi miktarindan dusuk olmasi. KURGAN tarafindan anlik tespit.',
    kategori: 'DURAN_VARLIK',
    esik: { kritik: 0 }, // Satis bedeli < Kredi miktari
    formul: 'Satis Bedeli < Tapu Kaydindaki Kredi',
    formulKodu: 'satisBedeli < tapuKrediMiktari',
    vdkOncelik: 'KRITIK',
    kurganIliskili: true,
    yaptirimRiski: 'Dusuk bedelle satis, deger artis kazanci eksik beyani, vergi ziyai',
    oneri:
      'Gayrimenkul satislarinda gercek satis bedelini beyan edin. Tapu kaydi ve banka dekontlari karsilastirilacaktir.',
    mevzuat: ['VUK 267', 'GVK Muk.80', 'GVK 81'],
  },

  'K-18': {
    kod: 'K-18',
    ad: 'Amortisman Orani Uyumsuzlugu',
    aciklama: 'Uygulanan amortisman oraninin yasal oranlardan farkli olmasi.',
    kategori: 'DURAN_VARLIK',
    esik: { kritik: 0.01 }, // %1 sapma
    formul: 'Uygulanan Amortisman Orani != Yasal Oran',
    formulKodu: 'Math.abs(uygulamaOrani - yasalOran) > 0.01',
    vdkOncelik: 'ORTA',
    kurganIliskili: false,
    yaptirimRiski: 'Fazla/eksik gider, vergi matrahi hatasi',
    oneri:
      'VUK 315-320 ve Amortisman Genel Tebligindeki oranlari kontrol edin. Sabit kiymet kartlarini guncelleyin.',
    mevzuat: [
      'VUK 315',
      'VUK 316',
      'VUK 317',
      'VUK 318',
      'VUK 319',
      'VUK 320',
      '333, 339, 365, 389, 458 Sira No.lu VUK Tebligleri',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // GIDERLER VE KKEG
  // ═══════════════════════════════════════════════════════════════════

  'K-19': {
    kod: 'K-19',
    ad: 'KKEG - Bagis/Yardim Uyumsuzlugu',
    aciklama:
      'Beyannamede indirilen bagis/yardim tutarinin KKEG tablosunda gorunmemesi.',
    kategori: 'GIDERLER',
    esik: { kritik: 0 },
    formul: 'Bagis Indirimi > 0 && KKEG Bagis = 0',
    formulKodu: 'bagisIndirimi > 0 && kkegBagis == 0',
    vdkOncelik: 'ORTA',
    kurganIliskili: false,
    yaptirimRiski: 'Mukerrer indirim, vergi matrahi hatasi',
    oneri:
      'Bagis ve yardimlari once KKEG olarak yazin, sonra beyanname uzerinde matrahtan indirin. Iki kez indirim yapilmasini onleyin.',
    mevzuat: ['KVK 10', 'GVK 89'],
  },

  'K-20': {
    kod: 'K-20',
    ad: 'Binek Oto KDV Indirimi',
    aciklama:
      'Binek otomobil alimlarinda KDV\'nin indirim konusu yapilmasi. KDVK 30/b ihlali.',
    kategori: 'GIDERLER',
    esik: { kritik: 0 },
    formul: 'Binek Oto Alimi && KDV Indirim > 0',
    formulKodu: 'binekOtoAlimi && kdvIndirim > 0',
    vdkOncelik: 'ORTA',
    kurganIliskili: false,
    yaptirimRiski: 'Haksiz KDV indirimi, vergi ziyai cezasi',
    oneri:
      "Binek otomobil alimlarinda odenen KDV'yi indirim konusu yapmayin. KDV'yi aracin maliyetine ekleyin veya dogrudan gider yazin.",
    mevzuat: ['KDVK 30/b', 'KDV Genel Uygulama Tebligi'],
  },

  'K-21': {
    kod: 'K-21',
    ad: 'Odenmemis SGK Primi Gideri',
    aciklama: 'Tahakkuk etmis ancak odenmemis SGK priminin gider yazilmasi.',
    kategori: 'GIDERLER',
    esik: { kritik: 0 },
    formul: 'SGK Prim Gideri > Odenen SGK Primi',
    formulKodu: 'sgkPrimGideri > odenenSgkPrimi',
    vdkOncelik: 'ORTA',
    kurganIliskili: false,
    yaptirimRiski: 'KKEG ihlali, vergi matrahi hatasi',
    oneri:
      'Yil icinde tahakkuk eden ancak odenmeyen SGK primlerini KKEG olarak dikkate alin. Beyanname duzeltmesi yapin.',
    mevzuat: ['GVK 40', 'KVK 8', '5510 sayili Kanun'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // BEYANNAME VE BILDIRIM
  // ═══════════════════════════════════════════════════════════════════

  'K-22': {
    kod: 'K-22',
    ad: 'Ba-Bs Uyumsuzlugu',
    aciklama:
      'Ba-Bs bildirimleri ile beyanname tutarlari arasindaki fark. VDK tarafindan otomatik kontrol edilir.',
    kategori: 'BEYANNAME',
    esik: { uyari: 0.01, kritik: 0.05 }, // %1 ve %5 fark
    formul: '|Ba/Bs Toplami - Beyanname Toplami| / Beyanname',
    formulKodu: 'Math.abs(baBsToplami - beyannameToplami) / beyannameToplami',
    vdkOncelik: 'KRITIK',
    kurganIliskili: true,
    yaptirimRiski: 'Eksik/fazla beyan, usulsuzluk cezasi, vergi incelemesi',
    oneri:
      'Her ay Ba-Bs bildirimlerini beyannamelerle karsilastirin. Farklarin nedenini tespit edin ve duzeltin.',
    mevzuat: ['VUK 256', 'VUK Muk.257', '396 Sira No.lu VUK Tebligi'],
  },

  'K-23': {
    kod: 'K-23',
    ad: 'E-Defter - Mizan Uyumsuzlugu',
    aciklama:
      'E-defter kayitlari ile mizan bakiyeleri arasindaki fark. KURGAN tarafindan anlik tespit.',
    kategori: 'BEYANNAME',
    esik: { kritik: 0.001 }, // %0.1 bile kritik
    formul: '|E-Defter Bakiye - Mizan Bakiye| > 0',
    formulKodu: 'Math.abs(eDefter Bakiye - mizanBakiye) > 0',
    vdkOncelik: 'KRITIK',
    kurganIliskili: true,
    yaptirimRiski: 'Kayit tutarsizligi, e-defter reddi, usulsuzluk cezasi',
    oneri:
      'E-defter ve mizan arasindaki tum farklari tespit edin ve duzeltin. Berat yuklemeden once kontrol edin.',
    mevzuat: ['VUK 175', 'VUK 219', '1 Sira No.lu Elektronik Defter Genel Tebligi'],
  },

  'K-24': {
    kod: 'K-24',
    ad: 'Gecici Vergi - KV Matrah Farki',
    aciklama:
      '4. donem gecici vergi matrahi ile yillik KV matrahi arasindaki onemli fark.',
    kategori: 'BEYANNAME',
    esik: { uyari: 0.1, kritik: 0.25 }, // %10 ve %25 fark
    formul: '|GV 4. Donem Matrah - KV Matrahi| / KV Matrahi',
    formulKodu: 'Math.abs(gv4DonemMatrah - kvMatrah) / kvMatrah',
    vdkOncelik: 'ORTA',
    kurganIliskili: false,
    yaptirimRiski: 'Eksik gecici vergi, gecikme zammi',
    oneri:
      'Farkin nedenini belgeleyin: Donem sonu duzeltmeleri, karsilik kayitlari, reeskont vb. Duzeltme beyani gerekebilir.',
    mevzuat: ['GVK Muk.120', 'KVK 32'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // SAHTE BELGE RISKLERI
  // ═══════════════════════════════════════════════════════════════════

  'K-25': {
    kod: 'K-25',
    ad: 'Riskli Mukelleften Alim',
    aciklama:
      'KURGAN sisteminde yuksek risk puanli mukelleften alim yapilmasi. 1 Ekim 2025 sonrasi "bilmiyordum" savunmasi gecersiz.',
    kategori: 'SAHTE_BELGE',
    esik: { kritik: 0 },
    formul: 'Satici Risk Puani = YUKSEK',
    formulKodu: 'saticiRiskPuani >= 75',
    vdkOncelik: 'KRITIK',
    kurganIliskili: true,
    yaptirimRiski:
      'Sahte belge kullanimi: Bilmeden 1 kat, bilerek 3 kat vergi ziyai cezasi + 3-8 yil hapis (VUK 359)',
    oneri:
      'Saticiyi GIB sorgulamasindan kontrol edin. Banka odemesi yapin. Sevk irsaliyesi ve tarti fisi alin. Islemin gercekligini belgeleyin.',
    mevzuat: ['VUK 359', 'VUK 370', 'KURGAN Rehberi'],
  },

  'K-26': {
    kod: 'K-26',
    ad: 'Komisyon Faturasi Riski',
    aciklama:
      'Yil sonlarinda komisyon adi altinda duzenlenen faturalar. Sahte belge duzenleme suphesi.',
    kategori: 'SAHTE_BELGE',
    esik: { kritik: 0 },
    formul: 'Aralik ayi Komisyon Faturasi && Sozlesme Yok',
    formulKodu: 'ayAralik && faturaKonu == "komisyon" && sozlesmeYok',
    vdkOncelik: 'YUKSEK',
    kurganIliskili: true,
    yaptirimRiski: 'Sahte belge duzenleme (VUK 359), 3-8 yil hapis cezasi',
    oneri:
      'Komisyon faturalarini belgeleyin: Yazili sozlesme, is akisi kaniti, banka transferi. Sozlesme olmadan komisyon faturasi duzenlemeyin.',
    mevzuat: ['VUK 359', 'VUK 227'],
  },

  'K-27': {
    kod: 'K-27',
    ad: 'Mal/Hizmet Akisi Tutarsizligi',
    aciklama:
      'Alinan mal/hizmetin isletme faaliyetiyle uyumsuzlugu. KURGAN tarafindan anlik tespit.',
    kategori: 'SAHTE_BELGE',
    esik: { kritik: 0 },
    formul: 'Alim Konusu != Faaliyet Alani',
    formulKodu: 'alimKonusu != faaliyetAlani',
    vdkOncelik: 'YUKSEK',
    kurganIliskili: true,
    yaptirimRiski: 'Sahte belge kullanimi suphesi',
    oneri:
      'Faaliyet alaninizla uyumsuz alimlari belgeleyin: Neden bu alim yapildi? Hangi projede/iste kullanildi?',
    mevzuat: ['VUK 359', 'VUK 370'],
  },
};

// K-Kodu kategorileri listesi
export const K_KODU_KATEGORILERI: {
  kategori: KKoduKategori;
  ad: string;
  aciklama: string;
}[] = [
  {
    kategori: 'LIKIDITE',
    ad: 'Likidite ve Nakit',
    aciklama: 'Kasa, banka ve nakit yonetimi riskleri',
  },
  {
    kategori: 'ORTAKLAR',
    ad: 'Ortaklar Ile Iliskiler',
    aciklama: 'Ortaklardan alacak/borc ve iliskili kisi islemleri',
  },
  {
    kategori: 'SATISLAR',
    ad: 'Satislar ve Gelirler',
    aciklama: 'Satis, tahsilat ve karlilik riskleri',
  },
  {
    kategori: 'STOK',
    ad: 'Stok ve Maliyet',
    aciklama: 'Stok yonetimi ve maliyet riskleri',
  },
  {
    kategori: 'ALACAK_BORC',
    ad: 'Alacak ve Borc',
    aciklama: 'Alacak/borc yonetimi ve karsilik riskleri',
  },
  {
    kategori: 'DURAN_VARLIK',
    ad: 'Duran Varlik ve Amortisman',
    aciklama: 'Duran varlik ve amortisman riskleri',
  },
  {
    kategori: 'GIDERLER',
    ad: 'Giderler ve KKEG',
    aciklama: 'Gider kayitlari ve KKEG riskleri',
  },
  {
    kategori: 'BEYANNAME',
    ad: 'Beyanname ve Bildirim',
    aciklama: 'Beyanname, Ba-Bs ve bildirim uyumu',
  },
  {
    kategori: 'SAHTE_BELGE',
    ad: 'Sahte Belge Riskleri',
    aciklama: 'Sahte belge kullanma/duzenleme riskleri',
  },
];

// K-Kodlarini kategoriye gore grupla
export const getKKodlariByKategori = (kategori: KKoduKategori): KKodu[] => {
  return Object.values(VDK_K_CODES).filter((k) => k.kategori === kategori);
};

// KURGAN iliskili K-Kodlarini getir
export const getKurganIliskiliKKodlari = (): KKodu[] => {
  return Object.values(VDK_K_CODES).filter((k) => k.kurganIliskili);
};

// Kritik oncelikli K-Kodlarini getir
export const getKritikKKodlari = (): KKodu[] => {
  return Object.values(VDK_K_CODES).filter((k) => k.vdkOncelik === 'KRITIK');
};

// K-Kodu sayilari
export const K_KODU_ISTATISTIK = {
  toplam: Object.keys(VDK_K_CODES).length,
  kritik: Object.values(VDK_K_CODES).filter((k) => k.vdkOncelik === 'KRITIK').length,
  yuksek: Object.values(VDK_K_CODES).filter((k) => k.vdkOncelik === 'YUKSEK').length,
  orta: Object.values(VDK_K_CODES).filter((k) => k.vdkOncelik === 'ORTA').length,
  kurganIliskili: Object.values(VDK_K_CODES).filter((k) => k.kurganIliskili).length,
};
