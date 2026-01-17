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

// Cross-Check Engine
export * from './crosscheck';

// Universal parser router
import type { DetectedFile } from './types';
import { parseMizan } from './excel/mizanParser';
import { parseYevmiye } from './excel/yevmiyeParser';
import { parseKebir } from './excel/kebirParser';
import { parseEDefter } from './xml/edefterParser';
import { parseKDVBeyanname } from './pdf/kdvParser';
import { parseMuhtasar } from './pdf/muhtasarParser';
import { parseGeciciVergi } from './pdf/geciciVergiParser';
import { parseBankaEkstre } from './csv/bankaParser';

export async function parseFile(file: DetectedFile) {
  switch (file.fileType) {
    case 'MIZAN_EXCEL':
      return { type: 'mizan' as const, data: await parseMizan(file) };
    case 'YEVMIYE_EXCEL':
      return { type: 'yevmiye' as const, data: await parseYevmiye(file) };
    case 'KEBIR_EXCEL':
      return { type: 'kebir' as const, data: await parseKebir(file) };
    case 'E_DEFTER_YEVMIYE_XML':
    case 'E_DEFTER_KEBIR_XML':
    case 'E_DEFTER_BERAT_XML':
    case 'E_DEFTER_RAPOR_XML':
      return { type: 'edefter' as const, data: await parseEDefter(file) };
    case 'KDV_BEYANNAME_PDF':
    case 'KDV_TAHAKKUK_PDF':
      return { type: 'kdv' as const, data: await parseKDVBeyanname(file) };
    case 'MUHTASAR_BEYANNAME_PDF':
    case 'MUHTASAR_TAHAKKUK_PDF':
      return { type: 'muhtasar' as const, data: await parseMuhtasar(file) };
    case 'GECICI_VERGI_BEYANNAME_PDF':
    case 'GECICI_VERGI_TAHAKKUK_PDF':
      return { type: 'gecici_vergi' as const, data: await parseGeciciVergi(file) };
    case 'BANKA_EKSTRE_CSV':
      return { type: 'banka' as const, data: await parseBankaEkstre(file) };
    default:
      throw new Error(`Desteklenmeyen dosya tipi: ${file.fileType}`);
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
