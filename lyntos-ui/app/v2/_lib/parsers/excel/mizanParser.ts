/**
 * LYNTOS Mizan Parser
 * Luca/Mikro/Logo Excel formatlarindan mizan okur
 *
 * Desteklenen formatlar:
 * - Header satir: 5 (HESAP KODU, HESAP ADI, BORC, ALACAK, BORC BAKIYESI, ALACAK BAKIYESI)
 * - Sheet adi: "MIZAN" veya ilk sheet
 */

import * as XLSX from 'xlsx';
import type { ParsedMizan, MizanHesap, DetectedFile } from '../types';

// Olasi header kolonlari (Turkce karakter varyasyonlari dahil)
const HEADER_VARIANTS = {
  hesapKodu: ['HESAP KODU', 'HESAP_KODU', 'HesapKodu', 'Hesap Kodu', 'KOD'],
  hesapAdi: ['HESAP ADI', 'HESAP_ADI', 'HesapAdi', 'Hesap Adi', 'AD', 'ADI'],
  borc: ['BORC', 'BORÇ', 'Borc', 'Borç', 'BORC TUTARI', 'BORÇ TUTARI'],
  alacak: ['ALACAK', 'Alacak', 'ALACAK TUTARI'],
  borcBakiye: ['BORC BAKIYESI', 'BORÇ BAKİYESİ', 'BORC_BAKIYESI', 'BorcBakiyesi', 'BORC BAK'],
  alacakBakiye: ['ALACAK BAKIYESI', 'ALACAK BAKİYESİ', 'ALACAK_BAKIYESI', 'AlacakBakiyesi', 'ALACAK BAK']
};

interface HeaderMapping {
  hesapKodu: number;
  hesapAdi: number;
  borc: number;
  alacak: number;
  borcBakiye: number;
  alacakBakiye: number;
}

function findHeaderRow(sheet: XLSX.WorkSheet): { row: number; mapping: HeaderMapping } | null {
  const ref = sheet['!ref'];
  if (!ref) return null;

  const range = XLSX.utils.decode_range(ref);

  // Ilk 10 satirda header ara
  for (let r = 0; r <= Math.min(10, range.e.r); r++) {
    const mapping: Partial<HeaderMapping> = {};

    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellAddr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellAddr];
      if (!cell || !cell.v) continue;

      const val = String(cell.v).trim().toUpperCase();

      // Her header tipini kontrol et
      for (const [key, variants] of Object.entries(HEADER_VARIANTS)) {
        if (variants.some(v => val.includes(v.toUpperCase()))) {
          mapping[key as keyof HeaderMapping] = c;
          break;
        }
      }
    }

    // En az hesapKodu ve hesapAdi bulunmali
    if (mapping.hesapKodu !== undefined && mapping.hesapAdi !== undefined) {
      return {
        row: r,
        mapping: {
          hesapKodu: mapping.hesapKodu,
          hesapAdi: mapping.hesapAdi,
          borc: mapping.borc ?? -1,
          alacak: mapping.alacak ?? -1,
          borcBakiye: mapping.borcBakiye ?? -1,
          alacakBakiye: mapping.alacakBakiye ?? -1
        }
      };
    }
  }

  return null;
}

