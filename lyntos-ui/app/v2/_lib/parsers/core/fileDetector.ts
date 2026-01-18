/**
 * LYNTOS Akilli Dosya Algilama v2.0
 * Icerik bazli dosya tipi tespiti
 *
 * Desteklenen Belgeler:
 * - Mizan, Yevmiye, Kebir (Excel)
 * - e-Defter (XML)
 * - Banka Ekstreleri (CSV) - 25+ Turk bankasi
 * - KDV/Muhtasar/Gecici Vergi Beyannameleri (PDF)
 * - SGK/APHB Dokumanlari (Excel/PDF)
 * - Hesap Plani, Bilanco, Gelir Tablosu (Excel)
 */

import type { DetectedFile, DetectedFileType, BankaKodu } from '../types';
import { getFileExtension, extractPeriodFromPath } from './zipHandler';

const generateId = () => `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ═══════════════════════════════════════════════════════════════════
// TURK BANKALARI - 25+ Banka Destegi
// ═══════════════════════════════════════════════════════════════════

interface BankaPattern {
  kod: BankaKodu;
  ad: string;
  anahtar: string[];        // Dosya adi/icerik anahtar kelimeleri
  muhasebeKodlari: string[]; // 102.XX kodlari
}

const BANKA_PATTERNS: BankaPattern[] = [
  // Buyuk Ozel Bankalar
  { kod: 'YKB', ad: 'Yapi Kredi Bankasi', anahtar: ['ykb', 'yapi kredi', 'yapikredi', 'ykbank'], muhasebeKodlari: ['102.01'] },
  { kod: 'AKBANK', ad: 'Akbank', anahtar: ['akbank', 'akbnk'], muhasebeKodlari: ['102.02'] },
  { kod: 'GARANTI', ad: 'Garanti BBVA', anahtar: ['garanti', 'garan', 'bbva'], muhasebeKodlari: ['102.03'] },
  { kod: 'ISBANK', ad: 'Is Bankasi', anahtar: ['isbank', 'isbankasi', 'isbnk', 'is bankasi'], muhasebeKodlari: ['102.04'] },

  // Kamu Bankalari
  { kod: 'ZIRAAT', ad: 'Ziraat Bankasi', anahtar: ['ziraat', 'ziraatbank', 'tczbk'], muhasebeKodlari: ['102.05'] },
  { kod: 'HALKBANK', ad: 'Halkbank', anahtar: ['halkbank', 'halk', 'hlkbnk'], muhasebeKodlari: ['102.06'] },
  { kod: 'VAKIFBANK', ad: 'Vakifbank', anahtar: ['vakif', 'vakifbank', 'vkfbnk'], muhasebeKodlari: ['102.07'] },

  // Katilim Bankalari
  { kod: 'ALBARAKA', ad: 'Albaraka Turk', anahtar: ['albaraka', 'albarak'], muhasebeKodlari: ['102.10'] },
  { kod: 'DIGER', ad: 'Kuveyt Turk', anahtar: ['kuveyt', 'kuveytturk', 'kt'], muhasebeKodlari: ['102.11'] },
  { kod: 'DIGER', ad: 'Turkiye Finans', anahtar: ['tfkb', 'turkiyefinans', 'turkiye finans'], muhasebeKodlari: ['102.12'] },
  { kod: 'DIGER', ad: 'Vakif Katilim', anahtar: ['vakifkatilim', 'vakif katilim'], muhasebeKodlari: ['102.13'] },
  { kod: 'DIGER', ad: 'Ziraat Katilim', anahtar: ['ziraatkatilim', 'ziraat katilim'], muhasebeKodlari: ['102.14'] },
  { kod: 'DIGER', ad: 'Emlak Katilim', anahtar: ['emlakkatilim', 'emlak katilim'], muhasebeKodlari: ['102.15'] },

  // Yabanci Bankalar
  { kod: 'DIGER', ad: 'QNB Finansbank', anahtar: ['qnb', 'finansbank', 'finans'], muhasebeKodlari: ['102.20'] },
  { kod: 'DIGER', ad: 'Denizbank', anahtar: ['deniz', 'denizbank', 'denzbnk'], muhasebeKodlari: ['102.21'] },
  { kod: 'DIGER', ad: 'ING Bank', anahtar: ['ing', 'ingbank'], muhasebeKodlari: ['102.22'] },
  { kod: 'DIGER', ad: 'TEB', anahtar: ['teb', 'ekonomi'], muhasebeKodlari: ['102.23'] },
  { kod: 'DIGER', ad: 'HSBC', anahtar: ['hsbc'], muhasebeKodlari: ['102.24'] },
  { kod: 'DIGER', ad: 'Sekerbank', anahtar: ['seker', 'sekerbank'], muhasebeKodlari: ['102.25'] },
  { kod: 'DIGER', ad: 'Alternatifbank', anahtar: ['abank', 'alternatif'], muhasebeKodlari: ['102.26'] },
  { kod: 'DIGER', ad: 'Fibabanka', anahtar: ['fiba', 'fibabanka'], muhasebeKodlari: ['102.27'] },
  { kod: 'DIGER', ad: 'Odeabank', anahtar: ['odea', 'odeabank'], muhasebeKodlari: ['102.28'] },
  { kod: 'DIGER', ad: 'Burgan Bank', anahtar: ['burgan'], muhasebeKodlari: ['102.29'] },
  { kod: 'DIGER', ad: 'Turkland Bank', anahtar: ['turkland', 'tbank'], muhasebeKodlari: ['102.30'] },
  { kod: 'DIGER', ad: 'Icbc Turkey', anahtar: ['icbc', 'tekstil'], muhasebeKodlari: ['102.31'] },
];

// Turkce ay isimleri (dosya isimlerinde kullanilan)
const TURKCE_AYLAR: Record<string, number> = {
  'ocak': 1, 'ock': 1, 'jan': 1,
  'subat': 2, 'şubat': 2, 'sub': 2, 'feb': 2,
  'mart': 3, 'mar': 3,
  'nisan': 4, 'nis': 4, 'apr': 4,
  'mayis': 5, 'mayıs': 5, 'may': 5,
  'haziran': 6, 'haz': 6, 'jun': 6,
  'temmuz': 7, 'tem': 7, 'jul': 7,
  'agustos': 8, 'ağustos': 8, 'agu': 8, 'aug': 8,
  'eylul': 9, 'eylül': 9, 'eyl': 9, 'sep': 9,
  'ekim': 10, 'eki': 10, 'oct': 10,
  'kasim': 11, 'kasım': 11, 'kas': 11, 'nov': 11,
  'aralik': 12, 'aralık': 12, 'ara': 12, 'dec': 12,
};

/**
 * Dosya iceriginden tip tespit et
 */
export async function detectFileType(
  fileName: string,
  content: ArrayBuffer,
  path: string
): Promise<DetectedFile> {
  const ext = getFileExtension(fileName);
  const size = content.byteLength;

  const base: Omit<DetectedFile, 'fileType' | 'confidence' | 'detectionMethod' | 'metadata'> = {
    id: generateId(),
    originalPath: path,
    fileName,
    fileExtension: ext,
    fileSize: size,
    rawContent: content,
  };

  // Extension bazli ilk siniflandirma
  switch (ext) {
    case 'xlsx':
    case 'xls':
      return detectExcelType(base, content, fileName);

    case 'csv':
      return detectCSVType(base, content, fileName);

    case 'xml':
      return detectXMLType(base, content, fileName);

    case 'pdf':
      return detectPDFType(base, content, fileName);

    case 'zip':
      return {
        ...base,
        fileType: 'UNKNOWN',
        confidence: 50,
        detectionMethod: 'filename',
        metadata: { donem: extractPeriodFromPath(path) },
      };

    default:
      return {
        ...base,
        fileType: 'UNKNOWN',
        confidence: 0,
        detectionMethod: 'filename',
        metadata: {},
      };
  }
}

/**
 * Excel dosyasi tipini tespit et
 * Desteklenen tipler: Mizan, Yevmiye, Kebir, Hesap Plani, Bilanco, Gelir Tablosu, SGK, Banka Ekstre
 */
async function detectExcelType(
  base: Omit<DetectedFile, 'fileType' | 'confidence' | 'detectionMethod' | 'metadata'>,
  _content: ArrayBuffer,
  fileName: string
): Promise<DetectedFile> {
  const lowerName = fileName.toLowerCase();
  const donem = extractPeriodFromPath(base.originalPath);

  // ═══ MUHASEBE DEFTERI TIPI TESPIT ═══

  // Mizan (en yuksek oncelik)
  if (lowerName.includes('mizan')) {
    return {
      ...base,
      fileType: 'MIZAN_EXCEL',
      confidence: 95,
      detectionMethod: 'filename',
      metadata: { donem },
    };
  }

  // Yevmiye Defteri
  if (lowerName.includes('yevmiye')) {
    return {
      ...base,
      fileType: 'YEVMIYE_EXCEL',
      confidence: 95,
      detectionMethod: 'filename',
      metadata: { donem },
    };
  }

  // Defteri Kebir
  if (lowerName.includes('kebir') || lowerName.includes('defter-i kebir')) {
    return {
      ...base,
      fileType: 'KEBIR_EXCEL',
      confidence: 95,
      detectionMethod: 'filename',
      metadata: { donem },
    };
  }

  // ═══ HESAP PLANI ve MALI TABLOLAR ═══

  // Hesap Plani
  if (lowerName.includes('hesap plan') || lowerName.includes('hesapplani') ||
      lowerName.includes('hesap_plan') || lowerName.includes('coa') ||
      lowerName.includes('chart of account')) {
    return {
      ...base,
      fileType: 'HESAP_PLANI_EXCEL',
      confidence: 90,
      detectionMethod: 'filename',
      metadata: { donem },
    };
  }

  // Bilanco
  if (lowerName.includes('bilanco') || lowerName.includes('bilanço') ||
      lowerName.includes('balance sheet')) {
    return {
      ...base,
      fileType: 'BILANCO_EXCEL',
      confidence: 90,
      detectionMethod: 'filename',
      metadata: { donem },
    };
  }

  // Gelir Tablosu
  if (lowerName.includes('gelir tablosu') || lowerName.includes('gelirtablosu') ||
      lowerName.includes('kar zarar') || lowerName.includes('karzarar') ||
      lowerName.includes('income statement') || lowerName.includes('p&l') ||
      lowerName.includes('pnl')) {
    return {
      ...base,
      fileType: 'GELIR_TABLOSU_EXCEL',
      confidence: 90,
      detectionMethod: 'filename',
      metadata: { donem },
    };
  }

  // ═══ SGK DOKUMANLARI ═══

  // APHB (Aylik Prim Hizmet Belgesi)
  if (lowerName.includes('aphb') || lowerName.includes('aylik prim') ||
      lowerName.includes('prim hizmet') || lowerName.includes('sgk bildir')) {
    return {
      ...base,
      fileType: 'SGK_APHB_EXCEL',
      confidence: 90,
      detectionMethod: 'filename',
      metadata: { donem },
    };
  }

  // Eksik Gun Bildirimi
  if (lowerName.includes('eksik gun') || lowerName.includes('eksikgun') ||
      lowerName.includes('ek-10')) {
    return {
      ...base,
      fileType: 'SGK_EKSIK_GUN_EXCEL',
      confidence: 90,
      detectionMethod: 'filename',
      metadata: { donem },
    };
  }

  // ═══ BANKA EKSTRESI (EXCEL) ═══

  const bankaInfo = detectBanka(fileName);
  if (bankaInfo || lowerName.includes('ekstre') || lowerName.includes('hesap hareket')) {
    const ayInfo = extractAy(fileName);
    return {
      ...base,
      fileType: 'BANKA_EKSTRE_EXCEL',
      confidence: bankaInfo ? 90 : 75,
      detectionMethod: 'filename',
      metadata: {
        banka: bankaInfo?.kod,
        bankaAdi: bankaInfo?.ad,
        muhasebeKodu: bankaInfo?.muhasebeKodu,
        donem,
        ay: ayInfo?.ayAdi,
      },
    };
  }

  // ═══ BILINMEYEN ═══
  return {
    ...base,
    fileType: 'UNKNOWN',
    confidence: 30,
    detectionMethod: 'filename',
    metadata: { donem },
  };
}

/**
 * Banka tespit et (dosya adi veya icerigi kullanarak)
 */
function detectBanka(text: string): { kod: BankaKodu; ad: string; muhasebeKodu?: string } | null {
  const lowerText = text.toLowerCase();

  // Muhasebe hesap kodunu cikar (102.01, 102.19 vb.)
  const hesapMatch = text.match(/102\.(\d{2})/);
  const muhasebeKodu = hesapMatch ? `102.${hesapMatch[1]}` : undefined;

  // Banka pattern'lerinden eslesme ara
  for (const banka of BANKA_PATTERNS) {
    // Anahtar kelime eslesme
    for (const anahtar of banka.anahtar) {
      if (lowerText.includes(anahtar)) {
        return { kod: banka.kod, ad: banka.ad, muhasebeKodu };
      }
    }
    // Muhasebe kodu eslesme
    if (muhasebeKodu && banka.muhasebeKodlari.includes(muhasebeKodu)) {
      return { kod: banka.kod, ad: banka.ad, muhasebeKodu };
    }
  }

  // Muhasebe kodu varsa ama banka bulunamadiysa
  if (muhasebeKodu) {
    return { kod: 'DIGER', ad: 'Diger Banka', muhasebeKodu };
  }

  return null;
}

/**
 * Ay bilgisi cikar (dosya adindan)
 */
function extractAy(text: string): { ay: number; ayAdi: string } | null {
  const lowerText = text.toLowerCase();

  for (const [ayAdi, ayNo] of Object.entries(TURKCE_AYLAR)) {
    if (lowerText.includes(ayAdi)) {
      // Turkce buyuk harfle basla
      const formattedAy = ayAdi.charAt(0).toUpperCase() + ayAdi.slice(1);
      return { ay: ayNo, ayAdi: formattedAy };
    }
  }

  // Sayisal ay (01-12 veya 1-12)
  const ayMatch = text.match(/[-_](\d{1,2})[-_]/);
  if (ayMatch) {
    const ayNo = parseInt(ayMatch[1], 10);
    if (ayNo >= 1 && ayNo <= 12) {
      const aylar = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran',
                     'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];
      return { ay: ayNo, ayAdi: aylar[ayNo - 1] };
    }
  }

  return null;
}

/**
 * CSV dosyasi tipini tespit et (banka ekstreleri)
 */
async function detectCSVType(
  base: Omit<DetectedFile, 'fileType' | 'confidence' | 'detectionMethod' | 'metadata'>,
  content: ArrayBuffer,
  fileName: string
): Promise<DetectedFile> {
  const lowerName = fileName.toLowerCase();

  // 1. Dosya adindan banka tespit
  let bankaInfo = detectBanka(fileName);
  let confidence = bankaInfo ? 85 : 0;
  let detectionMethod: 'content' | 'filename' | 'structure' = 'filename';

  // 2. Icerik bazli tespit (dosya adindan bulunamazsa)
  if (!bankaInfo && content.byteLength > 0) {
    try {
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(content.slice(0, 5000)); // Ilk 5KB

      // Banka ekstresinde tipik sutun basliklari
      const bankaHeaders = ['tarih', 'aciklama', 'borc', 'alacak', 'bakiye', 'tutar', 'islem'];
      const headerMatches = bankaHeaders.filter(h => text.toLowerCase().includes(h));

      if (headerMatches.length >= 3) {
        // Icerikten banka ara
        bankaInfo = detectBanka(text);
        if (bankaInfo) {
          confidence = 80;
          detectionMethod = 'content';
        } else {
          // Banka bulunamadi ama ekstre gibi gorunuyor
          bankaInfo = { kod: 'DIGER', ad: 'Bilinmeyen Banka' };
          confidence = 60;
          detectionMethod = 'content';
        }
      }
    } catch {
      // UTF-8 decode hatasi - cp1254 dene
      try {
        const decoder = new TextDecoder('iso-8859-9');
        const text = decoder.decode(content.slice(0, 5000));
        bankaInfo = detectBanka(text);
        if (bankaInfo) {
          confidence = 75;
          detectionMethod = 'content';
        }
      } catch {
        // Decode basarisiz
      }
    }
  }

  // 3. Ozel CSV tipleri
  if (!bankaInfo) {
    // Mizan CSV
    if (lowerName.includes('mizan')) {
      return {
        ...base,
        fileType: 'MIZAN_EXCEL', // CSV de olsa Mizan olarak isle
        confidence: 85,
        detectionMethod: 'filename',
        metadata: { donem: extractPeriodFromPath(base.originalPath) },
      };
    }

  }

  if (bankaInfo) {
    const ayInfo = extractAy(fileName);
    return {
      ...base,
      fileType: 'BANKA_EKSTRE_CSV',
      confidence,
      detectionMethod,
      metadata: {
        banka: bankaInfo.kod,
        bankaAdi: bankaInfo.ad,
        muhasebeKodu: bankaInfo.muhasebeKodu,
        donem: extractPeriodFromPath(base.originalPath),
        ay: ayInfo?.ayAdi,
      },
    };
  }

  return {
    ...base,
    fileType: 'UNKNOWN',
    confidence: 20,
    detectionMethod: 'filename',
    metadata: {},
  };
}

/**
 * XML dosyasi tipini tespit et (e-Defter, e-Fatura, e-Arsiv, e-Irsaliye, e-SMM)
 */
async function detectXMLType(
  base: Omit<DetectedFile, 'fileType' | 'confidence' | 'detectionMethod' | 'metadata'>,
  content: ArrayBuffer,
  fileName: string
): Promise<DetectedFile> {
  const lowerName = fileName.toLowerCase();

  // ═══ e-DEFTER PATTERN ═══
  // VKN-YYYYMM-TIP-PART pattern: 0480525636-202501-Y-000000.xml
  const eDefterMatch = fileName.match(/(\d{10,11})-(\d{6})-([YK]|YB|KB|DR)-\d+\.xml/i);

  if (eDefterMatch) {
    const [, vkn, donemRaw, tip] = eDefterMatch;
    const donem = `${donemRaw.slice(0, 4)}-${donemRaw.slice(4, 6)}`;

    let fileType: DetectedFileType;
    let beratTipi: 'Y' | 'K' | 'YB' | 'KB' | 'DR' | undefined;

    switch (tip.toUpperCase()) {
      case 'Y':
        fileType = 'E_DEFTER_YEVMIYE_XML';
        beratTipi = 'Y';
        break;
      case 'K':
        fileType = 'E_DEFTER_KEBIR_XML';
        beratTipi = 'K';
        break;
      case 'YB':
      case 'KB':
        fileType = 'E_DEFTER_BERAT_XML';
        beratTipi = tip.toUpperCase() as 'YB' | 'KB';
        break;
      case 'DR':
        fileType = 'E_DEFTER_RAPOR_XML';
        beratTipi = 'DR';
        break;
      default:
        fileType = 'UNKNOWN';
    }

    const gibOnayli = fileName.startsWith('GIB-');

    return {
      ...base,
      fileType,
      confidence: 95,
      detectionMethod: 'filename',
      metadata: { vkn, donem, beratTipi, gibOnayli },
    };
  }

  // ═══ e-FATURA / e-ARSIV PATTERN ═══
  // GIB-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.xml veya
  // abc123...-xxxx-xxxx-xxxx-xxxxxxxxxxxx.xml (UUID pattern)
  const uuidPattern = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i;
  const hasUUID = uuidPattern.test(fileName);

  // ═══ ICERIK ANALIZI ═══
  let text = '';
  try {
    const decoder = new TextDecoder('utf-8');
    text = decoder.decode(content.slice(0, 4000)); // Ilk 4KB
  } catch {
    // Decode hatasi
  }

  // e-Defter icerigi
  if (text.includes('edefter.gov.tr') || text.includes('xbrl.org/int/gl')) {
    // Yevmiye mi Kebir mi belirle
    const isKebir = text.includes('gl-cor:accountMain') || lowerName.includes('kebir');
    return {
      ...base,
      fileType: isKebir ? 'E_DEFTER_KEBIR_XML' : 'E_DEFTER_YEVMIYE_XML',
      confidence: 80,
      detectionMethod: 'content',
      metadata: { donem: extractPeriodFromPath(base.originalPath) },
    };
  }

  // e-Fatura icerigi (UBL 2.1)
  if (text.includes('urn:oasis:names:specification:ubl:schema:xsd:Invoice') ||
      text.includes('<cbc:UBLVersionID>') ||
      text.includes('<Invoice xmlns')) {

    // Satis mi alis mi?
    let faturaTipi: 'SATIS' | 'ALIS' | undefined;
    if (lowerName.includes('satis') || lowerName.includes('sales') ||
        base.originalPath.toLowerCase().includes('satis')) {
      faturaTipi = 'SATIS';
    } else if (lowerName.includes('alis') || lowerName.includes('purchase') ||
               base.originalPath.toLowerCase().includes('alis')) {
      faturaTipi = 'ALIS';
    }

    // e-Arsiv mi e-Fatura mi?
    const isEArsiv = text.includes('EArchiveInvoice') ||
                     lowerName.includes('arsiv') ||
                     lowerName.includes('e-arsiv');

    return {
      ...base,
      fileType: isEArsiv ? 'E_ARSIV_XML' : 'E_FATURA_XML',
      confidence: 85,
      detectionMethod: 'content',
      metadata: {
        faturaTipi,
        donem: extractPeriodFromPath(base.originalPath),
      },
    };
  }

  // e-Irsaliye icerigi
  if (text.includes('DespatchAdvice') || text.includes('irsaliye') ||
      lowerName.includes('irsaliye') || lowerName.includes('despatch')) {
    return {
      ...base,
      fileType: 'E_IRSALIYE_XML',
      confidence: 85,
      detectionMethod: text.includes('DespatchAdvice') ? 'content' : 'filename',
      metadata: { donem: extractPeriodFromPath(base.originalPath) },
    };
  }

  // e-SMM icerigi (Serbest Meslek Makbuzu)
  if (text.includes('SelfEmploymentReceipt') || lowerName.includes('smm') ||
      lowerName.includes('serbest meslek')) {
    return {
      ...base,
      fileType: 'E_SMM_XML',
      confidence: 85,
      detectionMethod: text.includes('SelfEmploymentReceipt') ? 'content' : 'filename',
      metadata: { donem: extractPeriodFromPath(base.originalPath) },
    };
  }

  // UUID varsa ve e-belge gibi gorunuyorsa
  if (hasUUID && (lowerName.includes('gib') || lowerName.includes('fatura'))) {
    return {
      ...base,
      fileType: 'E_FATURA_XML',
      confidence: 60,
      detectionMethod: 'filename',
      metadata: { donem: extractPeriodFromPath(base.originalPath) },
    };
  }

  return {
    ...base,
    fileType: 'UNKNOWN',
    confidence: 20,
    detectionMethod: 'filename',
    metadata: {},
  };
}

/**
 * PDF dosyasi tipini tespit et
 * Desteklenen tipler: KDV, Muhtasar, Gecici Vergi, Kurumlar Vergisi, Damga Vergisi,
 *                     Vergi Levhasi, SGK APHB
 */
async function detectPDFType(
  base: Omit<DetectedFile, 'fileType' | 'confidence' | 'detectionMethod' | 'metadata'>,
  _content: ArrayBuffer,
  fileName: string
): Promise<DetectedFile> {
  const lowerName = fileName.toLowerCase();
  const donem = extractPeriodFromPath(base.originalPath);

  // Ay tespit et
  const ayInfo = extractAy(fileName);

  // ═══ KDV BEYANNAMESI ═══
  if (lowerName.includes('kdv')) {
    if (lowerName.includes('byn') || lowerName.includes('beyanname')) {
      return {
        ...base,
        fileType: 'KDV_BEYANNAME_PDF',
        confidence: 95,
        detectionMethod: 'filename',
        metadata: { ay: ayInfo?.ayAdi, donem },
      };
    }
    if (lowerName.includes('thk') || lowerName.includes('tahakkuk')) {
      return {
        ...base,
        fileType: 'KDV_TAHAKKUK_PDF',
        confidence: 95,
        detectionMethod: 'filename',
        metadata: { ay: ayInfo?.ayAdi, donem },
      };
    }
    // Sadece KDV yaziyorsa beyanname varsay
    return {
      ...base,
      fileType: 'KDV_BEYANNAME_PDF',
      confidence: 75,
      detectionMethod: 'filename',
      metadata: { ay: ayInfo?.ayAdi, donem },
    };
  }

  // ═══ MUHTASAR BEYANNAMESI ═══
  if (lowerName.includes('muhtasar')) {
    if (lowerName.includes('byn') || lowerName.includes('beyanname')) {
      return {
        ...base,
        fileType: 'MUHTASAR_BEYANNAME_PDF',
        confidence: 95,
        detectionMethod: 'filename',
        metadata: { ay: ayInfo?.ayAdi, donem },
      };
    }
    if (lowerName.includes('thk') || lowerName.includes('tahakkuk')) {
      return {
        ...base,
        fileType: 'MUHTASAR_TAHAKKUK_PDF',
        confidence: 95,
        detectionMethod: 'filename',
        metadata: { ay: ayInfo?.ayAdi, donem },
      };
    }
    return {
      ...base,
      fileType: 'MUHTASAR_BEYANNAME_PDF',
      confidence: 75,
      detectionMethod: 'filename',
      metadata: { ay: ayInfo?.ayAdi, donem },
    };
  }

  // ═══ GECICI VERGI ═══
  if (lowerName.includes('gecici') || lowerName.includes('geçici') ||
      lowerName.includes('gecivergi') || lowerName.includes('gv-')) {
    if (lowerName.includes('byn') || lowerName.includes('beyanname')) {
      return {
        ...base,
        fileType: 'GECICI_VERGI_BEYANNAME_PDF',
        confidence: 95,
        detectionMethod: 'filename',
        metadata: { donem },
      };
    }
    if (lowerName.includes('thk') || lowerName.includes('tahakkuk')) {
      return {
        ...base,
        fileType: 'GECICI_VERGI_TAHAKKUK_PDF',
        confidence: 95,
        detectionMethod: 'filename',
        metadata: { donem },
      };
    }
    return {
      ...base,
      fileType: 'GECICI_VERGI_BEYANNAME_PDF',
      confidence: 75,
      detectionMethod: 'filename',
      metadata: { donem },
    };
  }

  // ═══ KURUMLAR VERGISI ═══
  if (lowerName.includes('kurumlar') || lowerName.includes('kv-') ||
      lowerName.includes('kv beyanname')) {
    return {
      ...base,
      fileType: 'KURUMLAR_VERGISI_PDF',
      confidence: 90,
      detectionMethod: 'filename',
      metadata: { donem },
    };
  }

  // ═══ DAMGA VERGISI ═══
  if (lowerName.includes('damga') || lowerName.includes('dv-')) {
    return {
      ...base,
      fileType: 'DAMGA_VERGISI_PDF',
      confidence: 90,
      detectionMethod: 'filename',
      metadata: { ay: ayInfo?.ayAdi, donem },
    };
  }

  // ═══ VERGI LEVHASI ═══
  if (lowerName.includes('levha') || lowerName.includes('vergi levha')) {
    return {
      ...base,
      fileType: 'VERGI_LEVHASI_PDF',
      confidence: 90,
      detectionMethod: 'filename',
      metadata: { donem },
    };
  }

  // ═══ SGK DOKUMANLARI ═══
  if (lowerName.includes('aphb') || lowerName.includes('aylik prim') ||
      lowerName.includes('prim hizmet') || lowerName.includes('sgk')) {
    return {
      ...base,
      fileType: 'SGK_APHB_PDF',
      confidence: 90,
      detectionMethod: 'filename',
      metadata: { ay: ayInfo?.ayAdi, donem },
    };
  }

  if (lowerName.includes('eksik gun') || lowerName.includes('eksikgun') ||
      lowerName.includes('ek-10')) {
    return {
      ...base,
      fileType: 'SGK_EKSIK_GUN_PDF',
      confidence: 90,
      detectionMethod: 'filename',
      metadata: { ay: ayInfo?.ayAdi, donem },
    };
  }

  // ═══ BILINMEYEN ═══
  return {
    ...base,
    fileType: 'UNKNOWN',
    confidence: 20,
    detectionMethod: 'filename',
    metadata: { donem },
  };
}

/**
 * Birden fazla dosyayi toplu olarak tespit et
 */
export async function detectMultipleFiles(
  files: { fileName: string; content: ArrayBuffer; path: string }[]
): Promise<DetectedFile[]> {
  const results: DetectedFile[] = [];

  for (const file of files) {
    const detected = await detectFileType(file.fileName, file.content, file.path);
    results.push(detected);
  }

  return results;
}

/**
 * Tum dosya tiplerinin bos dizisi
 */
function createEmptyTypeGroups(): Record<DetectedFileType, DetectedFile[]> {
  return {
    // Excel
    MIZAN_EXCEL: [],
    YEVMIYE_EXCEL: [],
    KEBIR_EXCEL: [],
    HESAP_PLANI_EXCEL: [],
    BILANCO_EXCEL: [],
    GELIR_TABLOSU_EXCEL: [],
    SGK_APHB_EXCEL: [],
    SGK_EKSIK_GUN_EXCEL: [],

    // e-Defter (XML)
    E_DEFTER_YEVMIYE_XML: [],
    E_DEFTER_KEBIR_XML: [],
    E_DEFTER_BERAT_XML: [],
    E_DEFTER_RAPOR_XML: [],

    // e-Belgeler (XML)
    E_FATURA_XML: [],
    E_ARSIV_XML: [],
    E_IRSALIYE_XML: [],
    E_SMM_XML: [],

    // Banka Ekstreleri
    BANKA_EKSTRE_CSV: [],
    BANKA_EKSTRE_EXCEL: [],

    // Beyanname PDF'leri
    KDV_BEYANNAME_PDF: [],
    KDV_TAHAKKUK_PDF: [],
    MUHTASAR_BEYANNAME_PDF: [],
    MUHTASAR_TAHAKKUK_PDF: [],
    GECICI_VERGI_BEYANNAME_PDF: [],
    GECICI_VERGI_TAHAKKUK_PDF: [],
    KURUMLAR_VERGISI_PDF: [],
    DAMGA_VERGISI_PDF: [],

    // Diger PDF'ler
    VERGI_LEVHASI_PDF: [],
    SGK_APHB_PDF: [],
    SGK_EKSIK_GUN_PDF: [],

    // Bilinmeyen
    UNKNOWN: [],
  };
}

/**
 * Dosya tipine gore grupla
 */
export function groupFilesByType(files: DetectedFile[]): Record<DetectedFileType, DetectedFile[]> {
  const groups = createEmptyTypeGroups();

  for (const file of files) {
    if (groups[file.fileType]) {
      groups[file.fileType].push(file);
    } else {
      groups.UNKNOWN.push(file);
    }
  }

  return groups;
}

/**
 * Algilama istatistiklerini hesapla
 */
export function getDetectionStats(files: DetectedFile[]): {
  total: number;
  detected: number;
  unknown: number;
  byType: Record<DetectedFileType, number>;
  averageConfidence: number;
  byCategory: {
    muhasebe: number;      // Mizan, Yevmiye, Kebir
    eDefter: number;       // e-Defter dosyalari
    eBelge: number;        // e-Fatura, e-Arsiv, e-Irsaliye, e-SMM
    banka: number;         // Banka ekstreleri
    beyanname: number;     // PDF beyannameler
    sgk: number;           // SGK dokumanlari
    diger: number;         // Diger (Vergi Levhasi vb.)
  };
} {
  const byType: Record<DetectedFileType, number> = {
    // Excel
    MIZAN_EXCEL: 0,
    YEVMIYE_EXCEL: 0,
    KEBIR_EXCEL: 0,
    HESAP_PLANI_EXCEL: 0,
    BILANCO_EXCEL: 0,
    GELIR_TABLOSU_EXCEL: 0,
    SGK_APHB_EXCEL: 0,
    SGK_EKSIK_GUN_EXCEL: 0,

    // e-Defter
    E_DEFTER_YEVMIYE_XML: 0,
    E_DEFTER_KEBIR_XML: 0,
    E_DEFTER_BERAT_XML: 0,
    E_DEFTER_RAPOR_XML: 0,

    // e-Belgeler
    E_FATURA_XML: 0,
    E_ARSIV_XML: 0,
    E_IRSALIYE_XML: 0,
    E_SMM_XML: 0,

    // Banka
    BANKA_EKSTRE_CSV: 0,
    BANKA_EKSTRE_EXCEL: 0,

    // Beyanname PDF
    KDV_BEYANNAME_PDF: 0,
    KDV_TAHAKKUK_PDF: 0,
    MUHTASAR_BEYANNAME_PDF: 0,
    MUHTASAR_TAHAKKUK_PDF: 0,
    GECICI_VERGI_BEYANNAME_PDF: 0,
    GECICI_VERGI_TAHAKKUK_PDF: 0,
    KURUMLAR_VERGISI_PDF: 0,
    DAMGA_VERGISI_PDF: 0,

    // Diger PDF
    VERGI_LEVHASI_PDF: 0,
    SGK_APHB_PDF: 0,
    SGK_EKSIK_GUN_PDF: 0,

    // Bilinmeyen
    UNKNOWN: 0,
  };

  let totalConfidence = 0;

  for (const file of files) {
    if (byType[file.fileType] !== undefined) {
      byType[file.fileType]++;
    } else {
      byType.UNKNOWN++;
    }
    totalConfidence += file.confidence;
  }

  const unknown = byType.UNKNOWN;
  const detected = files.length - unknown;

  // Kategori bazli istatistikler
  const byCategory = {
    muhasebe: byType.MIZAN_EXCEL + byType.YEVMIYE_EXCEL + byType.KEBIR_EXCEL +
              byType.HESAP_PLANI_EXCEL + byType.BILANCO_EXCEL + byType.GELIR_TABLOSU_EXCEL,
    eDefter: byType.E_DEFTER_YEVMIYE_XML + byType.E_DEFTER_KEBIR_XML +
             byType.E_DEFTER_BERAT_XML + byType.E_DEFTER_RAPOR_XML,
    eBelge: byType.E_FATURA_XML + byType.E_ARSIV_XML +
            byType.E_IRSALIYE_XML + byType.E_SMM_XML,
    banka: byType.BANKA_EKSTRE_CSV + byType.BANKA_EKSTRE_EXCEL,
    beyanname: byType.KDV_BEYANNAME_PDF + byType.KDV_TAHAKKUK_PDF +
               byType.MUHTASAR_BEYANNAME_PDF + byType.MUHTASAR_TAHAKKUK_PDF +
               byType.GECICI_VERGI_BEYANNAME_PDF + byType.GECICI_VERGI_TAHAKKUK_PDF +
               byType.KURUMLAR_VERGISI_PDF + byType.DAMGA_VERGISI_PDF,
    sgk: byType.SGK_APHB_EXCEL + byType.SGK_EKSIK_GUN_EXCEL +
         byType.SGK_APHB_PDF + byType.SGK_EKSIK_GUN_PDF,
    diger: byType.VERGI_LEVHASI_PDF,
  };

  return {
    total: files.length,
    detected,
    unknown,
    byType,
    averageConfidence: files.length > 0 ? totalConfidence / files.length : 0,
    byCategory,
  };
}

/**
 * Eksik belge analizi
 * Bir donem icin gerekli belgelerin eksik olup olmadigini kontrol eder
 */
export function analyzeMissingDocuments(
  files: DetectedFile[],
  donemAylari: number[] // [1, 2, 3] for Q1
): {
  eksikler: { tip: string; aciklama: string; oncelik: 'YUKSEK' | 'ORTA' | 'DUSUK' }[];
  tamamlanmaOrani: number;
} {
  const stats = getDetectionStats(files);
  const eksikler: { tip: string; aciklama: string; oncelik: 'YUKSEK' | 'ORTA' | 'DUSUK' }[] = [];

  // Kritik belgeler (YUKSEK oncelik)
  if (stats.byType.MIZAN_EXCEL === 0) {
    eksikler.push({ tip: 'Mizan', aciklama: 'Donem mizani bulunamadi', oncelik: 'YUKSEK' });
  }

  // KDV beyanneleri - her ay icin kontrol
  const kdvSayisi = stats.byType.KDV_BEYANNAME_PDF;
  if (kdvSayisi < donemAylari.length) {
    eksikler.push({
      tip: 'KDV Beyanname',
      aciklama: `${donemAylari.length} aylik donem icin ${kdvSayisi} KDV beyannamesi bulundu`,
      oncelik: 'YUKSEK'
    });
  }

  // Muhtasar
  const muhtasarSayisi = stats.byType.MUHTASAR_BEYANNAME_PDF;
  if (muhtasarSayisi < donemAylari.length) {
    eksikler.push({
      tip: 'Muhtasar Beyanname',
      aciklama: `${donemAylari.length} aylik donem icin ${muhtasarSayisi} muhtasar beyannamesi bulundu`,
      oncelik: 'YUKSEK'
    });
  }

  // e-Defter (ORTA oncelik)
  if (stats.byCategory.eDefter === 0) {
    eksikler.push({ tip: 'e-Defter', aciklama: 'e-Defter dosyalari bulunamadi', oncelik: 'ORTA' });
  }

  // Banka ekstreleri (ORTA oncelik)
  if (stats.byCategory.banka === 0) {
    eksikler.push({ tip: 'Banka Ekstre', aciklama: 'Banka ekstresi bulunamadi', oncelik: 'ORTA' });
  }

  // SGK (ORTA oncelik)
  if (stats.byCategory.sgk === 0) {
    eksikler.push({ tip: 'SGK', aciklama: 'SGK dokumanlari bulunamadi', oncelik: 'ORTA' });
  }

  // Gecici vergi - ceyreklik (DUSUK oncelik - ceyrek sonunda kontrol edilir)
  if (stats.byType.GECICI_VERGI_BEYANNAME_PDF === 0) {
    eksikler.push({ tip: 'Gecici Vergi', aciklama: 'Gecici vergi beyannamesi bulunamadi', oncelik: 'DUSUK' });
  }

  // Tamamlanma orani hesapla (temel belgeler bazinda)
  const temelBelgeSayisi = 6; // Mizan, KDV*3, Muhtasar*3 veya ceyreklik varyant
  const bulunanTemel = Math.min(stats.byType.MIZAN_EXCEL, 1) +
                       Math.min(kdvSayisi, donemAylari.length) +
                       Math.min(muhtasarSayisi, donemAylari.length);
  const beklenenTemel = 1 + donemAylari.length * 2; // 1 mizan + aylik KDV + aylik Muhtasar

  const tamamlanmaOrani = Math.round((bulunanTemel / beklenenTemel) * 100);

  return {
    eksikler,
    tamamlanmaOrani: Math.min(tamamlanmaOrani, 100),
  };
}
