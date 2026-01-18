/**
 * LYNTOS V2 - Donem Verisi Tip Sistemi
 * TAM OTOMASYON icin tasarlandi
 */

// ═══════════════════════════════════════════════════════════════════
// DOSYA ALGILAMA
// ═══════════════════════════════════════════════════════════════════

export type DetectedFileType =
  // Excel Dosyalari
  | 'MIZAN_EXCEL'
  | 'YEVMIYE_EXCEL'
  | 'KEBIR_EXCEL'
  | 'HESAP_PLANI_EXCEL'
  | 'BILANCO_EXCEL'
  | 'GELIR_TABLOSU_EXCEL'
  | 'SGK_APHB_EXCEL'            // SGK Aylik Prim Hizmet Belgesi
  | 'SGK_EKSIK_GUN_EXCEL'       // SGK Eksik Gun Bildirimi

  // e-Defter (XML)
  | 'E_DEFTER_YEVMIYE_XML'
  | 'E_DEFTER_KEBIR_XML'
  | 'E_DEFTER_BERAT_XML'
  | 'E_DEFTER_RAPOR_XML'

  // e-Belgeler (XML)
  | 'E_FATURA_XML'
  | 'E_ARSIV_XML'
  | 'E_IRSALIYE_XML'
  | 'E_SMM_XML'

  // Banka Ekstreleri
  | 'BANKA_EKSTRE_CSV'
  | 'BANKA_EKSTRE_EXCEL'

  // Beyanname PDF'leri
  | 'KDV_BEYANNAME_PDF'
  | 'KDV_TAHAKKUK_PDF'
  | 'MUHTASAR_BEYANNAME_PDF'
  | 'MUHTASAR_TAHAKKUK_PDF'
  | 'GECICI_VERGI_BEYANNAME_PDF'
  | 'GECICI_VERGI_TAHAKKUK_PDF'
  | 'KURUMLAR_VERGISI_PDF'
  | 'DAMGA_VERGISI_PDF'
  | 'POSET_BEYANNAME_PDF'
  | 'POSET_TAHAKKUK_PDF'

  // Diger PDF'ler
  | 'VERGI_LEVHASI_PDF'
  | 'SGK_APHB_PDF'
  | 'SGK_EKSIK_GUN_PDF'

  // Bilinmeyen
  | 'UNKNOWN';

export interface DetectedFile {
  id: string;
  originalPath: string;
  fileName: string;
  fileType: DetectedFileType;
  fileExtension: string;
  fileSize: number;
  confidence: number;            // 0-100
  detectionMethod: 'content' | 'filename' | 'structure';
  metadata: {
    vkn?: string;
    donem?: string;              // "2025-01" veya "2025-Q1"
    ay?: string;                 // "Ocak", "Subat", "Mart"
    banka?: string;              // "YKB", "Akbank" vb.
    bankaAdi?: string;           // "Yapi Kredi Bankasi" vb.
    muhasebeKodu?: string;       // "102.01", "102.19" vb.
    beratTipi?: 'Y' | 'K' | 'YB' | 'KB' | 'DR';
    gibOnayli?: boolean;
    faturaTipi?: 'SATIS' | 'ALIS';
    belgeNo?: string;
  };
  rawContent?: ArrayBuffer;
  parseResult?: unknown;
  parseError?: string;
}

// ═══════════════════════════════════════════════════════════════════
// MIZAN VERISI
// ═══════════════════════════════════════════════════════════════════

export interface MizanHesap {
  hesapKodu: string;
  hesapAdi: string;
  paraBirimi: string;
  borc: number;
  alacak: number;
  borcBakiye: number;
  alacakBakiye: number;
  bakiye: number;                // borcBakiye - alacakBakiye
  bakiyeYonu: 'B' | 'A';
}