function parseNumericValue(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;

  if (typeof value === 'number') return value;

  // String ise Turkce format donusumu
  const str = String(value)
    .replace(/\s/g, '')      // Bosluklari kaldir
    .replace(/\./g, '')      // Binlik ayiraci kaldir (TR: 1.000.000)
    .replace(/,/g, '.');     // Ondalik ayiraci duzelt (TR: 1000,50 -> 1000.50)

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function normalizeHesapKodu(kod: unknown): string {
  if (!kod) return '';
  return String(kod).trim().replace(/\s+/g, '');
}

function extractDonemFromFilename(filename: string): string {
  // Q1, Q2, Q3, Q4 pattern
  const qMatch = filename.match(/Q([1-4])/i);
  if (qMatch) return `Q${qMatch[1]}`;

  // 2025-01, 2025/01 pattern
  const dateMatch = filename.match(/(\d{4})[-\/]?(\d{2})/);
  if (dateMatch) return `${dateMatch[1]}-${dateMatch[2]}`;

  // OCAK, SUBAT vs.
  const aylar: Record<string, string> = {
    'OCAK': '01', 'SUBAT': '02', 'ŞUBAT': '02', 'MART': '03',
    'NISAN': '04', 'NİSAN': '04', 'MAYIS': '05', 'HAZIRAN': '06', 'HAZİRAN': '06',
    'TEMMUZ': '07', 'AGUSTOS': '08', 'AĞUSTOS': '08', 'EYLUL': '09', 'EYLÜL': '09',
    'EKIM': '10', 'EKİM': '10', 'KASIM': '11', 'ARALIK': '12'
  };

  for (const [ay, num] of Object.entries(aylar)) {
    if (filename.toUpperCase().includes(ay)) {
      const yilMatch = filename.match(/20\d{2}/);
      if (yilMatch) return `${yilMatch[0]}-${num}`;
    }
  }

  return new Date().getFullYear().toString();
}

export async function parseMizan(file: DetectedFile): Promise<ParsedMizan> {
  if (!file.rawContent) {
    throw new Error('Dosya icerigi bulunamadi');
  }

  const workbook = XLSX.read(file.rawContent, { type: 'array' });

  // Sheet bul: "MIZAN" veya ilk sheet
  let sheetName = workbook.SheetNames.find(
    name => name.toUpperCase().includes('MİZAN') || name.toUpperCase().includes('MIZAN')
  );
  if (!sheetName) {
    sheetName = workbook.SheetNames[0];
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" okunamadi`);
  }

  // Header satirini bul
  const headerInfo = findHeaderRow(sheet);
  if (!headerInfo) {
    throw new Error('Mizan header satiri bulunamadi. Beklenen: HESAP KODU, HESAP ADI, BORC, ALACAK...');
  }

  const { row: headerRow, mapping } = headerInfo;
  const ref = sheet['!ref'];
  if (!ref) {
    throw new Error('Sheet referansi bulunamadi');
  }
  const range = XLSX.utils.decode_range(ref);

  // Satirlari parse et
  const hesaplar: MizanHesap[] = [];
  let toplamBorc = 0;
  let toplamAlacak = 0;
  let toplamBorcBakiye = 0;
  let toplamAlacakBakiye = 0;

  for (let r = headerRow + 1; r <= range.e.r; r++) {
    // Hesap kodu al
    const kodCell = sheet[XLSX.utils.encode_cell({ r, c: mapping.hesapKodu })];
    const hesapKodu = normalizeHesapKodu(kodCell?.v);

    // Bos satir atla
    if (!hesapKodu) continue;

    // Toplam satirlarini atla
    if (hesapKodu.toUpperCase().includes('TOPLAM')) continue;

    // Degerleri al
    const hesapAdi = String(sheet[XLSX.utils.encode_cell({ r, c: mapping.hesapAdi })]?.v || '').trim();
    const borc = mapping.borc >= 0 ? parseNumericValue(sheet[XLSX.utils.encode_cell({ r, c: mapping.borc })]?.v) : 0;
    const alacak = mapping.alacak >= 0 ? parseNumericValue(sheet[XLSX.utils.encode_cell({ r, c: mapping.alacak })]?.v) : 0;
    const borcBakiye = mapping.borcBakiye >= 0 ? parseNumericValue(sheet[XLSX.utils.encode_cell({ r, c: mapping.borcBakiye })]?.v) : 0;
    const alacakBakiye = mapping.alacakBakiye >= 0 ? parseNumericValue(sheet[XLSX.utils.encode_cell({ r, c: mapping.alacakBakiye })]?.v) : 0;

    const bakiye = borcBakiye - alacakBakiye;

    hesaplar.push({
      hesapKodu,
      hesapAdi,
      paraBirimi: 'TRY',
      borc,
      alacak,
      borcBakiye,
      alacakBakiye,
      bakiye,
      bakiyeYonu: bakiye >= 0 ? 'B' : 'A'
    });

    toplamBorc += borc;
    toplamAlacak += alacak;
    toplamBorcBakiye += borcBakiye;
    toplamAlacakBakiye += alacakBakiye;
  }

  // Grup toplamlari hesapla
  const grupToplamlar = {
    donenVarliklar: hesaplar.filter(h => h.hesapKodu.startsWith('1')).reduce((sum, h) => sum + h.bakiye, 0),
    duranVarliklar: hesaplar.filter(h => h.hesapKodu.startsWith('2')).reduce((sum, h) => sum + h.bakiye, 0),
    kisaVadeliYK: hesaplar.filter(h => h.hesapKodu.startsWith('3')).reduce((sum, h) => sum + Math.abs(h.bakiye), 0),
    uzunVadeliYK: hesaplar.filter(h => h.hesapKodu.startsWith('4')).reduce((sum, h) => sum + Math.abs(h.bakiye), 0),
    ozKaynak: hesaplar.filter(h => h.hesapKodu.startsWith('5')).reduce((sum, h) => sum + Math.abs(h.bakiye), 0),
    gelirler: hesaplar.filter(h => h.hesapKodu.startsWith('6')).reduce((sum, h) => sum + Math.abs(h.bakiye), 0),
    giderler: hesaplar.filter(h => h.hesapKodu.startsWith('7')).reduce((sum, h) => sum + h.bakiye, 0),
  };

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
      borc: toplamBorc,
      alacak: toplamAlacak,
      borcBakiye: toplamBorcBakiye,
      alacakBakiye: toplamAlacakBakiye
    },
    grupToplamlar,
    parseInfo: {
      kaynak: file.fileName,
      parseTarihi: new Date().toISOString(),
      satirSayisi: hesaplar.length
    }
  };
}
