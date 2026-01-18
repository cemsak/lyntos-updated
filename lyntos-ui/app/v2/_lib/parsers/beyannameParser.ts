/**
 * LYNTOS Beyanname Parser
 * =======================
 * TUM VERGI BEYANNAMELERINI KAPSAR
 *
 * Desteklenen Beyanname Turleri:
 * 1. KDV-1 Beyannamesi (Aylik)
 * 2. KDV-2 Beyannamesi (3 Aylik, Basit Usul)
 * 3. Muhtasar Beyanname
 * 4. Muhtasar ve Prim Hizmet Beyannamesi (MPHB)
 * 5. Gecici Vergi Beyannamesi - Kurumlar
 * 6. Gecici Vergi Beyannamesi - Gelir
 * 7. Kurumlar Vergisi Beyannamesi (Yillik)
 * 8. Gelir Vergisi Beyannamesi (Yillik)
 * 9. Damga Vergisi Beyannamesi
 * 10. OTV Beyannamesi
 *
 * Format: PDF (GIB e-Beyanname ciktisi)
 */

// ============================================================================
// TIP TANIMLARI
// ============================================================================

export type BeyannameTuru =
  | 'KDV1'
  | 'KDV2'
  | 'MUHTASAR'
  | 'MPHB'
  | 'GECICI_VERGI_KURUMLAR'
  | 'GECICI_VERGI_GELIR'
  | 'KURUMLAR_VERGISI'
  | 'GELIR_VERGISI'
  | 'DAMGA_VERGISI'
  | 'OTV';

// -----------------------------------------------------------------------------
// ORTAK TIPLER
// -----------------------------------------------------------------------------

export interface BeyannameMukellef {
  vkn: string;
  tckn?: string;
  unvan: string;
  vergiDairesi: string;
  vergiDairesiKodu?: string;
  adres?: string;
  telefon?: string;
  email?: string;
}

export interface BeyannameDonem {
  yil: number;
  ay?: number;
  ayAdi?: string;
  ceyrek?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  baslangicTarihi?: string;
  bitisTarihi?: string;
}

export interface BeyannameBilgi {
  onayNo?: string;
  onayTarihi?: string;
  beyanTarihi: string;
  duzeltmeNo: number;
  versiyon?: string;
}

// -----------------------------------------------------------------------------
// KDV BEYANNAMESI
// -----------------------------------------------------------------------------

export interface KDVMatrah {
  oran: number;                    // 1, 10, 20 (veya eski: 1, 8, 18)
  matrah: number;
  kdvTutari: number;
}

export interface KDVTevkifat {
  kod: string;
  aciklama: string;
  matrah: number;
  oran: string;                    // "2/10", "5/10", "9/10"
  kdvTutari: number;
  tevkifatTutari: number;
}

export interface KDVIstisna {
  kod: string;
  aciklama: string;
  tutar: number;
}

export interface KDVIndirim {
  oncekiDonemDevreden: number;
  yurticiAlislar: number;
  ithalat: number;
  atiklardan: number;
  digerIndirimler: number;
  toplam: number;
}

export interface KDVSonuc {
  hesaplananKDV: number;
  ilaveTarhEdilecek: number;
  toplamKDV: number;
  indirilecekKDV: number;
  fark: number;
  odenecekKDV: number;
  iadeEdilecekKDV: number;
  sonrakiDonemeDevreden: number;
}

export interface ParsedKDVBeyannameFull {
  tur: 'KDV1' | 'KDV2';
  mukellef: BeyannameMukellef;
  donem: BeyannameDonem;
  beyanname: BeyannameBilgi;

  // Teslim ve Hizmetler
  teslimler: {
    vergiliIslemler: number;
    istisnalarDahilIslemler: number;
    ozelMatrahli: number;
    teslimlerToplam: number;
  };

  // Matrahlar
  matrahlar: KDVMatrah[];

  // Tevkifatlar
  tevkifatlar: KDVTevkifat[];

  // Istisnalar
  istisnalar: KDVIstisna[];

  // Indirimler
  indirimler: KDVIndirim;

  // Sonuc
  sonuc: KDVSonuc;

  // Ek Bilgiler
  ekBilgiler: {
    krediKartiTahsilat?: number;
    internetSatislari?: number;
    ihracKayitliTeslim?: number;
  };

  parseInfo: {
    kaynak: string;
    parseTarihi: string;
  };
}

// -----------------------------------------------------------------------------
// MUHTASAR / MPHB BEYANNAMESI
// -----------------------------------------------------------------------------

export interface BeyannameOdemeKalemi {
  odemeKodu: string;              // 011, 012, 015, 017, 021, vb.
  odemeAdi: string;
  kismiSayisi: number;
  brutTutar: number;
  vergiMatrahi: number;
  gelirVergisi: number;
}