export interface ParsedMizan {
  firmaAdi: string;
  vkn?: string;
  donem: string;
  tarihAraligi: {
    baslangic: string;
    bitis: string;
  };
  hesaplar: MizanHesap[];
  toplamlar: {
    borc: number;
    alacak: number;
    borcBakiye: number;
    alacakBakiye: number;
  };
  grupToplamlar: {
    donenVarliklar: number;      // 1xx
    duranVarliklar: number;      // 2xx
    kisaVadeliYK: number;        // 3xx
    uzunVadeliYK: number;        // 4xx
    ozKaynak: number;            // 5xx
    gelirler: number;            // 6xx
    giderler: number;            // 7xx
  };
  parseInfo: {
    kaynak: string;
    parseTarihi: string;
    satirSayisi: number;
  };
}

// ═══════════════════════════════════════════════════════════════════
// YEVMIYE DEFTERI
// ═══════════════════════════════════════════════════════════════════

export interface YevmiyeSatir {
  hesapKodu: string;
  hesapAdi: string;
  aciklama: string;
  detay?: string;
  borc: number;
  alacak: number;
}

export interface YevmiyeKayit {
  fisNo: number;
  tarih: string;
  aciklama: string;
  satirlar: YevmiyeSatir[];
  borcToplam: number;
  alacakToplam: number;
}

export interface ParsedYevmiye {
  firmaAdi: string;
  vkn?: string;
  donem: string;
  tarihAraligi: {
    baslangic: string;
    bitis: string;
  };
  kayitlar: YevmiyeKayit[];
  toplamlar: {
    kayitSayisi: number;
    borcToplam: number;
    alacakToplam: number;
  };
  parseInfo: {
    kaynak: string;
    parseTarihi: string;
  };
}

// ═══════════════════════════════════════════════════════════════════
// KEBIR DEFTERI
// ═══════════════════════════════════════════════════════════════════

export interface KebirHareket {
  tarih: string;
  maddeNo: number;
  fisNo: number;
  evrakNo: string;
  evrakTarihi: string;
  hesapKodu: string;
  hesapAdi: string;
  aciklama: string;
  borc: number;
  alacak: number;
  bakiye: number;
  bakiyeYonu: 'B' | 'A';
}

export interface KebirHesapOzet {
  anaHesapKodu: string;
  anaHesapAdi: string;
  hareketler: KebirHareket[];
  borcToplam: number;
  alacakToplam: number;
  sonBakiye: number;
}

export interface ParsedKebir {
  firmaAdi: string;
  vkn?: string;
  donem: string;
  tarihAraligi: {
    baslangic: string;
    bitis: string;
  };
  hesaplar: KebirHesapOzet[];
  toplamlar: {
    hesapSayisi: number;
    hareketSayisi: number;
  };
  parseInfo: {
    kaynak: string;
    parseTarihi: string;
  };
}

// ═══════════════════════════════════════════════════════════════════
// e-DEFTER (XBRL-GL)
// ═══════════════════════════════════════════════════════════════════

export interface EDefterYevmiyeSatir {
  hesapKodu: string;
  altHesapKodu?: string;
  hesapAdi: string;
  tutar: number;
  borcAlacak: 'D' | 'C';
  belgeTipi?: string;
  belgeNo?: string;
  aciklama?: string;
}

export interface EDefterYevmiyeKayit {
  yevmiyeNo: number;
  tarih: string;
  aciklama: string;
  satirlar: EDefterYevmiyeSatir[];
}

export interface ParsedEDefter {
  tip: 'YEVMIYE' | 'KEBIR' | 'BERAT' | 'RAPOR';
  vkn: string;
  donem: string;                 // "202501"
  firmaAdi?: string;
  smmmAdi?: string;
  donemBaslangic: string;
  donemBitis: string;
  kayitlar: EDefterYevmiyeKayit[];
  toplamlar: {
    kayitSayisi: number;
    satirSayisi: number;
  };
  beratBilgisi?: {
    gibOnayli: boolean;
    onayTarihi?: string;
    hash?: string;
  };
  parseInfo: {
    kaynak: string;
    parseTarihi: string;
  };
}

// ═══════════════════════════════════════════════════════════════════
// BANKA EKSTRESI
// ═══════════════════════════════════════════════════════════════════

