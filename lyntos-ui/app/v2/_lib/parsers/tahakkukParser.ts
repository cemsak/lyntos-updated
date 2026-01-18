/**
 * LYNTOS Tahakkuk Fişi Parser
 * ===========================
 * GİB Tahakkuk Fişlerini parse eder
 *
 * Desteklenen Tahakkuk Türleri:
 * - KDV Tahakkuku
 * - Muhtasar Tahakkuku
 * - Geçici Vergi Tahakkuku
 * - Kurumlar Vergisi Tahakkuku
 * - Damga Vergisi Tahakkuku
 * - SGK Tahakkuku
 */

// ============================================================================
// TİP TANIMLARI
// ============================================================================

export type TahakkukTuru =
  | 'KDV'
  | 'MUHTASAR'
  | 'GECICI_VERGI'
  | 'KURUMLAR_VERGISI'
  | 'GELIR_VERGISI'
  | 'DAMGA_VERGISI'
  | 'SGK'
  | 'DIGER';

export interface TahakkukFisiKalemi {
  vergiKodu: string;           // 0015 = KDV, 0003 = Gelir Stopaj, vb.
  vergiAdi: string;
  matrah?: number;
  oran?: number;
  tahakkukTutari: number;
  odenecekTutar: number;
  odenenTutar?: number;
  kalanTutar?: number;
}

export interface ParsedTahakkukFisi {
  // Tahakkuk türü
  tur: TahakkukTuru;

  // Mükellef bilgileri
  mukellef: {
    vkn: string;
    tckn?: string;
    unvan: string;
    vergiDairesi: string;
    vergiDairesiKodu?: string;
  };

  // Dönem
  donem: {
    yil: number;
    ay?: number;
    ayAdi?: string;
    ceyrek?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    baslangic?: string;
    bitis?: string;
  };

  // Tahakkuk bilgileri
  tahakkuk: {
    tahakkukNo: string;
    onayNo?: string;
    duzenlenmeTarihi: string;
    vadeTarihi: string;
    sonOdemeTarihi?: string;
  };

  // Vergi kalemleri
  kalemler: TahakkukFisiKalemi[];

  // Toplamlar
  toplamlar: {
    tahakkukToplam: number;
    odenecekToplam: number;
    gecikmeZammi?: number;
    odenenToplam?: number;
    kalanBorc?: number;
  };

  // Ödeme bilgisi
  odeme?: {
    banka?: string;
    hesapNo?: string;
    barkodNo?: string;
  };

  parseInfo: {
    kaynak: string;
    parseTarihi: string;
    format: 'PDF';
  };
}

// ============================================================================
// SABİTLER
// ============================================================================

const VERGI_KODLARI: Record<string, { tur: TahakkukTuru; ad: string }> = {
  '0001': { tur: 'GELIR_VERGISI', ad: 'Yıllık Gelir Vergisi' },
  '0002': { tur: 'GELIR_VERGISI', ad: 'Zırai Kazanç Gelir Vergisi' },
  '0003': { tur: 'MUHTASAR', ad: 'Gelir Vergisi Stopajı (Muhtasar)' },
  '0004': { tur: 'GELIR_VERGISI', ad: 'Gelir Götürü Ticari Kazanç' },
  '0011': { tur: 'KURUMLAR_VERGISI', ad: 'Kurumlar Vergisi' },
  '0012': { tur: 'KURUMLAR_VERGISI', ad: 'Kurumlar Vergisi Stopajı' },
  '0014': { tur: 'GELIR_VERGISI', ad: 'Basit Usulde Ticari Kazanç' },
  '0015': { tur: 'KDV', ad: 'Katma Değer Vergisi (KDV)' },
  '0017': { tur: 'KDV', ad: 'KDV Tevkifatı' },
  '0021': { tur: 'DIGER', ad: 'Banka Muameleleri Vergisi' },
  '0022': { tur: 'DIGER', ad: 'Sigorta Muameleleri Vergisi' },
  '0027': { tur: 'GECICI_VERGI', ad: 'Gelir Vergisi Geçici Vergi' },
  '0032': { tur: 'GECICI_VERGI', ad: 'Kurumlar Vergisi Geçici Vergi' },
  '0033': { tur: 'DIGER', ad: 'Özel Tüketim Vergisi (ÖTV)' },
  '0040': { tur: 'DAMGA_VERGISI', ad: 'Damga Vergisi (Beyannameli)' },
  '0046': { tur: 'DIGER', ad: 'Akaryakıt Tüketim Vergisi' },
  '0048': { tur: 'DIGER', ad: 'Veraset ve İntikal Vergisi' },
  '0059': { tur: 'DIGER', ad: 'Taşıt Vergisi' },
  '0071': { tur: 'DIGER', ad: 'Petrol ve Doğalgaz Ürünlerine KDV' },
  '1047': { tur: 'MUHTASAR', ad: 'Damga Vergisi (Muhtasar)' },
  '1048': { tur: 'MUHTASAR', ad: 'Muhtasar ve Prim Hizmet Beyannamesi' },
  '9001': { tur: 'SGK', ad: 'SGK Prim Tahakkuku' },
  '9002': { tur: 'SGK', ad: 'SGK İşsizlik Sigortası' },
};