export interface BeyannameCalisanBilgi {
  tip: 'ASGARI' | 'DIGER';
  calisanSayisi: number;
  brutUcretToplam: number;
  sgkMatrahi: number;
  gelirVergisiMatrahi: number;
  gelirVergisi: number;
  damgaVergisi: number;
  asgariUcretIstisnasi: number;
  engelliIndirimi: number;
}

export interface BeyannameSGKBilgi {
  primGunu: number;
  sgkMatrahi: number;
  isciPayi: number;
  isverenPayi: number;
  issizlikIsci: number;
  issizlikIsveren: number;
  toplamPrim: number;
  tesvikTutari: number;
  odenecekPrim: number;
}

export interface ParsedMuhtasarBeyannameFull {
  tur: 'MUHTASAR' | 'MPHB';
  mukellef: BeyannameMukellef;
  donem: BeyannameDonem;
  beyanname: BeyannameBilgi;

  // Odemeler (Stopaj)
  odemeler: BeyannameOdemeKalemi[];

  // Calisan Bilgileri (MPHB)
  calisanlar: BeyannameCalisanBilgi[];

  // SGK Bilgileri (MPHB)
  sgk?: BeyannameSGKBilgi;

  // Toplamlar
  toplamlar: {
    brutOdemelerToplam: number;
    gelirVergisiToplam: number;
    damgaVergisiToplam: number;
    sgkPrimToplam?: number;
    genelToplam: number;
  };

  parseInfo: {
    kaynak: string;
    parseTarihi: string;
  };
}

// -----------------------------------------------------------------------------
// GECICI VERGI BEYANNAMESI
// -----------------------------------------------------------------------------

export interface GelirGiderKalemi {
  kod: string;
  aciklama: string;
  tutar: number;
}

export interface ParsedGeciciVergiBeyannameFull {
  tur: 'GECICI_VERGI_KURUMLAR' | 'GECICI_VERGI_GELIR';
  mukellef: BeyannameMukellef;
  donem: BeyannameDonem;
  beyanname: BeyannameBilgi;

  // Gelir-Gider Tablosu
  gelirler: GelirGiderKalemi[];
  giderler: GelirGiderKalemi[];

  // Kar/Zarar
  karZarar: {
    hasilat: number;
    maliyetler: number;
    brutKar: number;
    faaliyetGiderleri: number;
    faaliyetKari: number;
    digerGelirler: number;
    digerGiderler: number;
    finansmanGiderleri: number;
    donemKariZarari: number;
  };

  // Matrah Hesaplama
  matrahHesaplama: {
    ticariBilancoKari: number;
    kkegToplam: number;              // Kanunen Kabul Edilmeyen Giderler
    indirimler: number;
    istisnalar: number;
    gecmisYilZararlari: number;
    matrah: number;
  };

  // Vergi Hesaplama
  vergiHesaplama: {
    matrah: number;
    vergiOrani: number;              // %25 (Kurumlar), Dilimli (Gelir)
    hesaplananVergi: number;
    oncekiDonemlerMahsup: number;
    odenecekVergi: number;
  };

  parseInfo: {
    kaynak: string;
    parseTarihi: string;
  };
}

// -----------------------------------------------------------------------------
// KURUMLAR VERGISI BEYANNAMESI (YILLIK)
// -----------------------------------------------------------------------------

export interface ParsedKurumlarVergisiBeyanname {
  tur: 'KURUMLAR_VERGISI';
  mukellef: BeyannameMukellef;
  donem: BeyannameDonem;
  beyanname: BeyannameBilgi;

  // Bilanco
  bilanco: {
    aktifToplam: number;
    pasifToplam: number;
    ozSermaye: number;
    donemKari: number;
  };

  // Gelir Tablosu
  gelirTablosu: {
    netSatislar: number;
    satisMaliyeti: number;
    brutKar: number;
    faaliyetGiderleri: number;
    faaliyetKari: number;
    digerGelirler: number;
    digerGiderler: number;
    finansmanGiderleri: number;
    donemKari: number;
  };

  // Matrah
  matrah: {
    ticariBilancoKari: number;
    kkegToplam: number;
    indirimler: number;
    istisnalar: number;
    arGeSatisIndirimi: number;
    gecmisYilZararlari: number;
    matrah: number;
  };

  // Vergi
  vergi: {
    matrah: number;
    vergiOrani: number;              // %25
    hesaplananVergi: number;
    geciciVergiMahsup: number;
    stopajMahsup: number;
    odenecekVergi: number;
    iadeVergi: number;
  };

  parseInfo: {
    kaynak: string;
    parseTarihi: string;
  };
}

