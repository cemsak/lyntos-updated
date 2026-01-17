/**
 * LYNTOS Akilli Dosya Algilama
 * Icerik bazli dosya tipi tespiti
 */

import type { DetectedFile, DetectedFileType } from '../types';
import { getFileExtension, extractPeriodFromPath } from './zipHandler';

const generateId = () => `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
 */
async function detectExcelType(
  base: Omit<DetectedFile, 'fileType' | 'confidence' | 'detectionMethod' | 'metadata'>,
  _content: ArrayBuffer,
  fileName: string
): Promise<DetectedFile> {
  const lowerName = fileName.toLowerCase();

  // Dosya adindan tespit
  if (lowerName.includes('mizan')) {
    return {
      ...base,
      fileType: 'MIZAN_EXCEL',
      confidence: 90,
      detectionMethod: 'filename',
      metadata: { donem: extractPeriodFromPath(base.originalPath) },
    };
  }

  if (lowerName.includes('yevmiye')) {
    return {
      ...base,
      fileType: 'YEVMIYE_EXCEL',
      confidence: 90,
      detectionMethod: 'filename',
      metadata: { donem: extractPeriodFromPath(base.originalPath) },
    };
  }

  if (lowerName.includes('kebir')) {
    return {
      ...base,
      fileType: 'KEBIR_EXCEL',
      confidence: 90,
      detectionMethod: 'filename',
      metadata: { donem: extractPeriodFromPath(base.originalPath) },
    };
  }

  // Icerik analizi gerekli - simdilik filename bazli
  return {
    ...base,
    fileType: 'UNKNOWN',
    confidence: 30,
    detectionMethod: 'filename',
    metadata: {},
  };
}

/**
 * CSV dosyasi tipini tespit et (banka ekstreleri)
 */
async function detectCSVType(
  base: Omit<DetectedFile, 'fileType' | 'confidence' | 'detectionMethod' | 'metadata'>,
  _content: ArrayBuffer,
  fileName: string
): Promise<DetectedFile> {
  const lowerName = fileName.toLowerCase();

  // Dosya adindan banka tespit et
  let banka: string | undefined;
  let muhasebeKodu: string | undefined;

  if (lowerName.includes('ykb') || lowerName.includes('yapi kredi')) {
    banka = 'YKB';
  } else if (lowerName.includes('akbank')) {
    banka = 'AKBANK';
  } else if (lowerName.includes('halkbank') || lowerName.includes('halk')) {
    banka = 'HALKBANK';
  } else if (lowerName.includes('ziraat')) {
    banka = 'ZIRAAT';
  } else if (lowerName.includes('albaraka')) {
    banka = 'ALBARAKA';
  }

  // Muhasebe hesap kodunu cikar (102.01, 102.19 vb.)
  const hesapMatch = fileName.match(/102\.(\d{2})/);
  if (hesapMatch) {
    muhasebeKodu = `102.${hesapMatch[1]}`;
  }

  if (banka || muhasebeKodu) {
    return {
      ...base,
      fileType: 'BANKA_EKSTRE_CSV',
      confidence: 85,
      detectionMethod: 'filename',
      metadata: {
        banka,
        donem: extractPeriodFromPath(base.originalPath),
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
 * XML dosyasi tipini tespit et (e-Defter)
 */
async function detectXMLType(
  base: Omit<DetectedFile, 'fileType' | 'confidence' | 'detectionMethod' | 'metadata'>,
  content: ArrayBuffer,
  fileName: string
): Promise<DetectedFile> {
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

  // Icerik analizi
  const decoder = new TextDecoder('utf-8');
  const text = decoder.decode(content.slice(0, 2000));

  if (text.includes('edefter.gov.tr') || text.includes('xbrl.org/int/gl')) {
    return {
      ...base,
      fileType: 'E_DEFTER_YEVMIYE_XML', // Varsayilan
      confidence: 70,
      detectionMethod: 'content',
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
 */
async function detectPDFType(
  base: Omit<DetectedFile, 'fileType' | 'confidence' | 'detectionMethod' | 'metadata'>,
  _content: ArrayBuffer,
  fileName: string
): Promise<DetectedFile> {
  const lowerName = fileName.toLowerCase();

  let fileType: DetectedFileType = 'UNKNOWN';
  let confidence = 0;
  let ay: string | undefined;

  // Ay tespit et
  const aylar = ['ocak', 'subat', 'şubat', 'mart', 'nisan', 'mayis', 'haziran',
                 'temmuz', 'agustos', 'ağustos', 'eylul', 'eylül', 'ekim', 'kasim', 'aralik'];
  for (const a of aylar) {
    if (lowerName.includes(a)) {
      ay = a.charAt(0).toUpperCase() + a.slice(1);
      break;
    }
  }

  // Tip tespit et
  if (lowerName.includes('kdv')) {
    if (lowerName.includes('byn')) {
      fileType = 'KDV_BEYANNAME_PDF';
      confidence = 90;
    } else if (lowerName.includes('thk')) {
      fileType = 'KDV_TAHAKKUK_PDF';
      confidence = 90;
    }
  } else if (lowerName.includes('muhtasar')) {
    if (lowerName.includes('byn')) {
      fileType = 'MUHTASAR_BEYANNAME_PDF';
      confidence = 90;
    } else if (lowerName.includes('thk')) {
      fileType = 'MUHTASAR_TAHAKKUK_PDF';
      confidence = 90;
    }
  } else if (lowerName.includes('gecici') || lowerName.includes('geçici')) {
    if (lowerName.includes('byn')) {
      fileType = 'GECICI_VERGI_BEYANNAME_PDF';
      confidence = 90;
    } else if (lowerName.includes('thk')) {
      fileType = 'GECICI_VERGI_TAHAKKUK_PDF';
      confidence = 90;
    }
  } else if (lowerName.includes('levha')) {
    fileType = 'VERGI_LEVHASI_PDF';
    confidence = 85;
  }

  return {
    ...base,
    fileType,
    confidence,
    detectionMethod: 'filename',
    metadata: { ay, donem: extractPeriodFromPath(base.originalPath) },
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
 * Dosya tipine gore grupla
 */
export function groupFilesByType(files: DetectedFile[]): Record<DetectedFileType, DetectedFile[]> {
  const groups: Record<DetectedFileType, DetectedFile[]> = {
    MIZAN_EXCEL: [],
    YEVMIYE_EXCEL: [],
    KEBIR_EXCEL: [],
    E_DEFTER_YEVMIYE_XML: [],
    E_DEFTER_KEBIR_XML: [],
    E_DEFTER_BERAT_XML: [],
    E_DEFTER_RAPOR_XML: [],
    BANKA_EKSTRE_CSV: [],
    KDV_BEYANNAME_PDF: [],
    KDV_TAHAKKUK_PDF: [],
    MUHTASAR_BEYANNAME_PDF: [],
    MUHTASAR_TAHAKKUK_PDF: [],
    GECICI_VERGI_BEYANNAME_PDF: [],
    GECICI_VERGI_TAHAKKUK_PDF: [],
    VERGI_LEVHASI_PDF: [],
    UNKNOWN: [],
  };

  for (const file of files) {
    groups[file.fileType].push(file);
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
} {
  const byType: Record<DetectedFileType, number> = {
    MIZAN_EXCEL: 0,
    YEVMIYE_EXCEL: 0,
    KEBIR_EXCEL: 0,
    E_DEFTER_YEVMIYE_XML: 0,
    E_DEFTER_KEBIR_XML: 0,
    E_DEFTER_BERAT_XML: 0,
    E_DEFTER_RAPOR_XML: 0,
    BANKA_EKSTRE_CSV: 0,
    KDV_BEYANNAME_PDF: 0,
    KDV_TAHAKKUK_PDF: 0,
    MUHTASAR_BEYANNAME_PDF: 0,
    MUHTASAR_TAHAKKUK_PDF: 0,
    GECICI_VERGI_BEYANNAME_PDF: 0,
    GECICI_VERGI_TAHAKKUK_PDF: 0,
    VERGI_LEVHASI_PDF: 0,
    UNKNOWN: 0,
  };

  let totalConfidence = 0;

  for (const file of files) {
    byType[file.fileType]++;
    totalConfidence += file.confidence;
  }

  const unknown = byType.UNKNOWN;
  const detected = files.length - unknown;

  return {
    total: files.length,
    detected,
    unknown,
    byType,
    averageConfidence: files.length > 0 ? totalConfidence / files.length : 0,
  };
}