export type BankaKodu = 'YKB' | 'AKBANK' | 'HALKBANK' | 'ZIRAAT' | 'ALBARAKA' | 'VAKIFBANK' | 'GARANTI' | 'ISBANK' | 'DIGER';

export interface BankaHareket {
  tarih: string;
  aciklama: string;
  tutar: number;                 // + giris, - cikis
  bakiye: number;
  islemKodu?: string;
}

export interface ParsedBankaEkstre {
  banka: BankaKodu;
  bankaAdi: string;
  muhasebeHesapKodu: string;     // "102.01", "102.19" vb.
  hesapNo?: string;
  donem: string;
  hareketler: BankaHareket[];
  toplamlar: {
    giris: number;
    cikis: number;
    acilisBakiye: number;
    kapanisBakiye: number;
    hareketSayisi: number;
  };
  parseInfo: {
    kaynak: string;
    parseTarihi: string;
  };
}

// ═══════════════════════════════════════════════════════════════════
// KDV BEYANNAME
// ═══════════════════════════════════════════════════════════════════

export interface KDVMatrahDetay {
  oran: number;                  // 1, 10, 20
  matrah: number;
  kdv: number;
}

export interface ParsedKDVBeyanname {
  tip: 'BEYANNAME' | 'TAHAKKUK';
  vkn: string;
  vergiDairesi: string;
  donem: {
    yil: number;
    ay: number;
    ayAdi: string;
  };
  onayZamani?: string;
  matrahlar: KDVMatrahDetay[];
  matrahToplam: number;
  hesaplananKDV: number;
  indirimler: {
    oncekiDonemDevir: number;
    yurticiAlimlar: number;
    digerIndirimler: number;
    toplam: number;
  };
  sonuc: {
    odenecekKDV: number;
    devredenKDV: number;
    iadeKDV: number;
  };
  digerBilgiler: {
    krediKartiTahsilat?: number;
    teslimHizmetBedeli?: number;
  };
  parseInfo: {
    kaynak: string;
    parseTarihi: string;
  };
}

// ═══════════════════════════════════════════════════════════════════
// MUHTASAR BEYANNAME
// ═══════════════════════════════════════════════════════════════════

export interface MuhtasarOdeme {
  turKodu: string;               // "011", "012", "014", "302"
  gayrisafiTutar: number;
  kesintiTutar: number;
}

export interface MuhtasarCalisanBilgi {
  tip: 'ASGARI_UCRETLI' | 'DIGER_UCRETLI';
  calisanSayisi: number;
  muafSayisi: number;
  gelirVergisiMatrahi: number;
  gelirVergisiKesintisi: number;
  asgariUcretIstisnasi: number;
  damgaVergisiKesintisi: number;
}

export interface ParsedMuhtasar {
  tip: 'BEYANNAME' | 'TAHAKKUK';
  vkn: string;
  vergiDairesi: string;
  donem: {
    yil: number;
    ay: number;
    ayAdi: string;
  };
  onayZamani?: string;
  odemeler: MuhtasarOdeme[];
  odemelerToplam: {
    gayrisafiTutar: number;
    kesintiTutar: number;
  };
  damgaVergisi: number;
  calisanlar: MuhtasarCalisanBilgi[];
  toplamCalisan: number;
  parseInfo: {
    kaynak: string;
    parseTarihi: string;
  };
}

// ═══════════════════════════════════════════════════════════════════
// GECICI VERGI BEYANNAME
// ═══════════════════════════════════════════════════════════════════

export interface ParsedGeciciVergi {
  tip: 'BEYANNAME' | 'TAHAKKUK';
  vkn: string;
  vergiDairesi: string;
  donem: {
    yil: number;
    ceyrek: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  };
  onayZamani?: string;
  matrah: number;
  hesaplananVergi: number;
  oncekiDonemlerMahsup: number;
  odenecekVergi: number;
  parseInfo: {
    kaynak: string;
    parseTarihi: string;
  };
}

// ═══════════════════════════════════════════════════════════════════
// TAHAKKUK
// ═══════════════════════════════════════════════════════════════════