// -----------------------------------------------------------------------------
// GELIR VERGISI BEYANNAMESI (YILLIK)
// -----------------------------------------------------------------------------

export interface ParsedGelirVergisiBeyanname {
  tur: 'GELIR_VERGISI';
  mukellef: BeyannameMukellef;
  donem: BeyannameDonem;
  beyanname: BeyannameBilgi;

  // Gelir Turleri
  gelirler: {
    ticariKazanc: number;
    ziraiKazanc: number;
    ucretGeliri: number;
    serbestMeslek: number;
    gayrimenkulSermaye: number;
    menkulSermaye: number;
    digerKazanc: number;
    toplam: number;
  };

  // Indirimler
  indirimler: {
    sgkPrimi: number;
    ozelSaglik: number;
    egitimSaglik: number;
    bagislar: number;
    digerIndirimler: number;
    toplam: number;
  };

  // Matrah
  matrah: {
    gelirToplam: number;
    indirimlerToplam: number;
    vergiMatrahi: number;
  };

  // Vergi (Dilimli)
  vergi: {
    dilimler: Array<{
      alt: number;
      ust: number;
      oran: number;
      vergi: number;
    }>;
    hesaplananVergi: number;
    geciciVergiMahsup: number;
    stopajMahsup: number;
    odenecekVergi: number;
    iadeVergi: number;
  };

  parseInfo: {
    kaynak: string;
    parseTarihi: string;
  };
}

// -----------------------------------------------------------------------------
// DAMGA VERGISI BEYANNAMESI
// -----------------------------------------------------------------------------

export interface DamgaVergisiKalem {
  kagitTuru: string;
  adet: number;
  tutar: number;
  vergiOrani: number;
  vergiTutari: number;
}

export interface ParsedDamgaVergisiBeyanname {
  tur: 'DAMGA_VERGISI';
  mukellef: BeyannameMukellef;
  donem: BeyannameDonem;
  beyanname: BeyannameBilgi;

  kalemler: DamgaVergisiKalem[];

  toplamlar: {
    nispiVergi: number;             // Oransal damga vergisi
    maktaVergi: number;             // Sabit tutarli damga vergisi
    genelToplam: number;
  };

  parseInfo: {
    kaynak: string;
    parseTarihi: string;
  };
}

// -----------------------------------------------------------------------------
// BIRLESIK TIP
// -----------------------------------------------------------------------------

export type ParsedBeyanname =
  | ParsedKDVBeyannameFull
  | ParsedMuhtasarBeyannameFull
  | ParsedGeciciVergiBeyannameFull
  | ParsedKurumlarVergisiBeyanname
  | ParsedGelirVergisiBeyanname
  | ParsedDamgaVergisiBeyanname;

// ============================================================================
// SABITLER
// ============================================================================

const TURKCE_AYLAR: Record<number, string> = {
  1: 'Ocak', 2: 'Subat', 3: 'Mart', 4: 'Nisan',
  5: 'Mayis', 6: 'Haziran', 7: 'Temmuz', 8: 'Agustos',
  9: 'Eylul', 10: 'Ekim', 11: 'Kasim', 12: 'Aralik',
};

const MUHTASAR_ODEME_KODLARI: Record<string, string> = {
  '011': 'Ucret Odemeleri',
  '012': 'Serbest Meslek Odemeleri',
  '015': 'Yillara Sari Insaat Hakedis',
  '017': 'Kira Odemeleri (GMSI)',
  '018': 'Kira Odemeleri (Basit Usul)',
  '019': 'Ciftcilere Yapilan Odemeler',
  '021': 'Kar Payi Odemeleri',
  '022': 'Faiz Odemeleri',
  '023': 'Repo Gelirleri',
  '024': 'Mevduat Faizleri',
  '025': 'Hisse Senedi Kar Paylari',
  '031': 'Telif/Patent/Marka',
  '032': 'Sporcu Ucretleri',
  '041': 'Vergiden Muaf Esnaf',
};

// ============================================================================
// YARDIMCI FONKSIYONLAR
// ============================================================================

function parseNumber(value: string | null | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}

function normalizeVKN(vkn: string): string {
  return vkn.replace(/\D/g, '').substring(0, 11);
}

function normalizeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const match = dateStr.match(/(\d{2})[\.\/](\d{2})[\.\/](\d{4})/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return dateStr;
}

function extractValue(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  return match ? match[1]?.trim() : null;
}

function extractNumber(text: string, pattern: RegExp): number {
  return parseNumber(extractValue(text, pattern));
}

