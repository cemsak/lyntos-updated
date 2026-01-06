/**
 * RAM (Risk Analiz Modulu) Patternleri
 *
 * VDK'nin beyanname ve mali tablo analizinde kullandigi
 * SMMM hatalarini tespit eden pattern'ler.
 *
 * Bu dosya, SMMM'lerin en sik yaptigi hatalari icerir.
 * Her hata icin tespit formulu ve duzeltme onerisi sunulur.
 *
 * Kaynak:
 * - VDK RAM Senaryolari
 * - SMMM Pratik Deneyimleri
 * - Mevzuat (VUK, GVK, KVK, KDVK)
 */

import type { RamPattern, RamKategori } from '../types/vdk-types';

export const RAM_PATTERNS: Record<string, RamPattern> = {
  // ═══════════════════════════════════════════════════════════════════
  // BEYANNAME HATALARI
  // ═══════════════════════════════════════════════════════════════════

  'RAM-B01': {
    id: 'RAM-B01',
    kategori: 'BEYANNAME',
    ad: 'KV Beyannamesinde Net Kar Hatasi',
    aciklama:
      'Kurumlar Vergisi beyannamesinde ticari bilanco kari yerine vergi sonrasi net karin yazilmasi. En yaygin SMMM hatalarindan biri.',
    tespit: 'KV Beyannamesi "Ticari Bilanco Kari" != Gelir Tablosu 590 + KKEG',
    tespitKodu: 'kvBeyanTicariBilancoKari != gelirTablosu590 + kkegToplam',
    dogru:
      'KV beyannamesine Gelir Tablosu 590 (Donem Net Kari) degil, 590 + KKEG toplami (Ticari Bilanco Kari) yazilmali.',
    otomatikDuzeltme: true,
    duzeltmeAksiyonu: 'kvBeyanTicariBilancoKari = gelirTablosu590 + kkegToplam',
    oncelik: 'KRITIK',
    mevzuat: ['KVK 6', 'VUK 171'],
  },

  'RAM-B02': {
    id: 'RAM-B02',
    kategori: 'BEYANNAME',
    ad: 'GV-KV Matrah Uyumsuzlugu',
    aciklama:
      'Gecici vergi beyannamesi 4. donem matrahi ile yillik KV matrahi arasinda aciklanamayan fark.',
    tespit: '|GV 4. Donem Matrah - KV Matrahi| / KV Matrahi > %10',
    tespitKodu: 'Math.abs(gv4DonemMatrah - kvMatrah) / kvMatrah > 0.10',
    dogru:
      'Fark donem sonu duzeltmelerinden (reeskont, karsilik, vb.) kaynaklanmali ve belgelenmeli.',
    otomatikDuzeltme: false,
    oncelik: 'YUKSEK',
    mevzuat: ['GVK Muk.120', 'KVK 32'],
  },

  'RAM-B03': {
    id: 'RAM-B03',
    kategori: 'BEYANNAME',
    ad: 'Bagis Indirimi KKEG Uyumsuzlugu',
    aciklama:
      'Beyannamede bagis/yardim indirimi yapilmis ancak KKEG tablosunda karsiligi yok.',
    tespit: 'Bagis Indirimi > 0 && KKEG Bagis = 0',
    tespitKodu: 'bagisIndirimi > 0 && kkegBagis == 0',
    dogru:
      'Bagis/yardimlar once 689 veya 770 hesaba gider yazilir, sonra KKEG olarak eklenir, ardindan beyanname uzerinde matrahtan indirilir.',
    otomatikDuzeltme: false,
    oncelik: 'ORTA',
    mevzuat: ['KVK 10', 'GVK 89'],
  },

  'RAM-B04': {
    id: 'RAM-B04',
    kategori: 'BEYANNAME',
    ad: 'Istirak Kazanci Istisnasi Hatasi',
    aciklama:
      'Istirak kazanci istisnasi uygulanmis ancak istirak orani veya sure sartlari saglanmamis.',
    tespit:
      'Istirak Istisnasi > 0 && (Istirak Orani < %10 || Elde Tutma < 1 yil)',
    tespitKodu:
      'istirakIstisnasi > 0 && (istirakOrani < 0.10 || eldeTutmaSuresi < 365)',
    dogru:
      'Istirak kazanci istisnasi icin: (1) En az %10 istirak orani, (2) En az 1 yil elde tutma, (3) Istirak edilen sirketin tam mukellef olmasi sartlari aranir.',
    otomatikDuzeltme: false,
    oncelik: 'YUKSEK',
    mevzuat: ['KVK 5/1-a'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // MUHASEBE HATALARI
  // ═══════════════════════════════════════════════════════════════════

  'RAM-M01': {
    id: 'RAM-M01',
    kategori: 'MUHASEBE',
    ad: 'Donem Sonu Hesaplari Calistirilmamis',
    aciklama:
      '690-691-692-370-371 hesaplarinin donem sonunda calistirilmamasi. Gelir tablosu ve bilanco uyumsuzlugu.',
    tespit: '(690 + 691 + 692) != 0 || (370 + 371) bakiyesi yanlis',
    tespitKodu: '(hesap690 + hesap691 + hesap692) != 0',
    dogru:
      'Donem sonunda 690, 691, 692 hesaplari kapatilmali, vergi karsiligi 370 hesaba yazilmali.',
    otomatikDuzeltme: true,
    duzeltmeAksiyonu: 'donemSonuKapatmaYap()',
    oncelik: 'KRITIK',
    mevzuat: ['Tek Duzen Hesap Plani', 'VUK 171'],
  },

  'RAM-M02': {
    id: 'RAM-M02',
    kategori: 'MUHASEBE',
    ad: 'Aktif-Pasif Dengesizligi',
    aciklama: 'Bilancoda aktif toplami ile pasif toplami esit degil.',
    tespit: 'Toplam Aktif != Toplam Pasif',
    tespitKodu: 'toplamAktif != toplamPasif',
    dogru:
      'Bilanco denkligi temel muhasebe kuralidir. Farkin kaynagi bulunup duzeltilmeli.',
    otomatikDuzeltme: false,
    oncelik: 'KRITIK',
    mevzuat: ['VUK 171', 'Tek Duzen Hesap Plani'],
  },

  'RAM-M03': {
    id: 'RAM-M03',
    kategori: 'MUHASEBE',
    ad: 'Birikmis Amortisman Fazlaligi',
    aciklama:
      'Birikmis amortisman toplaminin duran varlik toplamini asmasi. Muhasebe hatasi.',
    tespit: 'Birikmis Amortisman (257+258) > Duran Varliklar (250-255)',
    tespitKodu:
      '(hesap257 + hesap258) > (hesap250 + hesap251 + hesap252 + hesap253 + hesap254 + hesap255)',
    dogru:
      'Satilan veya hurda edilen varliklarin amortismanlari silinmeli. Sabit kiymet kartlari kontrol edilmeli.',
    otomatikDuzeltme: false,
    oncelik: 'KRITIK',
    mevzuat: ['VUK 315-320', 'Tek Duzen Hesap Plani'],
  },

  'RAM-M04': {
    id: 'RAM-M04',
    kategori: 'MUHASEBE',
    ad: 'Kisa/Uzun Vade Siniflandirma Hatasi',
    aciklama:
      '180-280 (Gelecek Aylara Ait Giderler) ve 300-400 (Alinan Avanslar) hesaplarinda kisa/uzun vade siniflandirma hatasi.',
    tespit:
      '180 veya 300 hesapta 1 yildan uzun vadeli kalem || 280 veya 400 hesapta 1 yildan kisa vadeli kalem',
    tespitKodu: 'kisaVadedeUzunVadeliKalem || uzunVadedeKisaVadeliKalem',
    dogru:
      '1 yildan kisa vadeli kalemler 180/300, 1 yildan uzun vadeli kalemler 280/400 hesaplarda izlenmeli.',
    otomatikDuzeltme: false,
    oncelik: 'ORTA',
    mevzuat: ['Tek Duzen Hesap Plani'],
  },

  'RAM-M05': {
    id: 'RAM-M05',
    kategori: 'MUHASEBE',
    ad: 'Reeskont Kaydi Eksikligi',
    aciklama:
      'Vadeli alacak/borc senetlerinde reeskont kaydi yapilmamasi.',
    tespit: '121 veya 321 bakiyesi > 0 && Reeskont kaydi yok',
    tespitKodu: '(hesap121 > 0 || hesap321 > 0) && reeskontKaydiYok',
    dogru:
      'Vadeli senetler icin donem sonunda reeskont hesaplanmali. 122/322 hesaplar kullanilmali.',
    otomatikDuzeltme: false,
    oncelik: 'ORTA',
    mevzuat: ['VUK 281', 'VUK 285'],
  },

  'RAM-M06': {
    id: 'RAM-M06',
    kategori: 'MUHASEBE',
    ad: 'Supheli Alacak Karsiligi Eksikligi',
    aciklama: '1 yili gecen alacaklar icin karsilik ayrilmamasi.',
    tespit: 'Yasi > 365 gun olan alacaklar > 0 && 129 hesap = 0',
    tespitKodu: 'yasliAlacaklar > 0 && hesap129 == 0',
    dogru:
      "VUK 323'e gore dava veya icra takibine alinan alacaklar icin karsilik ayrilmali.",
    otomatikDuzeltme: false,
    oncelik: 'ORTA',
    mevzuat: ['VUK 323'],
  },

  'RAM-M07': {
    id: 'RAM-M07',
    kategori: 'MUHASEBE',
    ad: 'Stok Degerleme Yontemi Tutarsizligi',
    aciklama:
      'Yil icinde stok degerleme yonteminin (FIFO, ortalama maliyet) degistirilmesi.',
    tespit: 'Stok degerleme yontemi onceki donemden farkli',
    tespitKodu: 'stokDegerlemeYontemi != oncekiDonemYontemi',
    dogru:
      'Stok degerleme yontemi degisikligi icin hakli sebep ve dipnot aciklamasi gerekli.',
    otomatikDuzeltme: false,
    oncelik: 'YUKSEK',
    mevzuat: ['VUK 274', 'VUK 275'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // VERGI HATALARI
  // ═══════════════════════════════════════════════════════════════════

  'RAM-V01': {
    id: 'RAM-V01',
    kategori: 'VERGI',
    ad: 'Binek Oto KDV Indirimi',
    aciklama:
      "Binek otomobil aliminda KDV'nin indirim konusu yapilmasi. KDVK 30/b ihlali.",
    tespit: 'Binek oto alimi var && KDV indirim hesabina kayit yapilmis',
    tespitKodu: 'binekOtoAlimi && kdvIndirimKaydi',
    dogru:
      'Binek otomobil KDV\'si indirim konusu yapilamaz. Maliyete eklenir veya dogrudan gider yazilir.',
    otomatikDuzeltme: false,
    oncelik: 'YUKSEK',
    mevzuat: ['KDVK 30/b', 'KDV Genel Uygulama Tebligi'],
  },

  'RAM-V02': {
    id: 'RAM-V02',
    kategori: 'VERGI',
    ad: 'Odenmemis SGK Primi Gideri',
    aciklama:
      'Tahakkuk etmis ancak odenmemis SGK priminin gider yazilmasi.',
    tespit: 'SGK Prim Tahakkuku > Odenen SGK Primi && KKEG kaydi yok',
    tespitKodu: 'sgkTahakkuk > sgkOdeme && kkegSgkKaydiYok',
    dogru:
      'Odenmemis SGK primleri beyanname doneminde KKEG olarak dikkate alinmali.',
    otomatikDuzeltme: true,
    duzeltmeAksiyonu: 'kkegSgkEkle(sgkTahakkuk - sgkOdeme)',
    oncelik: 'YUKSEK',
    mevzuat: ['GVK 40', 'KVK 8', '5510 sayili Kanun'],
  },

  'RAM-V03': {
    id: 'RAM-V03',
    kategori: 'VERGI',
    ad: 'Kidem Tazminati Karsiligi Gideri',
    aciklama:
      'Kidem tazminati karsiliginin gider yazilmasi. KKEG olarak dikkate alinmali.',
    tespit: '472 Kidem Tazminati Karsiligi > 0 && KKEG kaydi yok',
    tespitKodu: 'hesap472 > 0 && kkegKidemKaydiYok',
    dogru:
      'Kidem tazminati karsiligi ancak odeme yapildiginda gider yazilabilir. Karsilik KKEG.',
    otomatikDuzeltme: true,
    duzeltmeAksiyonu: 'kkegKidemEkle(hesap472)',
    oncelik: 'YUKSEK',
    mevzuat: ['GVK 40/3', 'KVK 8'],
  },

  'RAM-V04': {
    id: 'RAM-V04',
    kategori: 'VERGI',
    ad: 'Motorlu Tasit Vergisi Gideri',
    aciklama:
      "MTV'nin dogrudan gider yazilmasi. KKEG olarak dikkate alinmali.",
    tespit: 'MTV Gideri > 0 && KKEG kaydi yok',
    tespitKodu: 'mtvGideri > 0 && kkegMtvKaydiYok',
    dogru:
      'MTV, KKEG olarak dikkate alinmali. 770 hesaba kaydedilip KKEG tablosuna eklenmeli.',
    otomatikDuzeltme: true,
    duzeltmeAksiyonu: 'kkegMtvEkle(mtvGideri)',
    oncelik: 'ORTA',
    mevzuat: ['GVK 41', 'KVK 11'],
  },

  'RAM-V05': {
    id: 'RAM-V05',
    kategori: 'VERGI',
    ad: 'Gecikme Zammi/Faizi Gideri',
    aciklama: 'Vergi gecikme zammi/faizinin gider yazilmasi.',
    tespit: 'Gecikme Zammi/Faizi Gideri > 0 && KKEG kaydi yok',
    tespitKodu: 'gecikmeZammiGideri > 0 && kkegGecikmeKaydiYok',
    dogru:
      'Vergi cezalari ve gecikme zammlari KKEG olarak dikkate alinmali.',
    otomatikDuzeltme: true,
    duzeltmeAksiyonu: 'kkegGecikmeEkle(gecikmeZammiGideri)',
    oncelik: 'ORTA',
    mevzuat: ['GVK 41', 'KVK 11'],
  },

  'RAM-V06': {
    id: 'RAM-V06',
    kategori: 'VERGI',
    ad: 'Binek Oto Amortisman Siniri Asimi',
    aciklama:
      'Binek otomobil amortismaninda yillik sinirin (2024: 790.000 TL) asilmasi.',
    tespit: 'Binek oto amortisman gideri > Yillik sinir',
    tespitKodu: 'binekOtoAmortisman > yillikSinir',
    dogru:
      'Binek otomobillerde amortisman siniri asan kisim KKEG olarak dikkate alinmali.',
    otomatikDuzeltme: false,
    oncelik: 'ORTA',
    mevzuat: ['GVK 40/5', 'KVK 8'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // SINIF HATALARI
  // ═══════════════════════════════════════════════════════════════════

  'RAM-S01': {
    id: 'RAM-S01',
    kategori: 'SINIF',
    ad: 'Defter Tutma Haddi Sinif Degisikligi',
    aciklama:
      'Ciro artisi nedeniyle isletme defterinden bilanco esasina gecis zorunlulugunun atlanmasi.',
    tespit: 'Net Satislar > Defter tutma haddi && Sinif = Isletme',
    tespitKodu: 'netSatislar > defterTutmaHaddi && sinif == "ISLETME"',
    dogru:
      "VUK 177'ye gore haddi asan mukellefler izleyen yildan itibaren bilanco esasina gecmeli.",
    otomatikDuzeltme: false,
    oncelik: 'KRITIK',
    mevzuat: ['VUK 176', 'VUK 177'],
  },

  'RAM-S02': {
    id: 'RAM-S02',
    kategori: 'SINIF',
    ad: 'E-Fatura Zorunlulugu Tespiti',
    aciklama: 'E-fatura haddi asilmis ancak e-faturaya gecilmemis.',
    tespit: 'Brut satis hasilati > E-fatura haddi && E-fatura kullanicisi degil',
    tespitKodu: 'brutSatisHasilati > eFaturaHaddi && !eFaturaKullanicisi',
    dogru:
      'Haddi asan mukellefler izleyen yilin basindan itibaren e-fatura kullanmali.',
    otomatikDuzeltme: false,
    oncelik: 'KRITIK',
    mevzuat: ['VUK 232', 'e-Fatura Uygulamasi'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // BELGE HATALARI
  // ═══════════════════════════════════════════════════════════════════

  'RAM-D01': {
    id: 'RAM-D01',
    kategori: 'BELGE',
    ad: 'Ba-Bs Bildirim Tutarsizligi',
    aciklama:
      'Ba-Bs bildirimleri ile beyanname tutarlari arasinda uyumsuzluk.',
    tespit: '|Ba/Bs Toplami - Beyanname Toplami| / Beyanname > %5',
    tespitKodu:
      'Math.abs(baBsToplamı - beyannameToplamı) / beyannameToplamı > 0.05',
    dogru:
      'Ba-Bs bildirimleri ve beyannameler tutarli olmali. Farklar arastirilip duzeltilmeli.',
    otomatikDuzeltme: false,
    oncelik: 'YUKSEK',
    mevzuat: ['VUK 256', '396 Sira No.lu VUK Tebligi'],
  },

  'RAM-D02': {
    id: 'RAM-D02',
    kategori: 'BELGE',
    ad: 'E-Defter Berat Tutarsizligi',
    aciklama: 'E-defter berat tutarlari ile mizan tutarsizligi.',
    tespit: '|E-Defter Berat - Mizan Bakiye| > 0.01',
    tespitKodu: 'Math.abs(eDefterBerat - mizanBakiye) > 0.01',
    dogru:
      'E-defter ve mizan tam olarak uyumlu olmali. Berat yuklemeden once kontrol edilmeli.',
    otomatikDuzeltme: false,
    oncelik: 'KRITIK',
    mevzuat: ['VUK 175', '1 Sira No.lu Elektronik Defter Genel Tebligi'],
  },

  'RAM-D03': {
    id: 'RAM-D03',
    kategori: 'BELGE',
    ad: 'Eksik Fatura Kaydi',
    aciklama: 'Gelen e-faturanin muhasebe kayitlarina alinmamasi.',
    tespit: 'Gelen e-fatura sayisi > Muhasebe kaydi sayisi',
    tespitKodu: 'gelenEFaturaSayisi > muhasebeKaydiSayisi',
    dogru:
      'Tum gelen e-faturalar zamaninda muhasebe kayitlarina alinmali.',
    otomatikDuzeltme: false,
    oncelik: 'YUKSEK',
    mevzuat: ['VUK 219', 'VUK 227'],
  },
};

// RAM pattern kategorileri
export const RAM_KATEGORILERI: {
  kategori: RamKategori;
  ad: string;
  aciklama: string;
  ikon: string;
}[] = [
  {
    kategori: 'BEYANNAME',
    ad: 'Beyanname Hatalari',
    aciklama: 'KV, GV, KDV beyannamelerindeki hatalar',
    ikon: '📋',
  },
  {
    kategori: 'MUHASEBE',
    ad: 'Muhasebe Hatalari',
    aciklama: 'Tek Duzen Hesap Plani ve kayit hatalari',
    ikon: '📒',
  },
  {
    kategori: 'VERGI',
    ad: 'Vergi Hatalari',
    aciklama: 'KKEG, indirim ve istisna hatalari',
    ikon: '💰',
  },
  {
    kategori: 'SINIF',
    ad: 'Sinif Degisikligi',
    aciklama: 'Defter tutma sinifi ve zorunluluk hatalari',
    ikon: '📊',
  },
  {
    kategori: 'BELGE',
    ad: 'Belge Hatalari',
    aciklama: 'Ba-Bs, e-defter, e-fatura uyumsuzluklari',
    ikon: '📄',
  },
];

// Kategoriye gore pattern'leri getir
export const getRamPatternsByKategori = (kategori: RamKategori): RamPattern[] => {
  return Object.values(RAM_PATTERNS).filter((p) => p.kategori === kategori);
};

// Kritik pattern'leri getir
export const getKritikRamPatterns = (): RamPattern[] => {
  return Object.values(RAM_PATTERNS).filter((p) => p.oncelik === 'KRITIK');
};

// Otomatik duzeltilebilir pattern'leri getir
export const getOtomatikDuzeltmePatterns = (): RamPattern[] => {
  return Object.values(RAM_PATTERNS).filter((p) => p.otomatikDuzeltme);
};

// RAM istatistikleri
export const RAM_ISTATISTIK = {
  toplamPattern: Object.keys(RAM_PATTERNS).length,
  kritik: Object.values(RAM_PATTERNS).filter((p) => p.oncelik === 'KRITIK').length,
  yuksek: Object.values(RAM_PATTERNS).filter((p) => p.oncelik === 'YUKSEK').length,
  orta: Object.values(RAM_PATTERNS).filter((p) => p.oncelik === 'ORTA').length,
  otomatikDuzeltme: Object.values(RAM_PATTERNS).filter((p) => p.otomatikDuzeltme)
    .length,
  kategoriler: {
    beyanname: Object.values(RAM_PATTERNS).filter(
      (p) => p.kategori === 'BEYANNAME'
    ).length,
    muhasebe: Object.values(RAM_PATTERNS).filter((p) => p.kategori === 'MUHASEBE')
      .length,
    vergi: Object.values(RAM_PATTERNS).filter((p) => p.kategori === 'VERGI').length,
    sinif: Object.values(RAM_PATTERNS).filter((p) => p.kategori === 'SINIF').length,
    belge: Object.values(RAM_PATTERNS).filter((p) => p.kategori === 'BELGE').length,
  },
};
