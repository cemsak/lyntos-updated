/**
 * LYNTOS Geçici Vergi Beyannamesi Parser
 * GİB Kurum Geçici Vergi Beyannamesi PDF formatından veri çıkarır
 */

import type { ParsedGeciciVergi, DetectedFile } from '../types';
import { extractTextFromPDF } from './pdfUtils';

const GECICI_PATTERNS = {
  vkn: /Vergi Kimlik Numarası\s*(\d{10,11})/i,
  unvan: /Soyadı \(Unvanı\)\s*([^\n]+)/i,
  vergiDairesi: /(\w+)\s*VD/i,
  donem: /(\d{4})\s*\/\s*(\d)/i, // 2025/1 formatı
  onayZamani: /Onay Zamanı\s*:\s*([\d\.\-\s:]+)/i,

  // Matrah ve vergi
  matrah: /(?:Vergiye Tabi|Ticari) Kazanç\s*([\d\.,]+)/i,
  hesaplananVergi: /Hesaplanan (?:Geçici|Kurumlar) Vergi\s*([\d\.,]+)/i,
  mahsupEdilen: /Mahsup Edilen\s*([\d\.,]+)/i,
  odenecekVergi: /Ödenecek (?:Geçici|Kurumlar) Vergi\s*([\d\.,]+)/i
};

function parseDecimal(value: string | null | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.');
  return parseFloat(cleaned) || 0;
}

function extractMatch(text: string, pattern: RegExp, group: number = 1): string | null {
  const match = text.match(pattern);
  return match ? match[group]?.trim() || null : null;
}

function detectTip(filename: string, text: string): 'BEYANNAME' | 'TAHAKKUK' {
  if (filename.includes('THK')) return 'TAHAKKUK';
  if (filename.includes('BYN')) return 'BEYANNAME';
  if (text.includes('TAHAKKUK FİŞİ')) return 'TAHAKKUK';
  return 'BEYANNAME';
}

function ceyrekToEnum(ceyrek: number): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  switch (ceyrek) {
    case 1: return 'Q1';
    case 2: return 'Q2';
    case 3: return 'Q3';
    case 4: return 'Q4';
    default: return 'Q1';
  }
}

export async function parseGeciciVergi(file: DetectedFile): Promise<ParsedGeciciVergi> {
  try {
    if (!file.rawContent) {
      throw new Error('Dosya içeriği bulunamadı');
    }

    const text = await extractTextFromPDF(file.rawContent as ArrayBuffer);
    const tip = detectTip(file.fileName, text);

    const vkn = extractMatch(text, GECICI_PATTERNS.vkn) || '';
    const vergiDairesi = extractMatch(text, GECICI_PATTERNS.vergiDairesi) || '';
    const onayZamani = extractMatch(text, GECICI_PATTERNS.onayZamani) || undefined;

    // Dönem: 2025/1 = Q1
    const donemMatch = text.match(GECICI_PATTERNS.donem);
    let yil = new Date().getFullYear();
    let ceyrek: 'Q1' | 'Q2' | 'Q3' | 'Q4' = 'Q1';

    if (donemMatch) {
      yil = parseInt(donemMatch[1]);
      ceyrek = ceyrekToEnum(parseInt(donemMatch[2]));
    }

    // Değerler
    const matrah = parseDecimal(extractMatch(text, GECICI_PATTERNS.matrah));
    const hesaplananVergi = parseDecimal(extractMatch(text, GECICI_PATTERNS.hesaplananVergi));
    const oncekiDonemlerMahsup = parseDecimal(extractMatch(text, GECICI_PATTERNS.mahsupEdilen));
    const odenecekVergi = parseDecimal(extractMatch(text, GECICI_PATTERNS.odenecekVergi));

    return {
      tip,
      vkn,
      vergiDairesi,
      donem: {
        yil,
        ceyrek
      },
      onayZamani,
      matrah,
      hesaplananVergi,
      oncekiDonemlerMahsup,
      odenecekVergi,
      parseInfo: {
        kaynak: file.fileName,
        parseTarihi: new Date().toISOString()
      }
    };

  } catch (error) {
    // Hata durumunda varsayılan değerlerle döndür
    return {
      tip: 'BEYANNAME',
      vkn: '',
      vergiDairesi: '',
      donem: {
        yil: new Date().getFullYear(),
        ceyrek: 'Q1'
      },
      matrah: 0,
      hesaplananVergi: 0,
      oncekiDonemlerMahsup: 0,
      odenecekVergi: 0,
      parseInfo: {
        kaynak: file.fileName,
        parseTarihi: new Date().toISOString()
      }
    };
  }
}