function extractDonem(text: string): BeyannameDonem {
  // Ay bazli
  const ayPattern = /(?:donem|vergilendirme)[:\s]*(\w+)[\/\s-]*(\d{4})/i;
  const ayMatch = text.match(ayPattern);
  if (ayMatch) {
    const ayStr = ayMatch[1].toLowerCase();
    const yil = parseInt(ayMatch[2]);
    const ayMap: Record<string, number> = {
      'ocak': 1, 'subat': 2, 'mart': 3, 'nisan': 4,
      'mayis': 5, 'haziran': 6, 'temmuz': 7, 'agustos': 8,
      'eylul': 9, 'ekim': 10, 'kasim': 11, 'aralik': 12,
    };
    const ay = ayMap[ayStr] || parseInt(ayStr);
    if (ay >= 1 && ay <= 12) {
      return { yil, ay, ayAdi: TURKCE_AYLAR[ay] };
    }
  }

  // Ceyrek bazli
  const ceyrekPattern = /(\d{4})[\/\s-]*([1-4])\.?\s*(?:donem|ceyrek)/i;
  const ceyrekMatch = text.match(ceyrekPattern);
  if (ceyrekMatch) {
    const yil = parseInt(ceyrekMatch[1]);
    const ceyrek = parseInt(ceyrekMatch[2]);
    return { yil, ceyrek: `Q${ceyrek}` as 'Q1' | 'Q2' | 'Q3' | 'Q4' };
  }

  // Yillik
  const yilPattern = /(\d{4})\s*(?:yili|takvim\s*yili)/i;
  const yilMatch = text.match(yilPattern);
  if (yilMatch) {
    return { yil: parseInt(yilMatch[1]) };
  }

  return { yil: new Date().getFullYear() };
}

function detectBeyannameTuru(text: string, fileName: string): BeyannameTuru {
  const lowerText = text.toLowerCase();
  const lowerFile = fileName.toLowerCase();

  // KDV
  if (lowerText.includes('kdv-1') || lowerFile.includes('kdv1') ||
      (lowerText.includes('kdv') && lowerText.includes('1 no'))) {
    return 'KDV1';
  }
  if (lowerText.includes('kdv-2') || lowerFile.includes('kdv2') ||
      (lowerText.includes('kdv') && lowerText.includes('basit usul'))) {
    return 'KDV2';
  }

  // Muhtasar / MPHB
  if (lowerText.includes('muhtasar') && lowerText.includes('prim hizmet')) {
    return 'MPHB';
  }
  if (lowerText.includes('muhtasar')) {
    return 'MUHTASAR';
  }

  // Gecici Vergi
  if (lowerText.includes('gecici vergi')) {
    if (lowerText.includes('kurumlar')) return 'GECICI_VERGI_KURUMLAR';
    if (lowerText.includes('gelir')) return 'GECICI_VERGI_GELIR';
    return 'GECICI_VERGI_KURUMLAR';
  }

  // Kurumlar
  if (lowerText.includes('kurumlar vergisi') && !lowerText.includes('gecici')) {
    return 'KURUMLAR_VERGISI';
  }

  // Gelir
  if (lowerText.includes('gelir vergisi') && !lowerText.includes('gecici') && !lowerText.includes('stopaj')) {
    return 'GELIR_VERGISI';
  }

  // Damga
  if (lowerText.includes('damga vergisi')) {
    return 'DAMGA_VERGISI';
  }

  // OTV
  if (lowerText.includes('ozel tuketim') || lowerText.includes('otv')) {
    return 'OTV';
  }

  // Dosya adindan tespit
  if (lowerFile.includes('kdv')) return 'KDV1';
  if (lowerFile.includes('muhtasar')) return 'MUHTASAR';
  if (lowerFile.includes('gecici')) return 'GECICI_VERGI_KURUMLAR';
  if (lowerFile.includes('kurumlar')) return 'KURUMLAR_VERGISI';
  if (lowerFile.includes('gelir')) return 'GELIR_VERGISI';
  if (lowerFile.includes('damga')) return 'DAMGA_VERGISI';

  return 'KDV1';
}

// ============================================================================
// KDV BEYANNAME PARSER
// ============================================================================