const TURKCE_AYLAR: Record<number, string> = {
  1: 'Ocak', 2: 'Şubat', 3: 'Mart', 4: 'Nisan',
  5: 'Mayıs', 6: 'Haziran', 7: 'Temmuz', 8: 'Ağustos',
  9: 'Eylül', 10: 'Ekim', 11: 'Kasım', 12: 'Aralık',
};

// ============================================================================
// YARDIMCI FONKSİYONLAR
// ============================================================================

/**
 * Türkçe sayı formatını parse et
 */
function parseNumber(value: string | null | undefined): number {
  if (!value) return 0;

  const cleaned = value
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');

  return parseFloat(cleaned) || 0;
}

/**
 * Tarih formatını normalize et (DD.MM.YYYY -> YYYY-MM-DD)
 */
function normalizeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';

  // DD.MM.YYYY veya DD/MM/YYYY
  const match = dateStr.match(/(\d{2})[\.\/](\d{2})[\.\/](\d{4})/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  // YYYY-MM-DD zaten uygun
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  return dateStr;
}

/**
 * VKN/TCKN normalize et
 */
function normalizeVKN(value: string): string {
  return value.replace(/\D/g, '').substring(0, 11);
}

/**
 * Pattern ile değer çıkar
 */
function extractValue(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  return match ? match[1]?.trim() : null;
}

/**
 * Pattern ile sayı çıkar
 */
function extractNumber(text: string, pattern: RegExp): number {
  const value = extractValue(text, pattern);
  return parseNumber(value);
}

/**
 * Tahakkuk türünü tespit et
 */
function detectTahakkukTuru(text: string, vergiKodlari: string[]): TahakkukTuru {
  const lowerText = text.toLowerCase();

  // Vergi kodlarından tespit
  for (const kod of vergiKodlari) {
    if (VERGI_KODLARI[kod]) {
      return VERGI_KODLARI[kod].tur;
    }
  }

  // Metin bazlı tespit
  if (lowerText.includes('kdv') || lowerText.includes('katma değer')) return 'KDV';
  if (lowerText.includes('muhtasar') || lowerText.includes('stopaj')) return 'MUHTASAR';
  if (lowerText.includes('geçici vergi') || lowerText.includes('gecici vergi')) return 'GECICI_VERGI';
  if (lowerText.includes('kurumlar')) return 'KURUMLAR_VERGISI';
  if (lowerText.includes('gelir vergisi')) return 'GELIR_VERGISI';
  if (lowerText.includes('damga')) return 'DAMGA_VERGISI';
  if (lowerText.includes('sgk') || lowerText.includes('sigorta')) return 'SGK';

  return 'DIGER';
}

/**
 * Dönem bilgisini çıkar
 */