export interface TahakkukKalemi {
  vergiKodu: string;
  vergiAdi: string;
  matrah: number;
  tahakkukEden: number;
  mahsupEdilen: number;
  odenecek: number;
  vade: string;
}

export interface ParsedTahakkuk {
  vkn: string;
  unvan: string;
  vergiDairesi: string;
  tahakkukNo: string;
  kabulTarihi: string;
  donem: string;
  kalemler: TahakkukKalemi[];
  toplam: number;
  parseInfo: {
    kaynak: string;
    parseTarihi: string;
  };
}

// ═══════════════════════════════════════════════════════════════════
// VERGI LEVHASI
// ═══════════════════════════════════════════════════════════════════

export interface VergiLevhasiYillik {
  yil: number;
  matrah: number;
  vergi: number;
  onayKodu?: string;
}

export interface ParsedVergiLevhasi {
  vkn: string;
  tcKimlikNo?: string;
  unvan: string;
  vergiDairesi: string;
  adres: string;
  vergiTuru: string;
  faaliyetKodu: string;
  faaliyetAdi: string;
  iseBaslamaTarihi: string;
  yillikVeriler: VergiLevhasiYillik[];
  parseInfo: {
    kaynak: string;
    parseTarihi: string;
  };
}

// ═══════════════════════════════════════════════════════════════════
// BIRLESIK DONEM VERISI
// ═══════════════════════════════════════════════════════════════════

export interface DonemVerisi {
  // Meta
  id: string;
  olusturmaTarihi: string;
  kaynakDosya: string;           // "Q1.zip"

  // Mukellef
  mukellef: {
    vkn: string;
    unvan: string;
    vergiDairesi: string;
    adres?: string;
    faaliyetKodu?: string;
    faaliyetAdi?: string;
  };

  // Donem
  yil: number;
  ceyrek: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  aylar: number[];               // [1, 2, 3] for Q1

  // Veriler
  mizan: ParsedMizan | null;
  yevmiye: ParsedYevmiye | null;
  kebir: ParsedKebir | null;
  eDefter: ParsedEDefter[];
  bankaEkstreleri: ParsedBankaEkstre[];

  // Beyannameler
  kdvBeyannameleri: ParsedKDVBeyanname[];
  muhtasarBeyannameleri: ParsedMuhtasar[];
  geciciVergi: ParsedGeciciVergi | null;

  // Tahakkuklar
  tahakkuklar: ParsedTahakkuk[];

  // Vergi Levhasi
  vergiLevhasi: ParsedVergiLevhasi | null;

  // Dosya Listesi
  algilananDosyalar: DetectedFile[];
  parseEdilenDosyalar: string[];
  parseHatalari: { dosya: string; hata: string }[];

  // Durum
  durum: 'YUKLENIYOR' | 'PARSE_EDILIYOR' | 'ANALIZ_EDILIYOR' | 'TAMAMLANDI' | 'HATA';
  tamamlanmaYuzdesi: number;
}

// ═══════════════════════════════════════════════════════════════════
// CAPRAZ KONTROL SONUCLARI
// ═══════════════════════════════════════════════════════════════════

export type CrossCheckSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type CrossCheckStatus = 'PASSED' | 'WARNING' | 'FAILED' | 'SKIPPED';

export interface CrossCheckResult {
  id: string;
  name: string;
  description: string;
  status: CrossCheckStatus;
  severity: CrossCheckSeverity;
  details: {
    expected?: number;
    actual?: number;
    difference?: number;
    differencePercent?: number;
    note?: string;
  };
  sources: {
    kaynak1: string;             // "Mizan 191"
    kaynak2: string;             // "KDV Beyanname - Indirilecek KDV"
  };
  mevzuat?: string[];
}

export interface CrossCheckReport {
  donemId: string;
  kontrolTarihi: string;
  sonuclar: CrossCheckResult[];
  ozet: {
    toplam: number;
    gecti: number;
    uyari: number;
    basarisiz: number;
    atlandi: number;
  };
  riskSkoru: number;
  riskSeviyesi: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