export function parseKDVBeyannamePDF(pdfText: string, fileName: string): ParsedKDVBeyannameFull {
  const text = pdfText;
  const tur = detectBeyannameTuru(text, fileName) as 'KDV1' | 'KDV2';

  // Mukellef
  const mukellef: BeyannameMukellef = {
    vkn: normalizeVKN(extractValue(text, /(?:vkn|vergi\s*(?:kimlik)?)[:\s]*(\d{10,11})/i) || ''),
    unvan: extractValue(text, /(?:unvan|mukellef)[:\s]*([^\n]+)/i) || '',
    vergiDairesi: extractValue(text, /(?:vergi\s*dairesi)[:\s]*([^\n]+)/i) || '',
  };

  // Donem
  const donem = extractDonem(text);

  // Beyanname bilgileri
  const beyanname: BeyannameBilgi = {
    onayNo: extractValue(text, /(?:onay|tahakkuk)\s*(?:no)[:\s]*(\S+)/i) || undefined,
    beyanTarihi: normalizeDate(extractValue(text, /(?:beyan|duzenlenme)\s*tarihi[:\s]*(\d{2}[\.\/]\d{2}[\.\/]\d{4})/i)) || new Date().toISOString().split('T')[0],
    duzeltmeNo: extractNumber(text, /duzeltme\s*(?:no)?[:\s]*(\d+)/i),
  };

  // Matrahlar
  const matrahlar: KDVMatrah[] = [];

  // %20 KDV
  const matrah20 = extractNumber(text, /(?:%\s*20|20\s*%).*?(?:matrah|tutar)[:\s]*([\d\.,]+)/i);
  if (matrah20 > 0) {
    matrahlar.push({ oran: 20, matrah: matrah20, kdvTutari: matrah20 * 0.20 });
  }

  // %10 KDV
  const matrah10 = extractNumber(text, /(?:%\s*10|10\s*%).*?(?:matrah|tutar)[:\s]*([\d\.,]+)/i);
  if (matrah10 > 0) {
    matrahlar.push({ oran: 10, matrah: matrah10, kdvTutari: matrah10 * 0.10 });
  }

  // %1 KDV
  const matrah1 = extractNumber(text, /(?:%\s*1|1\s*%)[^0].*?(?:matrah|tutar)[:\s]*([\d\.,]+)/i);
  if (matrah1 > 0) {
    matrahlar.push({ oran: 1, matrah: matrah1, kdvTutari: matrah1 * 0.01 });
  }

  // Hesaplanan KDV
  const hesaplananKDV = matrahlar.reduce((sum, m) => sum + m.kdvTutari, 0) ||
    extractNumber(text, /hesaplanan\s*(?:kdv|vergi)[:\s]*([\d\.,]+)/i);

  // Indirimler
  const oncekiDonemDevreden = extractNumber(text, /(?:onceki|gecen)\s*donem.*?devr[:\s]*([\d\.,]+)/i);
  const yurticiAlislar = extractNumber(text, /yurt\s*ici.*?alis[:\s]*([\d\.,]+)/i);
  const ithalat = extractNumber(text, /ithalat[:\s]*([\d\.,]+)/i);
  const digerIndirimler = extractNumber(text, /diger\s*indirim[:\s]*([\d\.,]+)/i);
  const indirimToplam = oncekiDonemDevreden + yurticiAlislar + ithalat + digerIndirimler ||
    extractNumber(text, /(?:indirilecek|indirim)\s*(?:kdv|toplam)[:\s]*([\d\.,]+)/i);

  // Sonuc
  const odenecekKDV = extractNumber(text, /odenecek\s*(?:kdv|vergi)[:\s]*([\d\.,]+)/i);
  const devredenKDV = extractNumber(text, /(?:sonraki|devreden|devir).*?(?:donem)?[:\s]*([\d\.,]+)/i);

  // Teslimler
  const vergiliToplam = matrahlar.reduce((sum, m) => sum + m.matrah, 0);

  return {
    tur,
    mukellef,
    donem,
    beyanname,
    teslimler: {
      vergiliIslemler: vergiliToplam,
      istisnalarDahilIslemler: 0,
      ozelMatrahli: 0,
      teslimlerToplam: vergiliToplam,
    },
    matrahlar,
    tevkifatlar: [],
    istisnalar: [],
    indirimler: {
      oncekiDonemDevreden,
      yurticiAlislar,
      ithalat,
      atiklardan: 0,
      digerIndirimler,
      toplam: indirimToplam,
    },
    sonuc: {
      hesaplananKDV,
      ilaveTarhEdilecek: 0,
      toplamKDV: hesaplananKDV,
      indirilecekKDV: indirimToplam,
      fark: hesaplananKDV - indirimToplam,
      odenecekKDV,
      iadeEdilecekKDV: 0,
      sonrakiDonemeDevreden: devredenKDV,
    },
    ekBilgiler: {},
    parseInfo: {
      kaynak: fileName,
      parseTarihi: new Date().toISOString(),
    },
  };
}

// ============================================================================
// MUHTASAR BEYANNAME PARSER
// ============================================================================

