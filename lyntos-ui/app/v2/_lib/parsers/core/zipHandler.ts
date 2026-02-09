/**
 * LYNTOS ZIP Handler
 * Q1.zip, Q2.zip vb. dosyalari acar ve icerigi listeler
 */

import JSZip from 'jszip';

export interface ZipContent {
  files: {
    path: string;
    name: string;
    size: number;
    content: ArrayBuffer;
  }[];
  structure: string[];
}

export async function extractZip(file: File): Promise<ZipContent> {
  const zip = new JSZip();
  const content = await zip.loadAsync(file);

  const files: ZipContent['files'] = [];
  const structure: string[] = [];

  for (const [path, zipEntry] of Object.entries(content.files)) {
    if (zipEntry.dir) {
      structure.push(path);
      continue;
    }

    // __MACOSX klasorunu atla
    if (path.includes('__MACOSX')) continue;

    const arrayBuffer = await zipEntry.async('arraybuffer');
    const name = path.split('/').pop() || path;

    files.push({
      path,
      name,
      size: arrayBuffer.byteLength,
      content: arrayBuffer,
    });
  }

  return { files, structure };
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

export function extractPeriodFromPath(path: string, defaultYear?: number): string | undefined {
  // "Q1 E DEFTER 01" -> "2026-01" (yıl dinamik)
  // "Q1 OZKAN KIRT_OCAK_..." -> "2026-01"
  // "2025_Q1/mizan.xlsx" -> "2025-01" (yıl path'den çıkarılır)

  // 1. Path'ten yılı çıkarmaya çalış
  const yearMatch = path.match(/(20\d{2})/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : (defaultYear ?? new Date().getFullYear());

  const ayMap: Record<string, string> = {
    'OCAK': '01', 'ocak': '01',
    'SUBAT': '02', 'subat': '02', 'ŞUBAT': '02',
    'MART': '03', 'mart': '03',
    'NISAN': '04', 'nisan': '04', 'NİSAN': '04',
    'MAYIS': '05', 'mayis': '05',
    'HAZIRAN': '06', 'haziran': '06', 'HAZİRAN': '06',
    'TEMMUZ': '07', 'temmuz': '07',
    'AGUSTOS': '08', 'agustos': '08', 'AĞUSTOS': '08',
    'EYLUL': '09', 'eylul': '09', 'EYLÜL': '09',
    'EKIM': '10', 'ekim': '10', 'EKİM': '10',
    'KASIM': '11', 'kasim': '11',
    'ARALIK': '12', 'aralik': '12',
    '01': '01', '02': '02', '03': '03',
  };

  for (const [ay, num] of Object.entries(ayMap)) {
    if (path.includes(ay) || path.includes(`_${ay}_`)) {
      return `${year}-${num}`;
    }
  }

  // E DEFTER klasorunden
  const eDefterMatch = path.match(/E DEFTER (\d{2})/i);
  if (eDefterMatch) {
    return `${year}-${eDefterMatch[1]}`;
  }

  return undefined;
}

/**
 * ZIP dosya adından çeyrek bilgisini çıkar
 */
export function extractQuarterFromFilename(filename: string): 'Q1' | 'Q2' | 'Q3' | 'Q4' | undefined {
  const lower = filename.toLowerCase();
  if (lower.includes('q1') || lower.includes('1.ceyrek')) return 'Q1';
  if (lower.includes('q2') || lower.includes('2.ceyrek')) return 'Q2';
  if (lower.includes('q3') || lower.includes('3.ceyrek')) return 'Q3';
  if (lower.includes('q4') || lower.includes('4.ceyrek')) return 'Q4';
  return undefined;
}

/**
 * Çeyreğe göre ayları döndür
 */
export function getMonthsForQuarter(quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'): number[] {
  switch (quarter) {
    case 'Q1': return [1, 2, 3];
    case 'Q2': return [4, 5, 6];
    case 'Q3': return [7, 8, 9];
    case 'Q4': return [10, 11, 12];
  }
}
