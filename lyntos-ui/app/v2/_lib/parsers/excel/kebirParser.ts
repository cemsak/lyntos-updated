/**
 * LYNTOS Kebir Defteri Parser
 * Excel formatindan kebir defteri okur
 *
 * Format:
 * - Header satir: 0 (KEBIR HESAP, TARIH, MADDE NO, FIS NO, EVRAK NO, HESAP KODU, HESAP ADI...)
 * - Hesap gruplari: Ilk sutunda ana hesap kodu
 */

// P-6: xlsx dynamic import (~100KB bundle azaltma)
import type { ParsedKebir, KebirHesapOzet, KebirHareket, DetectedFile } from '../types';

type XLSX = typeof import('xlsx');

interface KebirHeaderMapping {
  kebirHesap: number;
  tarih: number;
  maddeNo: number;
  fisNo: number;
  evrakNo: number;
  hesapKodu: number;
  hesapAdi: number;
  aciklama: number;
  borc: number;
  alacak: number;
}

function findKebirHeader(xl: XLSX, sheet: import('xlsx').WorkSheet): { row: number; mapping: KebirHeaderMapping } | null {
  const ref = sheet['!ref'];
  if (!ref) return null;

  const range = xl.utils.decode_range(ref);

  for (let r = 0; r <= Math.min(5, range.e.r); r++) {
    let foundKebir = false;
    let foundBorc = false;
    const mapping: Partial<KebirHeaderMapping> = {};

    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[xl.utils.encode_cell({ r, c })];
      if (!cell?.v) continue;

      const val = String(cell.v).trim().toUpperCase();

      if (val.includes('KEBİR') || val.includes('KEBIR')) {
        mapping.kebirHesap = c;
        foundKebir = true;
      } else if (val.includes('TARİH') || val.includes('TARIH')) {
        mapping.tarih = c;
      } else if (val.includes('MADDE')) {
        mapping.maddeNo = c;
      } else if (val.includes('FİŞ') || val.includes('FIS')) {
        mapping.fisNo = c;
      } else if (val.includes('EVRAK')) {
        mapping.evrakNo = c;
      } else if (val.includes('HESAP KODU') || val.includes('KOD')) {
        mapping.hesapKodu = c;
      } else if (val.includes('HESAP AD') || val === 'AD' || val === 'ADI') {
        mapping.hesapAdi = c;
      } else if (val.includes('AÇIKLAMA') || val.includes('ACIKLAMA')) {
        mapping.aciklama = c;
      } else if (val.includes('BORÇ') || val.includes('BORC')) {
        mapping.borc = c;
        foundBorc = true;
      } else if (val.includes('ALACAK')) {
        mapping.alacak = c;
      }
    }

    if (foundKebir || foundBorc) {
      return {
        row: r,
        mapping: {
          kebirHesap: mapping.kebirHesap ?? 0,
          tarih: mapping.tarih ?? -1,
          maddeNo: mapping.maddeNo ?? -1,
          fisNo: mapping.fisNo ?? -1,
          evrakNo: mapping.evrakNo ?? -1,
          hesapKodu: mapping.hesapKodu ?? -1,
          hesapAdi: mapping.hesapAdi ?? -1,
          aciklama: mapping.aciklama ?? -1,
          borc: mapping.borc ?? -1,
          alacak: mapping.alacak ?? -1
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

// Note: parseDate needs XLSX.SSF — we pass xl instance from caller
let _xlInstance: XLSX | null = null;

function parseDate(value: unknown): string {
  if (!value) return '';

  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  // Excel serial date
  if (typeof value === 'number' && _xlInstance) {
    const date = _xlInstance.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }

  // String date
  const str = String(value);
  const match = str.match(/(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    return `${year}-${month}-${day}`;
  }

  return '';
}

function extractDonemFromFilename(filename: string): string {
  const qMatch = filename.match(/Q([1-4])/i);
  if (qMatch) return `Q${qMatch[1]}`;

  const dateMatch = filename.match(/(\d{4})[-\/]?(\d{2})/);
  if (dateMatch) return `${dateMatch[1]}-${dateMatch[2]}`;

  return new Date().getFullYear().toString();
}

export async function parseKebir(file: DetectedFile): Promise<ParsedKebir> {
  if (!file.rawContent) {
    throw new Error('Dosya icerigi bulunamadi');
  }

  // P-6: Dynamic import — sadece parse sırasında yüklenir (~100KB tasarruf)
  const xl = await import('xlsx');
  _xlInstance = xl;

  const workbook = xl.read(file.rawContent, { type: 'array' });

  // Sheet bul
  let sheetName = workbook.SheetNames.find(
    name => name.toUpperCase().includes('KEBİR') || name.toUpperCase().includes('KEBIR')
  );
  if (!sheetName) {
    sheetName = workbook.SheetNames[0];
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" okunamadi`);
  }

  const headerInfo = findKebirHeader(xl, sheet);
  if (!headerInfo) {
    throw new Error('Kebir header satiri bulunamadi');
  }

  const { row: headerRow, mapping } = headerInfo;
  const ref = sheet['!ref'];
  if (!ref) {
    throw new Error('Sheet referansi bulunamadi');
  }
  const range = xl.utils.decode_range(ref);

  // Hesaplari topla
  const hesapMap = new Map<string, KebirHesapOzet>();
  let currentKebirHesap: string | null = null;

  for (let r = headerRow + 1; r <= range.e.r; r++) {
    // Kebir hesap sutununu kontrol et
    const kebirCell = sheet[xl.utils.encode_cell({ r, c: mapping.kebirHesap })];
    if (kebirCell?.v) {
      const kebirVal = String(kebirCell.v).trim();
      // Yeni ana hesap mi?
      if (/^\d{3}/.test(kebirVal) && !kebirVal.includes('.')) {
        currentKebirHesap = kebirVal;
        if (!hesapMap.has(currentKebirHesap)) {
          hesapMap.set(currentKebirHesap, {
            anaHesapKodu: currentKebirHesap,
            anaHesapAdi: '',
            hareketler: [],
            borcToplam: 0,
            alacakToplam: 0,
            sonBakiye: 0
          });
        }
      }
    }

    if (!currentKebirHesap) continue;

    // Hareket satiri mi?
    const borcVal = mapping.borc >= 0 ? parseNumeric(sheet[xl.utils.encode_cell({ r, c: mapping.borc })]?.v) : 0;
    const alacakVal = mapping.alacak >= 0 ? parseNumeric(sheet[xl.utils.encode_cell({ r, c: mapping.alacak })]?.v) : 0;

    // En az borc veya alacak olmali
    if (borcVal === 0 && alacakVal === 0) continue;

    const hesap = hesapMap.get(currentKebirHesap)!;

    const hareket: KebirHareket = {
      tarih: mapping.tarih >= 0 ? parseDate(sheet[xl.utils.encode_cell({ r, c: mapping.tarih })]?.v) : '',
      maddeNo: mapping.maddeNo >= 0 ? parseNumeric(sheet[xl.utils.encode_cell({ r, c: mapping.maddeNo })]?.v) : 0,
      fisNo: mapping.fisNo >= 0 ? parseNumeric(sheet[xl.utils.encode_cell({ r, c: mapping.fisNo })]?.v) : 0,
      evrakNo: mapping.evrakNo >= 0 ? String(sheet[xl.utils.encode_cell({ r, c: mapping.evrakNo })]?.v || '') : '',
      evrakTarihi: '',
      hesapKodu: mapping.hesapKodu >= 0 ? String(sheet[xl.utils.encode_cell({ r, c: mapping.hesapKodu })]?.v || '') : '',
      hesapAdi: mapping.hesapAdi >= 0 ? String(sheet[xl.utils.encode_cell({ r, c: mapping.hesapAdi })]?.v || '') : '',
      aciklama: mapping.aciklama >= 0 ? String(sheet[xl.utils.encode_cell({ r, c: mapping.aciklama })]?.v || '') : '',
      borc: borcVal,
      alacak: alacakVal,
      bakiye: borcVal - alacakVal,
      bakiyeYonu: borcVal >= alacakVal ? 'B' : 'A'
    };

    hesap.hareketler.push(hareket);
    hesap.borcToplam += borcVal;
    hesap.alacakToplam += alacakVal;

    // Hesap adini ilk hareketten al
    if (!hesap.anaHesapAdi && hareket.hesapAdi) {
      hesap.anaHesapAdi = hareket.hesapAdi;
    }
  }

  // Bakiyeleri hesapla
  const hesaplar = Array.from(hesapMap.values());
  for (const hesap of hesaplar) {
    hesap.sonBakiye = hesap.borcToplam - hesap.alacakToplam;
  }

  // Genel toplamlar
  const toplamHareket = hesaplar.reduce((sum, h) => sum + h.hareketler.length, 0);

  const donem = extractDonemFromFilename(file.fileName);

  return {
    firmaAdi: '',
    vkn: file.metadata.vkn,
    donem,
    tarihAraligi: {
      baslangic: '',
      bitis: ''
    },
    hesaplar,
    toplamlar: {
      hesapSayisi: hesaplar.length,
      hareketSayisi: toplamHareket
    },
    parseInfo: {
      kaynak: file.fileName,
      parseTarihi: new Date().toISOString()
    }
  };
}