function extractDonem(text: string): {
  yil: number;
  ay?: number;
  ceyrek?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
} {
  // Ay bazlı: "Ocak 2025", "2025/01", "01/2025"
  const ayPattern = /(?:dönem|vergilendirme)[:\s]*(\w+)[\/\s-]*(\d{4})/i;
  const ayMatch = text.match(ayPattern);

  if (ayMatch) {
    const ayStr = ayMatch[1].toLowerCase();
    const yil = parseInt(ayMatch[2]);

    const ayMap: Record<string, number> = {
      'ocak': 1, 'şubat': 2, 'subat': 2, 'mart': 3, 'nisan': 4,
      'mayıs': 5, 'mayis': 5, 'haziran': 6, 'temmuz': 7, 'ağustos': 8,
      'agustos': 8, 'eylül': 9, 'eylul': 9, 'ekim': 10, 'kasım': 11,
      'kasim': 11, 'aralık': 12, 'aralik': 12,
      '01': 1, '02': 2, '03': 3, '04': 4, '05': 5, '06': 6,
      '07': 7, '08': 8, '09': 9, '10': 10, '11': 11, '12': 12,
    };

    const ay = ayMap[ayStr] || parseInt(ayStr);
    if (ay >= 1 && ay <= 12) {
      return { yil, ay };
    }
  }

  // Çeyrek bazlı: "2025/1. Dönem", "Q1 2025"
  const ceyrekPattern = /(\d{4})[\/\s-]*([1-4])\.?\s*(?:dönem|çeyrek)/i;
  const ceyrekMatch = text.match(ceyrekPattern);
  if (ceyrekMatch) {
    return {
      yil: parseInt(ceyrekMatch[1]),
      ceyrek: `Q${ceyrekMatch[2]}` as 'Q1' | 'Q2' | 'Q3' | 'Q4',
    };
  }

  // Sadece yıl
  const yilMatch = text.match(/(?:dönem|yıl)[:\s]*(\d{4})/i);
  if (yilMatch) {
    return { yil: parseInt(yilMatch[1]) };
  }

  return { yil: new Date().getFullYear() };
}

// ============================================================================
// ANA PARSE FONKSİYONU
// ============================================================================

/**
 * Tahakkuk Fişi PDF'ini parse et
 */