export function parseMuhtasarBeyannamePDF(pdfText: string, fileName: string): ParsedMuhtasarBeyannameFull {
  const text = pdfText;
  const tur = detectBeyannameTuru(text, fileName) as 'MUHTASAR' | 'MPHB';

  // Mukellef
  const mukellef: BeyannameMukellef = {
    vkn: normalizeVKN(extractValue(text, /(?:vkn|vergi\s*(?:kimlik)?)[:\s]*(\d{10,11})/i) || ''),
    unvan: extractValue(text, /(?:unvan|mukellef)[:\s]*([^\n]+)/i) || '',
    vergiDairesi: extractValue(text, /(?:vergi\s*dairesi)[:\s]*([^\n]+)/i) || '',
  };

  // Donem
  const donem = extractDonem(text);

  // Beyanname bilgileri
  const beyanname: BeyannameBilgi = {
    beyanTarihi: normalizeDate(extractValue(text, /(?:beyan|duzenlenme)\s*tarihi[:\s]*(\d{2}[\.\/]\d{2}[\.\/]\d{4})/i)) || new Date().toISOString().split('T')[0],
    duzeltmeNo: extractNumber(text, /duzeltme[:\s]*(\d+)/i),
  };

  // Odemeler
  const odemeler: BeyannameOdemeKalemi[] = [];

  // Odeme kodlarini ara
  for (const [kod, ad] of Object.entries(MUHTASAR_ODEME_KODLARI)) {
    const pattern = new RegExp(`${kod}[\\s\\-:]+([\\d\\.,]+)[\\s\\-:]+([\\d\\.,]+)`, 'i');
    const match = text.match(pattern);
    if (match) {
      const brutTutar = parseNumber(match[1]);
      const gelirVergisi = parseNumber(match[2]);
      if (brutTutar > 0 || gelirVergisi > 0) {
        odemeler.push({
          odemeKodu: kod,
          odemeAdi: ad,
          kismiSayisi: 1,
          brutTutar,
          vergiMatrahi: brutTutar,
          gelirVergisi,
        });
      }
    }
  }

  // Calisan bilgileri (MPHB icin)
  const calisanlar: BeyannameCalisanBilgi[] = [];

  if (tur === 'MPHB') {
    // Asgari ucretli
    const asgariSayisi = extractNumber(text, /asgari\s*ucretli.*?(\d+)\s*kisi/i);
    const asgariMatrah = extractNumber(text, /asgari.*?matrah[:\s]*([\d\.,]+)/i);
    if (asgariSayisi > 0 || asgariMatrah > 0) {
      calisanlar.push({
        tip: 'ASGARI',
        calisanSayisi: asgariSayisi,
        brutUcretToplam: asgariMatrah,
        sgkMatrahi: asgariMatrah,
        gelirVergisiMatrahi: asgariMatrah,
        gelirVergisi: 0,
        damgaVergisi: 0,
        asgariUcretIstisnasi: 0,
        engelliIndirimi: 0,
      });
    }

    // Diger ucretli
    const digerSayisi = extractNumber(text, /diger\s*ucretli.*?(\d+)\s*kisi/i);
    const digerMatrah = extractNumber(text, /diger.*?ucret.*?matrah[:\s]*([\d\.,]+)/i);
    if (digerSayisi > 0 || digerMatrah > 0) {
      calisanlar.push({
        tip: 'DIGER',
        calisanSayisi: digerSayisi,
        brutUcretToplam: digerMatrah,
        sgkMatrahi: digerMatrah,
        gelirVergisiMatrahi: digerMatrah,
        gelirVergisi: 0,
        damgaVergisi: 0,
        asgariUcretIstisnasi: 0,
        engelliIndirimi: 0,
      });
    }
  }

  // Toplamlar
  const brutOdemelerToplam = odemeler.reduce((sum, o) => sum + o.brutTutar, 0) ||
    extractNumber(text, /(?:brut|gayrisafi).*?toplam[:\s]*([\d\.,]+)/i);
  const gelirVergisiToplam = odemeler.reduce((sum, o) => sum + o.gelirVergisi, 0) ||
    extractNumber(text, /(?:gelir\s*vergisi|stopaj).*?toplam[:\s]*([\d\.,]+)/i);
  const damgaVergisiToplam = extractNumber(text, /damga\s*vergisi.*?toplam[:\s]*([\d\.,]+)/i);

  return {
    tur,
    mukellef,
    donem,
    beyanname,
    odemeler,
    calisanlar,
    toplamlar: {
      brutOdemelerToplam,
      gelirVergisiToplam,
      damgaVergisiToplam,
      genelToplam: gelirVergisiToplam + damgaVergisiToplam,
    },
    parseInfo: {
      kaynak: fileName,
      parseTarihi: new Date().toISOString(),
    },
  };
}

// ============================================================================
// GECICI VERGI BEYANNAME PARSER
// ============================================================================

