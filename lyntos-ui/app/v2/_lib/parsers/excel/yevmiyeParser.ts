/**
 * LYNTOS Yevmiye Defteri Parser
 * Excel formaindan yevmiye fislerini okur
 *
 * Format:
 * - Header satir: 5 (HESAP KODU, HESAP ADI, ACIKLAMA, DETAY, BORC, ALACAK)
 * - Fis gruplari: "00001-----00001-----" pattern ile ayrilir
 */

// P-6: xlsx dynamic import (~100KB bundle azaltma)
import type { ParsedYevmiye, YevmiyeKayit, YevmiyeSatir, DetectedFile } from '../types';

type XLSX = typeof import('xlsx');

interface YevmiyeHeaderMapping {
  hesapKodu: number;
  hesapAdi: number;
  aciklama: number;
  detay: number;
  borc: number;
  alacak: number;
  tarih?: number;
  fisNo?: number;
}

const YEVMIYE_HEADER_VARIANTS = {
  hesapKodu: ['HESAP KODU', 'HESAP_KODU', 'KOD'],
  hesapAdi: ['HESAP ADI', 'HESAP_ADI', 'AD', 'ADI'],
  aciklama: ['ACIKLAMA', 'AÇIKLAMA', 'Aciklama'],
  detay: ['DETAY', 'Detay', 'DETAYI'],
  borc: ['BORC', 'BORÇ', 'Borc'],
  alacak: ['ALACAK', 'Alacak'],
  tarih: ['TARIH', 'TARİH', 'Tarih'],
  fisNo: ['FIS NO', 'FİŞ NO', 'Fis No', 'MADDE NO']
};

function findYevmiyeHeader(xl: XLSX, sheet: import('xlsx').WorkSheet): { row: number; mapping: YevmiyeHeaderMapping } | null {
  const ref = sheet['!ref'];
  if (!ref) return null;

  const range = xl.utils.decode_range(ref);

  for (let r = 0; r <= Math.min(10, range.e.r); r++) {
    const mapping: Partial<YevmiyeHeaderMapping> = {};

    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellAddr = xl.utils.encode_cell({ r, c });
      const cell = sheet[cellAddr];
      if (!cell || !cell.v) continue;

      const val = String(cell.v).trim().toUpperCase();

      for (const [key, variants] of Object.entries(YEVMIYE_HEADER_VARIANTS)) {
        if (variants.some(v => val.includes(v.toUpperCase()))) {
          mapping[key as keyof YevmiyeHeaderMapping] = c;
          break;
        }
      }
    }

    if (mapping.hesapKodu !== undefined && mapping.borc !== undefined) {
      return {
        row: r,
        mapping: {
          hesapKodu: mapping.hesapKodu,
          hesapAdi: mapping.hesapAdi ?? -1,
          aciklama: mapping.aciklama ?? -1,
          detay: mapping.detay ?? -1,
          borc: mapping.borc,
          alacak: mapping.alacak ?? -1,
          tarih: mapping.tarih,
          fisNo: mapping.fisNo
        }
      };
    }
  }

  return null;
}