export function parseTahakkukPDF(pdfText: string, fileName: string): ParsedTahakkukFisi {
  const text = pdfText;

  // Mükellef bilgileri
  const vkn = normalizeVKN(
    extractValue(text, /(?:vkn|vergi\s*(?:kimlik)?\s*(?:no|numarası))[:\s]*(\d{10,11})/i) || ''
  );
  const tckn = normalizeVKN(
    extractValue(text, /(?:tckn|tc\s*(?:kimlik)?\s*(?:no|numarası))[:\s]*(\d{11})/i) || ''
  );
  const unvan = extractValue(text, /(?:unvan|mükellef|ad\s*soyad)[:\s]*([^\n]+)/i) || '';
  const vergiDairesi = extractValue(text, /(?:vergi\s*dairesi)[:\s]*([^\n]+)/i) || '';
  const vergiDairesiKodu = extractValue(text, /(?:daire\s*kodu)[:\s]*(\d+)/i);

  // Tahakkuk bilgileri
  const tahakkukNo = extractValue(text, /(?:tahakkuk|belge)\s*(?:no|numarası)[:\s]*(\S+)/i) || '';
  const onayNo = extractValue(text, /(?:onay)\s*(?:no|numarası)[:\s]*(\S+)/i);

  // Tarihler
  const duzenlenmeTarihi = normalizeDate(
    extractValue(text, /(?:düzenlenme|tanzim)\s*tarihi[:\s]*(\d{2}[\.\/]\d{2}[\.\/]\d{4})/i)
  ) || new Date().toISOString().split('T')[0];

  const vadeTarihi = normalizeDate(
    extractValue(text, /(?:vade|son\s*ödeme)\s*tarihi[:\s]*(\d{2}[\.\/]\d{2}[\.\/]\d{4})/i)
  ) || '';

  // Dönem
  const donem = extractDonem(text);

  // Vergi kalemleri
  const kalemler: TahakkukFisiKalemi[] = [];
  const bulunanVergiKodlari: string[] = [];

  // Vergi kodu + tutar pattern'i ara
  const vergiPattern = /(\d{4})\s*[-–]\s*([^\n]+?)\s+([\d\.,]+)\s*(?:TL|₺)?/gi;
  let vergiMatch;

  while ((vergiMatch = vergiPattern.exec(text)) !== null) {
    const vergiKodu = vergiMatch[1];
    const vergiAdi = vergiMatch[2].trim();
    const tutar = parseNumber(vergiMatch[3]);

    if (tutar > 0) {
      bulunanVergiKodlari.push(vergiKodu);
      kalemler.push({
        vergiKodu,
        vergiAdi: VERGI_KODLARI[vergiKodu]?.ad || vergiAdi,
        tahakkukTutari: tutar,
        odenecekTutar: tutar,
      });
    }
  }

  // Eğer vergi kalemi bulunamadıysa, toplam tutarı ara
  if (kalemler.length === 0) {
    const toplamTutar = extractNumber(text, /(?:toplam|ödenecek)\s*(?:tutar|vergi)[:\s]*([\d\.,]+)/i);
    if (toplamTutar > 0) {
      kalemler.push({
        vergiKodu: '0000',
        vergiAdi: 'Toplam Vergi',
        tahakkukTutari: toplamTutar,
        odenecekTutar: toplamTutar,
      });
    }
  }

  // Toplamlar
  const tahakkukToplam = kalemler.reduce((sum, k) => sum + k.tahakkukTutari, 0);
  const odenecekToplam = extractNumber(text, /(?:ödenecek|toplam)\s*(?:tutar|borç)[:\s]*([\d\.,]+)/i) || tahakkukToplam;
  const gecikmeZammi = extractNumber(text, /gecikme\s*(?:zammı|faizi)[:\s]*([\d\.,]+)/i);

  // Tahakkuk türünü belirle
  const tur = detectTahakkukTuru(text, bulunanVergiKodlari);

  // Ödeme bilgisi
  const barkodNo = extractValue(text, /(?:barkod|referans)\s*(?:no|numarası)?[:\s]*(\d+)/i);

  return {
    tur,
    mukellef: {
      vkn,
      tckn: tckn || undefined,
      unvan,
      vergiDairesi,
      vergiDairesiKodu: vergiDairesiKodu || undefined,
    },
    donem: {
      yil: donem.yil,
      ay: donem.ay,
      ayAdi: donem.ay ? TURKCE_AYLAR[donem.ay] : undefined,
      ceyrek: donem.ceyrek,
    },
    tahakkuk: {
      tahakkukNo,
      onayNo: onayNo || undefined,
      duzenlenmeTarihi,
      vadeTarihi,
    },
    kalemler,
    toplamlar: {
      tahakkukToplam,
      odenecekToplam: odenecekToplam + (gecikmeZammi || 0),
      gecikmeZammi: gecikmeZammi || undefined,
    },
    odeme: barkodNo ? { barkodNo } : undefined,
    parseInfo: {
      kaynak: fileName,
      parseTarihi: new Date().toISOString(),
      format: 'PDF',
    },
  };
}

/**
 * Birden fazla tahakkuk parse et
 */