export function parseGeciciVergiBeyannamePDF(pdfText: string, fileName: string): ParsedGeciciVergiBeyannameFull {
  const text = pdfText;
  const tur = detectBeyannameTuru(text, fileName) as 'GECICI_VERGI_KURUMLAR' | 'GECICI_VERGI_GELIR';

  // Mukellef
  const mukellef: BeyannameMukellef = {
    vkn: normalizeVKN(extractValue(text, /(?:vkn|vergi\s*(?:kimlik)?)[:\s]*(\d{10,11})/i) || ''),
    unvan: extractValue(text, /(?:unvan|mukellef)[:\s]*([^\n]+)/i) || '',
    vergiDairesi: extractValue(text, /(?:vergi\s*dairesi)[:\s]*([^\n]+)/i) || '',
  };

  // Donem (ceyrek bazli)
  const donem = extractDonem(text);

  // Beyanname
  const beyanname: BeyannameBilgi = {
    beyanTarihi: normalizeDate(extractValue(text, /(?:beyan|duzenlenme)\s*tarihi[:\s]*(\d{2}[\.\/]\d{2}[\.\/]\d{4})/i)) || new Date().toISOString().split('T')[0],
    duzeltmeNo: extractNumber(text, /duzeltme[:\s]*(\d+)/i),
  };

  // Kar/Zarar
  const hasilat = extractNumber(text, /(?:hasilat|satis\s*gelirleri)[:\s]*([\d\.,]+)/i);
  const maliyetler = extractNumber(text, /(?:satis\s*maliyeti|maliyet)[:\s]*([\d\.,]+)/i);
  const brutKar = extractNumber(text, /(?:brut\s*kar|brut\s*satis\s*kari)[:\s]*([\d\.,]+)/i) || (hasilat - maliyetler);
  const faaliyetGiderleri = extractNumber(text, /(?:faaliyet\s*giderleri)[:\s]*([\d\.,]+)/i);
  const finansmanGiderleri = extractNumber(text, /(?:finansman\s*giderleri)[:\s]*([\d\.,]+)/i);
  const donemKari = extractNumber(text, /(?:donem\s*kari|net\s*kar)[:\s]*([\d\.,]+)/i);

  // Matrah
  const ticariBilancoKari = extractNumber(text, /(?:ticari\s*bilanco\s*kari)[:\s]*([\d\.,]+)/i) || donemKari;
  const kkeg = extractNumber(text, /(?:kkeg|kanunen\s*kabul\s*edilmeyen)[:\s]*([\d\.,]+)/i);
  const indirimler = extractNumber(text, /(?:indirimler\s*toplami)[:\s]*([\d\.,]+)/i);
  const matrah = extractNumber(text, /(?:vergi\s*matrahi|matrah)[:\s]*([\d\.,]+)/i) || (ticariBilancoKari + kkeg - indirimler);

  // Vergi
  const vergiOrani = tur === 'GECICI_VERGI_KURUMLAR' ? 25 : 15;
  const hesaplananVergi = extractNumber(text, /(?:hesaplanan\s*vergi)[:\s]*([\d\.,]+)/i) || (matrah * vergiOrani / 100);
  const oncekiDonemlerMahsup = extractNumber(text, /(?:onceki\s*donemler|mahsup)[:\s]*([\d\.,]+)/i);
  const odenecekVergi = extractNumber(text, /(?:odenecek\s*vergi)[:\s]*([\d\.,]+)/i) || (hesaplananVergi - oncekiDonemlerMahsup);

  return {
    tur,
    mukellef,
    donem,
    beyanname,
    gelirler: [],
    giderler: [],
    karZarar: {
      hasilat,
      maliyetler,
      brutKar,
      faaliyetGiderleri,
      faaliyetKari: brutKar - faaliyetGiderleri,
      digerGelirler: 0,
      digerGiderler: 0,
      finansmanGiderleri,
      donemKariZarari: donemKari,
    },
    matrahHesaplama: {
      ticariBilancoKari,
      kkegToplam: kkeg,
      indirimler,
      istisnalar: 0,
      gecmisYilZararlari: 0,
      matrah,
    },
    vergiHesaplama: {
      matrah,
      vergiOrani,
      hesaplananVergi,
      oncekiDonemlerMahsup,
      odenecekVergi,
    },
    parseInfo: {
      kaynak: fileName,
      parseTarihi: new Date().toISOString(),
    },
  };
}

// ============================================================================
// DAMGA VERGISI BEYANNAME PARSER
// ============================================================================

