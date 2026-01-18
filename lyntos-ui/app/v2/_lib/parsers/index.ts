/**
 * LYNTOS V2 - Parser Module Exports
 * TAM OTOMASYON Sistemi
 */

// Types
export * from './types';

// Core - ZIP Handler
export {
  extractZip,
  getFileExtension,
  extractPeriodFromPath,
  extractQuarterFromFilename,
  getMonthsForQuarter,
  type ZipContent,
} from './core/zipHandler';

// Core - File Detector
export {
  detectFileType,
  detectMultipleFiles,
  groupFilesByType,
  getDetectionStats,
  analyzeMissingDocuments,
} from './core/fileDetector';

// Excel Parsers
export { parseMizan } from './excel/mizanParser';
export { parseYevmiye } from './excel/yevmiyeParser';
export { parseKebir } from './excel/kebirParser';

// XML Parsers
export { parseEDefter } from './xml/edefterParser';

// PDF Parsers
export { parseKDVBeyanname } from './pdf/kdvParser';
export { parseMuhtasar } from './pdf/muhtasarParser';
export { parseGeciciVergi } from './pdf/geciciVergiParser';

// CSV Parsers
export { parseBankaEkstre } from './csv/bankaParser';

// e-Fatura Parser
export {
  parseEFatura,
  parseEFaturaFromBuffer,
  parseMultipleEFatura,
  getEFaturaStats,
  type ParsedEFatura,
  type EFaturaHeader,
  type EFaturaParti,
  type EFaturaKalem,
  type EFaturaVergi,
  type EFaturaToplam,
} from './eFaturaParser';

// Cross-Check Engine
export * from './crosscheck';

// Universal parser router
import type { DetectedFile } from './types';
import { parseMizan } from './excel/mizanParser';
import { parseYevmiye } from './excel/yevmiyeParser';
import { parseKebir } from './excel/kebirParser';
import { parseEDefter } from './xml/edefterParser';
import { parseEFaturaFromBuffer } from './eFaturaParser';
import { parseKDVBeyanname } from './pdf/kdvParser';
import { parseMuhtasar } from './pdf/muhtasarParser';
import { parseGeciciVergi } from './pdf/geciciVergiParser';
import { parseBankaEkstre } from './csv/bankaParser';
import { parseAPHBExcel } from './aphbParser';

export async function parseFile(file: DetectedFile) {
  switch (file.fileType) {
    // Excel - Muhasebe Defterleri
    case 'MIZAN_EXCEL':
      return { type: 'mizan' as const, data: await parseMizan(file) };
    case 'YEVMIYE_EXCEL':
      return { type: 'yevmiye' as const, data: await parseYevmiye(file) };
    case 'KEBIR_EXCEL':
      return { type: 'kebir' as const, data: await parseKebir(file) };

    // Excel - Mali Tablolar (henuz parser yok)
    case 'HESAP_PLANI_EXCEL':
    case 'BILANCO_EXCEL':
    case 'GELIR_TABLOSU_EXCEL':
    case 'SGK_EKSIK_GUN_EXCEL':
      return { type: 'unsupported' as const, data: null, message: `${file.fileType} henuz desteklenmiyor` };

    // SGK APHB Excel
    case 'SGK_APHB_EXCEL':
      return { type: 'aphb' as const, data: parseAPHBExcel(file) };

    // e-Defter (XML)
    case 'E_DEFTER_YEVMIYE_XML':
    case 'E_DEFTER_KEBIR_XML':
    case 'E_DEFTER_BERAT_XML':
    case 'E_DEFTER_RAPOR_XML':
      return { type: 'edefter' as const, data: await parseEDefter(file) };

    // e-Belgeler (XML)
    case 'E_FATURA_XML':
    case 'E_ARSIV_XML':
      if (file.rawContent) {
        return { type: 'efatura' as const, data: parseEFaturaFromBuffer(file.rawContent, file.fileName) };
      }
      return { type: 'unsupported' as const, data: null, message: 'Dosya içeriği bulunamadı' };

    // e-Belgeler (XML) - henuz parser yok
    case 'E_IRSALIYE_XML':
    case 'E_SMM_XML':
      return { type: 'unsupported' as const, data: null, message: `${file.fileType} henuz desteklenmiyor` };

    // Banka Ekstreleri
    case 'BANKA_EKSTRE_CSV':
    case 'BANKA_EKSTRE_EXCEL':
      return { type: 'banka' as const, data: await parseBankaEkstre(file) };

    // Beyanname PDF'leri
    case 'KDV_BEYANNAME_PDF':
    case 'KDV_TAHAKKUK_PDF':
      return { type: 'kdv' as const, data: await parseKDVBeyanname(file) };
    case 'MUHTASAR_BEYANNAME_PDF':
    case 'MUHTASAR_TAHAKKUK_PDF':
      return { type: 'muhtasar' as const, data: await parseMuhtasar(file) };
    case 'GECICI_VERGI_BEYANNAME_PDF':
    case 'GECICI_VERGI_TAHAKKUK_PDF':
      return { type: 'gecici_vergi' as const, data: await parseGeciciVergi(file) };

    // Diger PDF'ler - henuz parser yok
    case 'KURUMLAR_VERGISI_PDF':
    case 'DAMGA_VERGISI_PDF':
    case 'VERGI_LEVHASI_PDF':
    case 'SGK_APHB_PDF':
    case 'SGK_EKSIK_GUN_PDF':
      return { type: 'unsupported' as const, data: null, message: `${file.fileType} henuz desteklenmiyor` };

    // Bilinmeyen
    case 'UNKNOWN':
    default:
      return { type: 'unknown' as const, data: null, message: 'Dosya tipi tespit edilemedi' };
  }
}

// Batch parser - tüm dosyaları paralel parse et
export async function parseAllFiles(files: DetectedFile[]) {
  const results = await Promise.allSettled(
    files.map(file => parseFile(file))
  );

  const parsed: { file: DetectedFile; result: Awaited<ReturnType<typeof parseFile>> }[] = [];
  const failed: { file: DetectedFile; error: string }[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      parsed.push({ file: files[index], result: result.value });
    } else {
      failed.push({
        file: files[index],
        error: result.reason instanceof Error ? result.reason.message : String(result.reason)
      });
    }
  });

  return { parsed, failed };
}

// MT940 Parser
export * from './mt940Parser';

// APHB/SGK Parser
export * from './aphbParser';

// Tahakkuk Parser (KDV, Muhtasar, Geçici Vergi, SGK)
export * from './tahakkukParser';

// Beyanname Parser (KDV, Muhtasar, MPHB, Geçici Vergi, Damga Vergisi)
export * from './beyannameParser';