export function parseMultipleTahakkuk(
  files: { pdfText: string; fileName: string }[]
): { success: ParsedTahakkukFisi[]; errors: { fileName: string; error: string }[] } {
  const success: ParsedTahakkukFisi[] = [];
  const errors: { fileName: string; error: string }[] = [];

  for (const file of files) {
    try {
      const parsed = parseTahakkukPDF(file.pdfText, file.fileName);
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

/**
 * Tahakkukları türe göre grupla
 */
export function grupTahakkukByTur(tahakkuklar: ParsedTahakkukFisi[]): Record<TahakkukTuru, ParsedTahakkukFisi[]> {
  const gruplar: Record<TahakkukTuru, ParsedTahakkukFisi[]> = {
    KDV: [],
    MUHTASAR: [],
    GECICI_VERGI: [],
    KURUMLAR_VERGISI: [],
    GELIR_VERGISI: [],
    DAMGA_VERGISI: [],
    SGK: [],
    DIGER: [],
  };

  for (const t of tahakkuklar) {
    gruplar[t.tur].push(t);
  }

  return gruplar;
}

/**
 * Tahakkuk istatistikleri
 */
export function getTahakkukStats(tahakkuklar: ParsedTahakkukFisi[]): {
  toplamTahakkuk: number;
  toplamBorc: number;
  vadesiGecmis: number;
  vadesiGecmisBorc: number;
  turBazli: Record<TahakkukTuru, { adet: number; tutar: number }>;
  ayBazli: Record<string, number>;
} {
  const bugun = new Date().toISOString().split('T')[0];

  const stats = {
    toplamTahakkuk: tahakkuklar.length,
    toplamBorc: 0,
    vadesiGecmis: 0,
    vadesiGecmisBorc: 0,
    turBazli: {} as Record<TahakkukTuru, { adet: number; tutar: number }>,
    ayBazli: {} as Record<string, number>,
  };

  // Tür bazlı başlangıç
  const turler: TahakkukTuru[] = ['KDV', 'MUHTASAR', 'GECICI_VERGI', 'KURUMLAR_VERGISI', 'GELIR_VERGISI', 'DAMGA_VERGISI', 'SGK', 'DIGER'];
  for (const tur of turler) {
    stats.turBazli[tur] = { adet: 0, tutar: 0 };
  }

  for (const t of tahakkuklar) {
    const tutar = t.toplamlar.odenecekToplam;
    stats.toplamBorc += tutar;

    // Vade kontrolü
    if (t.tahakkuk.vadeTarihi && t.tahakkuk.vadeTarihi < bugun) {
      stats.vadesiGecmis++;
      stats.vadesiGecmisBorc += tutar;
    }

    // Tür bazlı
    stats.turBazli[t.tur].adet++;
    stats.turBazli[t.tur].tutar += tutar;

    // Ay bazlı
    if (t.donem.ay) {
      const ayKey = `${t.donem.yil}-${String(t.donem.ay).padStart(2, '0')}`;
      stats.ayBazli[ayKey] = (stats.ayBazli[ayKey] || 0) + tutar;
    }
  }

  return stats;
}

/**
 * Tahakkuk - Mizan çapraz kontrol verisi
 */
export function tahakkukToCrossCheck(tahakkuk: ParsedTahakkukFisi): {
  tur: TahakkukTuru;
  donem: string;
  odenecekTutar: number;
  muhasebeHesabi: string;
} {
  // Tahakkuk türüne göre muhasebe hesabı
  const hesapMap: Record<TahakkukTuru, string> = {
    KDV: '360.01',           // Ödenecek KDV
    MUHTASAR: '360.02',      // Ödenecek Gelir Vergisi Stopajı
    GECICI_VERGI: '360.03',  // Ödenecek Geçici Vergi
    KURUMLAR_VERGISI: '370', // Dönem Karı Vergi Yükümlülüğü
    GELIR_VERGISI: '360.04', // Ödenecek Gelir Vergisi
    DAMGA_VERGISI: '360.05', // Ödenecek Damga Vergisi
    SGK: '361',              // Ödenecek SGK Primleri
    DIGER: '360.99',         // Diğer Ödenecek Vergiler
  };

  const donemStr = tahakkuk.donem.ceyrek
    ? `${tahakkuk.donem.yil}-${tahakkuk.donem.ceyrek}`
    : tahakkuk.donem.ay
      ? `${tahakkuk.donem.yil}-${String(tahakkuk.donem.ay).padStart(2, '0')}`
      : `${tahakkuk.donem.yil}`;

  return {
    tur: tahakkuk.tur,
    donem: donemStr,
    odenecekTutar: tahakkuk.toplamlar.odenecekToplam,
    muhasebeHesabi: hesapMap[tahakkuk.tur],
  };
}