export function parseDamgaVergisiBeyannamePDF(pdfText: string, fileName: string): ParsedDamgaVergisiBeyanname {
  const text = pdfText;

  // Mukellef
  const mukellef: BeyannameMukellef = {
    vkn: normalizeVKN(extractValue(text, /(?:vkn|vergi\s*(?:kimlik)?)[:\s]*(\d{10,11})/i) || ''),
    unvan: extractValue(text, /(?:unvan|mukellef)[:\s]*([^\n]+)/i) || '',
    vergiDairesi: extractValue(text, /(?:vergi\s*dairesi)[:\s]*([^\n]+)/i) || '',
  };

  // Donem
  const donem = extractDonem(text);

  // Beyanname
  const beyanname: BeyannameBilgi = {
    beyanTarihi: normalizeDate(extractValue(text, /(?:beyan)\s*tarihi[:\s]*(\d{2}[\.\/]\d{2}[\.\/]\d{4})/i)) || new Date().toISOString().split('T')[0],
    duzeltmeNo: extractNumber(text, /duzeltme[:\s]*(\d+)/i),
  };

  // Toplam damga vergisi
  const nispiVergi = extractNumber(text, /(?:nispi|oransal).*?vergi[:\s]*([\d\.,]+)/i);
  const maktaVergi = extractNumber(text, /(?:makta|sabit).*?vergi[:\s]*([\d\.,]+)/i);
  const genelToplam = extractNumber(text, /(?:toplam\s*damga|odenecek)[:\s]*([\d\.,]+)/i) || (nispiVergi + maktaVergi);

  return {
    tur: 'DAMGA_VERGISI',
    mukellef,
    donem,
    beyanname,
    kalemler: [],
    toplamlar: {
      nispiVergi,
      maktaVergi,
      genelToplam,
    },
    parseInfo: {
      kaynak: fileName,
      parseTarihi: new Date().toISOString(),
    },
  };
}

// ============================================================================
// ANA PARSE FONKSIYONU - OTOMATIK TUR TESPITI
// ============================================================================

export function parseBeyanname(pdfText: string, fileName: string): ParsedBeyanname {
  const tur = detectBeyannameTuru(pdfText, fileName);

  switch (tur) {
    case 'KDV1':
    case 'KDV2':
      return parseKDVBeyannamePDF(pdfText, fileName);

    case 'MUHTASAR':
    case 'MPHB':
      return parseMuhtasarBeyannamePDF(pdfText, fileName);

    case 'GECICI_VERGI_KURUMLAR':
    case 'GECICI_VERGI_GELIR':
      return parseGeciciVergiBeyannamePDF(pdfText, fileName);

    case 'DAMGA_VERGISI':
      return parseDamgaVergisiBeyannamePDF(pdfText, fileName);

    case 'KURUMLAR_VERGISI':
    case 'GELIR_VERGISI':
      return parseGeciciVergiBeyannamePDF(pdfText, fileName);

    default:
      return parseKDVBeyannamePDF(pdfText, fileName);
  }
}

// ============================================================================
// TOPLU PARSE VE ISTATISTIK
// ============================================================================

export function parseMultipleBeyanname(
  files: { pdfText: string; fileName: string }[]
): { success: ParsedBeyanname[]; errors: { fileName: string; error: string }[] } {
  const success: ParsedBeyanname[] = [];
  const errors: { fileName: string; error: string }[] = [];

  for (const file of files) {
    try {
      const parsed = parseBeyanname(file.pdfText, file.fileName);
      success.push(parsed);
    } catch (err) {
      errors.push({
        fileName: file.fileName,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { success, errors };
}

export function getBeyannameStats(beyannameler: ParsedBeyanname[]): {
  toplamBeyanname: number;
  turDagilimi: Record<BeyannameTuru, number>;
  toplamVergi: number;
  donemBazli: Record<string, number>;
} {
  const stats = {
    toplamBeyanname: beyannameler.length,
    turDagilimi: {} as Record<BeyannameTuru, number>,
    toplamVergi: 0,
    donemBazli: {} as Record<string, number>,
  };

  for (const b of beyannameler) {
    // Tur dagilimi
    const tur = 'tur' in b ? b.tur : 'KDV1';
    stats.turDagilimi[tur] = (stats.turDagilimi[tur] || 0) + 1;

    // Toplam vergi
    if ('sonuc' in b && b.sonuc) {
      stats.toplamVergi += (b.sonuc as KDVSonuc).odenecekKDV || 0;
    }
    if ('toplamlar' in b && b.toplamlar && 'genelToplam' in b.toplamlar) {
      stats.toplamVergi += b.toplamlar.genelToplam || 0;
    }
    if ('vergiHesaplama' in b && b.vergiHesaplama) {
      stats.toplamVergi += b.vergiHesaplama.odenecekVergi || 0;
    }

    // Donem bazli
    const donemKey = b.donem.ceyrek
      ? `${b.donem.yil}-${b.donem.ceyrek}`
      : b.donem.ay
        ? `${b.donem.yil}-${String(b.donem.ay).padStart(2, '0')}`
        : `${b.donem.yil}`;
    stats.donemBazli[donemKey] = (stats.donemBazli[donemKey] || 0) + 1;
  }

  return stats;
}
