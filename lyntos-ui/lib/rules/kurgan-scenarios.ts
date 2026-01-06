/**
 * KURGAN Senaryolari
 *
 * Kurulus Gozetimli Analiz Sistemi (KURGAN)
 * VDK tarafindan 1 Ekim 2025'te devreye alinmistir.
 *
 * KURGAN, islemlere risk puani atar (mukellefe degil!).
 * Yuksek riskli islemler tespit edildiginde mukellefe "KURGAN yazisi" gonderilir.
 *
 * ONEMLI: 1 Ekim 2025 sonrasi "bilmiyordum" savunmasi gecersiz!
 *
 * Kaynak:
 * - KURGAN Rehberi (HMB/VDK)
 * - VDK 2024 Faaliyet Raporu
 * - VUK 359, 370
 */

import type { KurganSenaryo, KurganAksiyon } from '../types/vdk-types';

/**
 * KURGAN Aksiyon Tipleri Aciklamasi
 *
 * TAKIP: Sistem izliyor, henuz aksiyon yok
 * BILGI_ISTEME: 15 gun icinde bilgi/belge istenir
 * IZAHA_DAVET: 30 gun icinde izahat istenir (VUK 370)
 * INCELEME: Dogrudan vergi incelemesine sevk
 */

export const KURGAN_SCENARIOS: Record<string, KurganSenaryo> = {
  // ═══════════════════════════════════════════════════════════════════
  // SATICI RISK PROFILI
  // ═══════════════════════════════════════════════════════════════════

  'KRG-01': {
    id: 'KRG-01',
    ad: 'Riskli Saticidan Alim',
    aciklama:
      'Alim yapilan saticinin VDK sisteminde yuksek risk puanina sahip olmasi. KURGAN bu durumu anlik tespit eder ve aliciya bildirim gonderir.',
    tetikleyiciler: [
      'Saticinin son 3 ayda KDV beyannamesi vermemesi',
      'Saticinin vergi borcu bulunmasi ve haciz serhi olmasi',
      'Saticinin daha once sahte belge duzenleyicisi olarak tespiti',
      'Saticinin kayitli adresinde faaliyet gostermemesi',
      'Saticinin isci sayisi ile ciro uyumsuzlugu',
      'Saticinin Ba-Bs bildirimlerinde tutarsizlik',
    ],
    riskPuani: 85,
    aksiyon: 'IZAHA_DAVET',
    suresi: '30 gun',
    mevzuat: ['VUK 359', 'VUK 370', 'KURGAN Rehberi'],
    ornekler: [
      "A sirketi, son 6 aydir beyanname vermeyen B firmasindan 500.000 TL alim yapmis",
      'X Ltd., hakkinda VTR duzenlenen Y firmasindan hizmet almis',
    ],
  },

  'KRG-02': {
    id: 'KRG-02',
    ad: 'Zincirleme Riskli Alim',
    aciklama:
      'Saticinin tedarikcilerinin de riskli olmasi. Alt zincirdeki sahte belge riski aliciya sirayet eder.',
    tetikleyiciler: [
      "Saticinin alim yaptigi firmalarin %50'sinden fazlasi riskli",
      'Saticinin KDV iade taleplerinde riskli fatura tespit edilmis',
      'Saticinin 2. veya 3. kademe tedarikcisinde sahte belge tespiti',
    ],
    riskPuani: 75,
    aksiyon: 'BILGI_ISTEME',
    suresi: '15 gun',
    mevzuat: ['VUK 359', 'KDV Genel Uygulama Tebligi'],
    ornekler: ['Tedarik zincirinde 3 kademe oncesinde kod-4 mukellef tespit edildi'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // MAL/HIZMET AKISI
  // ═══════════════════════════════════════════════════════════════════

  'KRG-03': {
    id: 'KRG-03',
    ad: 'Mal/Hizmet Akisi Tutarsizligi',
    aciklama:
      'Alinan mal veya hizmetin isletmenin faaliyet konusuyla uyumsuz olmasi.',
    tetikleyiciler: [
      'Restoran isletmesinin insaat malzemesi almasi',
      'Yazilim sirketinin yuksek miktarda akaryakit almasi',
      'Tekstil firmasinin elektronik komponent almasi',
      'Imalat tesisi olmadan yuksek hacimli hammadde alimi',
      'Depo/arac olmadan yuksek hacimli mal alimi',
    ],
    riskPuani: 80,
    aksiyon: 'IZAHA_DAVET',
    suresi: '30 gun',
    mevzuat: ['VUK 359', 'VUK 3/B'],
    ornekler: [
      "Mimarlik ofisi 2 milyon TL'lik demir-celik alisi yapmis",
      "Danismanlik firmasi 500 bin TL'lik tekstil hammaddesi almis",
    ],
  },

  'KRG-04': {
    id: 'KRG-04',
    ad: 'Stok-Satis Uyumsuzlugu',
    aciklama:
      'Satilan malin stoklarda hic bulunmamis olmasi veya stok hareketi ile satis tutarsizligi.',
    tetikleyiciler: [
      'Satis tutari > (Alis + Acilis Stoku) tutari',
      'Stok devir hizi sektor ortalamasinin 5 katindan fazla',
      'Surekli negatif stok bakiyesi',
      'Donem sonu stok = 0 iken yuksek satis',
    ],
    riskPuani: 85,
    aksiyon: 'IZAHA_DAVET',
    suresi: '30 gun',
    mevzuat: ['VUK 186', 'VUK 257', 'VUK 359'],
    ornekler: [
      'Sirket 10 milyon TL satis yapmis ancak toplam alislari 3 milyon TL',
    ],
  },

  'KRG-05': {
    id: 'KRG-05',
    ad: 'Sevk Belgesi Eksikligi/Tutarsizligi',
    aciklama:
      'Mal aliminda sevk irsaliyesi olmamasi veya sevk bilgilerinin tutarsizligi.',
    tetikleyiciler: [
      'Yuksek tutarli mal alimi olmasina ragmen sevk irsaliyesi yok',
      'Sevk irsaliyesindeki tonaj, arac kapasitesini asiyor',
      'Sevk adresi ile fatura adresi farkli ve aciklamasi yok',
      'Sevk tarihi ile fatura tarihi arasinda mantiksiz sure farki',
    ],
    riskPuani: 70,
    aksiyon: 'BILGI_ISTEME',
    suresi: '15 gun',
    mevzuat: ['VUK 230', 'VUK 359'],
    ornekler: ['TIR kapasitesi 25 ton iken irsaliyede 50 ton mal gosterilmis'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // ODEME YONTEMI
  // ═══════════════════════════════════════════════════════════════════

  'KRG-06': {
    id: 'KRG-06',
    ad: 'Odeme Yontemi Uyumsuzlugu',
    aciklama:
      'Fatura bedelinin elden/nakit odenmesi veya odeme kaydi bulunmamasi.',
    tetikleyiciler: [
      'Fatura tutari 7.000 TL uzeri ve banka kaydi yok',
      'Odeme tarihi ile fatura tarihi arasinda 6 aydan fazla sure',
      'Cek/senet kaydi olmadan "vadeli" odeme',
      'Kasa hesabindan yuksek tutarli odeme cikisi',
    ],
    riskPuani: 75,
    aksiyon: 'BILGI_ISTEME',
    suresi: '15 gun',
    mevzuat: ['VUK 232', 'VUK 234', 'VUK 359'],
    ornekler: [
      "150.000 TL'lik fatura icin banka hareketi yok, kasadan odeme kaydi var",
    ],
  },

  'KRG-07': {
    id: 'KRG-07',
    ad: 'Karsilikli Odeme Dongusu',
    aciklama:
      'Ayni firmalarla karsilikli ve denk tutarlarda odeme yapilmasi.',
    tetikleyiciler: [
      'A firmasina odeme, ayni gun A firmasindan tahsilat (ciro)',
      'Donguse odeme zinciri: A→B→C→A',
      'Iliskili firmalar arasinda mahsuplasma yogunlugu',
    ],
    riskPuani: 80,
    aksiyon: 'IZAHA_DAVET',
    suresi: '30 gun',
    mevzuat: ['VUK 359', 'KVK 13'],
    ornekler: [
      "A Ltd. B'ye 1 milyon TL odemis, ayni gun B'den 950 bin TL tahsil etmis",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // KARLILIK VE BEYAN
  // ═══════════════════════════════════════════════════════════════════

  'KRG-08': {
    id: 'KRG-08',
    ad: 'Sektorel Karlilik Anomalisi',
    aciklama:
      'Karlilik oraninin sektor ortalamasindan anormal dusuk olmasi.',
    tetikleyiciler: [
      "Brut kar marji sektor ortalamasinin %25'inin altinda",
      "Net kar marji %1'in altinda (enflasyonist donemde)",
      '3 yil ust uste zarar beyani',
      'Ciro artarken kar azalmasi (ters oranti)',
    ],
    riskPuani: 65,
    aksiyon: 'TAKIP',
    suresi: null,
    mevzuat: ['VUK 134', 'KVK 6'],
    ornekler: ['Sektor ortalamasi %20 brut kar iken firma %3 brut kar beyan etmis'],
  },

  'KRG-09': {
    id: 'KRG-09',
    ad: 'Beyan-Yasam Standardi Uyumsuzlugu',
    aciklama:
      'Beyan edilen gelir ile mukellef/ortaklarin yasam standardi arasindaki uyumsuzluk.',
    tetikleyiciler: [
      'Dusuk gelir beyani ancak luks arac sahipligi',
      'Yuksek tutarli gayrimenkul alimi, dusuk gelir beyani',
      'Yurt disi seyahat harcamalari ile beyan uyumsuzlugu',
      'Ortaklarin kisisel harcamalari ile sirket kari uyumsuzlugu',
    ],
    riskPuani: 70,
    aksiyon: 'BILGI_ISTEME',
    suresi: '15 gun',
    mevzuat: ['VUK 134', 'GVK 30'],
    ornekler: [
      "Sirket 3 yildir zarar beyan ediyor, ortak 2 milyon TL'lik arac almis",
    ],
  },

  'KRG-10': {
    id: 'KRG-10',
    ad: 'KDV Beyan-Fatura Uyumsuzlugu',
    aciklama:
      'KDV beyannamesi matrahi ile e-fatura/e-arsiv toplamlari arasindaki fark.',
    tetikleyiciler: [
      'KDV beyan matrahi < e-Fatura satis toplami',
      'KDV beyan matrahi > e-Fatura satis toplami (asiri)',
      'e-Arsiv faturalari KDV beyannamesine dahil edilmemis',
      'Ihracat faturalari ile gumruk beyani uyumsuzlugu',
    ],
    riskPuani: 85,
    aksiyon: 'IZAHA_DAVET',
    suresi: '30 gun',
    mevzuat: ['KDVK 29', 'VUK 341', 'VUK 344'],
    ornekler: ['e-Fatura toplami 5 milyon TL, KDV beyani matrahi 4.2 milyon TL'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // KDV IADE
  // ═══════════════════════════════════════════════════════════════════

  'KRG-11': {
    id: 'KRG-11',
    ad: 'Riskli KDV Iade Talebi',
    aciklama:
      'KDV iade talebinde riskli alim veya yuksek yuklenilen KDV tespit edilmesi.',
    tetikleyiciler: [
      'Iade matrahinda riskli satici faturasi bulunmasi',
      'Yuklenilen KDV orani sektor ortalamasinin 2 kati',
      "Iade orani (Iade/Satis) %80'in uzerinde",
      'Ihracat bedeli ile gumruk beyani uyumsuzlugu',
      'Yurt disi musteri adresi dogrulanamıyor',
    ],
    riskPuani: 90,
    aksiyon: 'INCELEME',
    suresi: 'Derhal',
    mevzuat: ['KDVK 32', 'KDV Genel Uygulama Tebligi'],
    ornekler: [
      'Ihracat iadesi talep eden firma, riskli saticidan %60 alim yapmis',
    ],
  },

  'KRG-12': {
    id: 'KRG-12',
    ad: 'Indirilecek KDV Anomalisi',
    aciklama: 'Indirilecek KDV tutarinin olagandisi yuksek olmasi.',
    tetikleyiciler: [
      'Indirilecek KDV > Hesaplanan KDV x 1.5 (surekli)',
      'Devreden KDV surekli artiyor, satislar sabit',
      'Yatirim donemi degilken yuksek indirilecek KDV',
    ],
    riskPuani: 70,
    aksiyon: 'BILGI_ISTEME',
    suresi: '15 gun',
    mevzuat: ['KDVK 29', 'KDVK 36'],
    ornekler: ['Sirket 2 yildir devreden KDV beyan ediyor, hic odeme yapmamis'],
  },

  // ═══════════════════════════════════════════════════════════════════
  // DONEM SONU ISLEMLERI
  // ═══════════════════════════════════════════════════════════════════

  'KRG-13': {
    id: 'KRG-13',
    ad: 'Donem Sonu Anormal Hareketler',
    aciklama:
      'Aralik ayinda olagandisi yuksek alis/satis veya gider kaydi.',
    tetikleyiciler: [
      'Aralik alislari > Yil ortalamasi x 3',
      "Son hafta faturalari > Yil toplaminin %20'si",
      'Donem sonu ani gider artisi',
      '31 Aralik tarihli toplu faturalar',
    ],
    riskPuani: 75,
    aksiyon: 'BILGI_ISTEME',
    suresi: '15 gun',
    mevzuat: ['VUK 219', 'VUK 359', 'KVK 6'],
    ornekler: [
      "Yillik ortalama 200 bin TL/ay alis, Aralik'ta 2 milyon TL alis",
    ],
  },

  'KRG-14': {
    id: 'KRG-14',
    ad: 'Komisyon/Hizmet Faturasi Riski',
    aciklama:
      'Yil sonlarinda komisyon, danismanlik veya hizmet adi altinda duzenlenen faturalar.',
    tetikleyiciler: [
      'Aralik ayinda yuksek tutarli komisyon faturasi',
      'Sozlesme olmadan hizmet faturasi',
      'Iliskili firmaya hizmet faturasi (donem sonu)',
      'Hizmet icerigi belirsiz faturalar',
    ],
    riskPuani: 80,
    aksiyon: 'IZAHA_DAVET',
    suresi: '30 gun',
    mevzuat: ['VUK 227', 'VUK 359', 'KVK 13'],
    ornekler: [
      "31 Aralik'ta 500 bin TL \"danismanlik hizmeti\" faturasi, sozlesme yok",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // E-DEFTER VE E-BELGE
  // ═══════════════════════════════════════════════════════════════════

  'KRG-15': {
    id: 'KRG-15',
    ad: 'E-Defter Berat Gecikmesi',
    aciklama: 'E-defter beratinin yasal suresinde yuklenmemesi.',
    tetikleyiciler: [
      'Berat yukleme suresi asilmis',
      'Duzeltme berati cok sik yuklenmis',
      'Berat tutarlari ile beyanname uyumsuz',
    ],
    riskPuani: 60,
    aksiyon: 'TAKIP',
    suresi: null,
    mevzuat: ['VUK 175', '1 Sira No.lu Elektronik Defter Genel Tebligi'],
    ornekler: ['Son 6 ayin beratlari 3 ay gecikmeli yuklenmis'],
  },

  'KRG-16': {
    id: 'KRG-16',
    ad: 'E-Fatura Iptal/Duzeltme Yogunlugu',
    aciklama: 'E-fatura iptal veya duzeltme oraninin yuksek olmasi.',
    tetikleyiciler: [
      'Iptal edilen fatura orani > %10',
      'Ayni musteriye cok sayida iptal/yeniden duzenleme',
      'Donem sonu iptal yogunlugu',
    ],
    riskPuani: 65,
    aksiyon: 'TAKIP',
    suresi: null,
    mevzuat: ['VUK 227', 'e-Fatura Uygulamasi'],
    ornekler: ["Yilda 1000 fatura duzenlenmis, 150'si iptal edilmis"],
  },
};

// KURGAN senaryolarini risk puanina gore sirala
export const getKurganSenaryolariByRisk = (): KurganSenaryo[] => {
  return Object.values(KURGAN_SCENARIOS).sort((a, b) => b.riskPuani - a.riskPuani);
};

// Aksiyon tipine gore senaryolari getir
export const getKurganSenaryolariByAksiyon = (
  aksiyon: KurganAksiyon
): KurganSenaryo[] => {
  return Object.values(KURGAN_SCENARIOS).filter((s) => s.aksiyon === aksiyon);
};

// KURGAN istatistikleri
export const KURGAN_ISTATISTIK = {
  toplamSenaryo: Object.keys(KURGAN_SCENARIOS).length,
  incelemeAksiyon: Object.values(KURGAN_SCENARIOS).filter(
    (s) => s.aksiyon === 'INCELEME'
  ).length,
  izahaDavetAksiyon: Object.values(KURGAN_SCENARIOS).filter(
    (s) => s.aksiyon === 'IZAHA_DAVET'
  ).length,
  bilgiIstemeAksiyon: Object.values(KURGAN_SCENARIOS).filter(
    (s) => s.aksiyon === 'BILGI_ISTEME'
  ).length,
  takipAksiyon: Object.values(KURGAN_SCENARIOS).filter(
    (s) => s.aksiyon === 'TAKIP'
  ).length,
  ortalamaRiskPuani: Math.round(
    Object.values(KURGAN_SCENARIOS).reduce((sum, s) => sum + s.riskPuani, 0) /
      Object.keys(KURGAN_SCENARIOS).length
  ),
};

// KURGAN aksiyon aciklamalari
export const KURGAN_AKSIYON_ACIKLAMALARI: Record<
  KurganAksiyon,
  { ad: string; aciklama: string; sure: string; onem: string }
> = {
  TAKIP: {
    ad: 'Takip',
    aciklama: 'Sistem izliyor, henuz aksiyon yok. Risk devam ederse seviye yukselir.',
    sure: 'Suresiz',
    onem: 'Dusuk',
  },
  BILGI_ISTEME: {
    ad: 'Bilgi Isteme',
    aciklama:
      "VDK'dan e-tebligat ile bilgi/belge istenir. Suresi icinde yanit verilmeli.",
    sure: '15 gun',
    onem: 'Orta',
  },
  IZAHA_DAVET: {
    ad: 'Izaha Davet',
    aciklama:
      'VUK 370 kapsaminda izahat istenir. Yeterli izahat verilmezse incelemeye sevk.',
    sure: '30 gun',
    onem: 'Yuksek',
  },
  INCELEME: {
    ad: 'Vergi Incelemesi',
    aciklama: 'Dogrudan vergi incelemesine sevk. Vergi mufettisi gorevlendirilir.',
    sure: 'Derhal',
    onem: 'Kritik',
  },
};