function parseNumeric(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;

  const str = String(value)
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function isFisSeparator(row: string[]): boolean {
  // "00001-----00001-----" pattern
  const combined = row.join('');
  return /^\d{5}-{5,}/.test(combined) || combined.includes('-----');
}

function extractFisNo(row: string[]): number | null {
  const combined = row.join('');
  const match = combined.match(/(\d{5})-{5,}/);
  return match ? parseInt(match[1], 10) : null;
}

function extractDonemFromFilename(filename: string): string {
  const qMatch = filename.match(/Q([1-4])/i);
  if (qMatch) return `Q${qMatch[1]}`;

  const dateMatch = filename.match(/(\d{4})[-\/]?(\d{2})/);
  if (dateMatch) return `${dateMatch[1]}-${dateMatch[2]}`;

  return new Date().getFullYear().toString();
}

export async function parseYevmiye(file: DetectedFile): Promise<ParsedYevmiye> {
  if (!file.rawContent) {
    throw new Error('Dosya icerigi bulunamadi');
  }

  // P-6: Dynamic import — sadece parse sırasında yüklenir (~100KB tasarruf)
  const xl = await import('xlsx');

  const workbook = xl.read(file.rawContent, { type: 'array' });

  // Sheet bul
  let sheetName = workbook.SheetNames.find(
    name => name.toUpperCase().includes('YEVMİYE') || name.toUpperCase().includes('YEVMIYE')
  );
  if (!sheetName) {
    sheetName = workbook.SheetNames[0];
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" okunamadi`);
  }

  const headerInfo = findYevmiyeHeader(xl, sheet);
  if (!headerInfo) {
    throw new Error('Yevmiye header satiri bulunamadi');
  }

  const { row: headerRow, mapping } = headerInfo;
  const ref = sheet['!ref'];
  if (!ref) {
    throw new Error('Sheet referansi bulunamadi');
  }
  const range = xl.utils.decode_range(ref);

  // Tum satirlari oku
  const allRows: { data: string[]; rowNum: number }[] = [];
  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const rowData: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[xl.utils.encode_cell({ r, c })];
      rowData.push(cell?.v !== undefined ? String(cell.v) : '');
    }
    allRows.push({ data: rowData, rowNum: r });
  }

  // Fislere ayir
  const kayitlar: YevmiyeKayit[] = [];
  let currentFis: YevmiyeKayit | null = null;
  let fisIndex = 0;

  for (const { data } of allRows) {
    if (isFisSeparator(data)) {
      // Onceki fisi kaydet
      if (currentFis && currentFis.satirlar.length > 0) {
        kayitlar.push(currentFis);
      }

      // Yeni fis baslat
      fisIndex++;
      const fisNo = extractFisNo(data) || fisIndex;
      currentFis = {
        fisNo,
        tarih: '',
        aciklama: '',
        satirlar: [],
        borcToplam: 0,
        alacakToplam: 0
      };
      continue;
    }

    // Bos satir atla
    const hesapKodu = data[mapping.hesapKodu]?.trim();
    if (!hesapKodu) continue;

    // Ilk fis henuz baslamadiysa
    if (!currentFis) {
      currentFis = {
        fisNo: fisIndex + 1,
        tarih: '',
        aciklama: '',
        satirlar: [],
        borcToplam: 0,
        alacakToplam: 0
      };
    }

    const borc = parseNumeric(data[mapping.borc]);
    const alacak = mapping.alacak >= 0 ? parseNumeric(data[mapping.alacak]) : 0;

    const satir: YevmiyeSatir = {
      hesapKodu,
      hesapAdi: mapping.hesapAdi >= 0 ? data[mapping.hesapAdi]?.trim() || '' : '',
      aciklama: mapping.aciklama >= 0 ? data[mapping.aciklama]?.trim() || '' : '',
      detay: mapping.detay >= 0 ? data[mapping.detay]?.trim() || '' : undefined,
      borc,
      alacak
    };

    currentFis.satirlar.push(satir);
    currentFis.borcToplam += borc;
    currentFis.alacakToplam += alacak;

    // Fis aciklamasini ilk satirdan al
    if (!currentFis.aciklama && satir.aciklama) {
      currentFis.aciklama = satir.aciklama;
    }
  }

  // Son fisi kaydet
  if (currentFis && currentFis.satirlar.length > 0) {
    kayitlar.push(currentFis);
  }

  // Toplamlari hesapla
  let toplamBorc = 0;
  let toplamAlacak = 0;

  for (const kayit of kayitlar) {
    toplamBorc += kayit.borcToplam;
    toplamAlacak += kayit.alacakToplam;
  }

  const donem = extractDonemFromFilename(file.fileName);

  return {
    firmaAdi: '',
    vkn: file.metadata.vkn,
    donem,
    tarihAraligi: {
      baslangic: '',
      bitis: ''
    },
    kayitlar,
    toplamlar: {
      kayitSayisi: kayitlar.length,
      borcToplam: toplamBorc,
      alacakToplam: toplamAlacak
    },
    parseInfo: {
      kaynak: file.fileName,
      parseTarihi: new Date().toISOString()
    }
  };
}
