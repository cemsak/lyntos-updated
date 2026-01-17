/**
 * LYNTOS Banka Ekstre Parser
 * 5 farklı banka CSV formatını destekler
 *
 * Desteklenen bankalar:
 * - YKB (Yapı Kredi): Tarih;Açıklama;İşlem Tutarı;Bakiye
 * - Akbank: Tarih;Açıklama;Tutar;Bakiye
 * - Halkbank: İşlem Tarihi;Açıklama;İşlem Tutarı;Yeni Bakiye
 * - Ziraat: Header'sız, format karışık
 * - Albaraka: Tarih;Açıklama;Tutar(TL);Güncel Bakiye(TL)
 *
 * Encoding: iso-8859-9 (Turkish)
 * Delimiter: ; (semicolon)
 */

import type { ParsedBankaEkstre, BankaHareket, BankaKodu, DetectedFile } from '../types';

interface BankaConfig {
  headerPatterns: string[];
  tarihIndex: number;
  aciklamaIndex: number;
  tutarIndex: number;
  bakiyeIndex: number;
  hasHeader: boolean;
}

const BANKA_CONFIGS: Record<string, BankaConfig> = {
  YKB: {
    headerPatterns: ['Tarih', 'Açıklama', 'İşlem Tutarı', 'Bakiye'],
    tarihIndex: 0,
    aciklamaIndex: 1,
    tutarIndex: 2,
    bakiyeIndex: 3,
    hasHeader: true
  },
  AKBANK: {
    headerPatterns: ['Tarih', 'Açıklama', 'Tutar', 'Bakiye'],
    tarihIndex: 0,
    aciklamaIndex: 1,
    tutarIndex: 2,
    bakiyeIndex: 3,
    hasHeader: true
  },
  HALKBANK: {
    headerPatterns: ['İşlem Tarihi', 'Açıklama', 'İşlem Tutarı', 'Yeni Bakiye'],
    tarihIndex: 0,
    aciklamaIndex: 1,
    tutarIndex: 2,
    bakiyeIndex: 3,
    hasHeader: true
  },
  ZIRAAT: {
    headerPatterns: [],
    tarihIndex: 0,
    aciklamaIndex: 1,
    tutarIndex: 2,
    bakiyeIndex: 3,
    hasHeader: false
  },
  ALBARAKA: {
    headerPatterns: ['Tarih', 'Açıklama', 'Tutar(TL)', 'Güncel Bakiye'],
    tarihIndex: 0,
    aciklamaIndex: 1,
    tutarIndex: 2,
    bakiyeIndex: 3,
    hasHeader: true
  },
  DIGER: {
    headerPatterns: [],
    tarihIndex: 0,
    aciklamaIndex: 1,
    tutarIndex: 2,
    bakiyeIndex: 3,
    hasHeader: false
  }
};

const BANKA_ADI_MAP: Record<BankaKodu, string> = {
  YKB: 'Yapı Kredi Bankası',
  AKBANK: 'Akbank',
  HALKBANK: 'Halkbank',
  ZIRAAT: 'Ziraat Bankası',
  ALBARAKA: 'Albaraka Türk',
  VAKIFBANK: 'VakıfBank',
  GARANTI: 'Garanti BBVA',
  ISBANK: 'İş Bankası',
  DIGER: 'Diğer Banka'
};

function detectBankaFromFilename(filename: string): BankaKodu {
  const upper = filename.toUpperCase();

  if (upper.includes('YKB') || upper.includes('YAPI') || upper.includes('KREDİ') || upper.includes('KREDI')) return 'YKB';
  if (upper.includes('AKBANK') || upper.includes('AKB')) return 'AKBANK';
  if (upper.includes('HALK') || upper.includes('HLK')) return 'HALKBANK';
  if (upper.includes('ZİRAAT') || upper.includes('ZIRAAT') || upper.includes('ZRT')) return 'ZIRAAT';
  if (upper.includes('ALBARAKA') || upper.includes('ALB')) return 'ALBARAKA';
  if (upper.includes('VAKIF') || upper.includes('VKF')) return 'VAKIFBANK';
  if (upper.includes('GARANTİ') || upper.includes('GARANTI') || upper.includes('BBVA')) return 'GARANTI';
  if (upper.includes('İŞ BANK') || upper.includes('IS BANK') || upper.includes('ISBANK')) return 'ISBANK';

  return 'DIGER';
}

function detectBankaFromContent(firstLine: string): BankaKodu {
  const line = firstLine.toUpperCase();

  if (line.includes('İŞLEM TUTARI') && !line.includes('YENİ')) return 'YKB';
  if (line.includes('TUTAR') && line.includes('BAKİYE') && !line.includes('(TL)')) return 'AKBANK';
  if (line.includes('YENİ BAKİYE')) return 'HALKBANK';
  if (line.includes('TUTAR(TL)') || line.includes('GÜNCEL BAKİYE')) return 'ALBARAKA';

  return 'DIGER';
}

function decodeContent(content: ArrayBuffer | string): string {
  if (typeof content === 'string') return content;

  // Use TextDecoder for browser compatibility
  // Try different encodings for Turkish characters

  // Try UTF-8 first (most common)
  try {
    const decoder = new TextDecoder('utf-8');
    const decoded = decoder.decode(content);
    // Check if it looks correct (no replacement characters)
    if (!decoded.includes('\ufffd')) {
      return decoded;
    }
  } catch {
    // Continue to next encoding
  }

  // Try ISO-8859-9 (Turkish)
  try {
    const decoder = new TextDecoder('iso-8859-9');
    return decoder.decode(content);
  } catch {
    // Continue to next encoding
  }

  // Fallback: windows-1254 (Turkish Windows)
  try {
    const decoder = new TextDecoder('windows-1254');
    return decoder.decode(content);
  } catch {
    // Last resort: latin1
    const decoder = new TextDecoder('iso-8859-1');
    return decoder.decode(content);
  }
}

function parseDate(value: string): string | null {
  if (!value) return null;

  // DD.MM.YYYY veya DD/MM/YYYY
  const match = value.match(/(\d{1,2})[\.\/](\d{1,2})[\.\/](\d{2,4})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    return `${year}-${month}-${day}`;
  }

  return null;
}

function parseAmount(value: string): number {
  if (!value) return 0;

  // Türkçe format: -1.234,56 veya 1.234,56
  const cleaned = value
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function extractHesapNo(content: string): string | undefined {
  // IBAN pattern
  const ibanMatch = content.match(/TR\d{2}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{2}/);
  if (ibanMatch) {
    return ibanMatch[0].replace(/\s/g, '');
  }

  // Normal hesap no
  const hesapMatch = content.match(/(?:Hesap|Account)\s*(?:No|Number)[:\s]*(\d{10,20})/i);
  if (hesapMatch) {
    return hesapMatch[1];
  }

  return undefined;
}

function extractDonemFromDates(hareketler: BankaHareket[]): string {
  if (hareketler.length === 0) return '';

  const ilkTarih = hareketler[0].tarih;
  const sonTarih = hareketler[hareketler.length - 1].tarih;

  if (ilkTarih && sonTarih) {
    const ilkAy = ilkTarih.substring(0, 7);
    const sonAy = sonTarih.substring(0, 7);
    return ilkAy === sonAy ? ilkAy : `${ilkAy} - ${sonAy}`;
  }

  return '';
}

export async function parseBankaEkstre(file: DetectedFile): Promise<ParsedBankaEkstre> {
  try {
    if (!file.rawContent) {
      throw new Error('Dosya içeriği bulunamadı');
    }

    // İçeriği decode et
    const content = decodeContent(file.rawContent as ArrayBuffer);
    const lines = content.split(/\r?\n/).filter(line => line.trim());

    if (lines.length === 0) {
      throw new Error('CSV dosyası boş');
    }

    // Bankayı tespit et
    let banka = detectBankaFromFilename(file.fileName);
    if (banka === 'DIGER') {
      banka = detectBankaFromContent(lines[0]);
    }

    const config = BANKA_CONFIGS[banka] || BANKA_CONFIGS['DIGER'];

    // Hesap no bul
    const hesapNo = extractHesapNo(content);

    // Header satırını atla (varsa)
    let startIndex = 0;
    if (config.hasHeader && lines.length > 0) {
      const firstLine = lines[0].toUpperCase();
      if (firstLine.includes('TARİH') || firstLine.includes('TARIH') || firstLine.includes('DATE')) {
        startIndex = 1;
      }
    }

    // Hareketleri parse et
    const hareketler: BankaHareket[] = [];
    let toplamGiris = 0;
    let toplamCikis = 0;
    let ilkBakiye = 0;
    let sonBakiye = 0;
    let ilkHareketParsed = false;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Semicolon ile ayır
      let parts = line.split(';').map(p => p.trim());

      if (parts.length < 3) {
        // Virgül ile dene
        const commaParts = line.split(',').map(p => p.trim());
        if (commaParts.length >= 3) {
          parts = commaParts;
        } else {
          continue; // Geçersiz satır
        }
      }

      const tarih = parseDate(parts[config.tarihIndex]);
      if (!tarih) continue; // Tarih yoksa atla

      const aciklama = parts[config.aciklamaIndex] || '';
      const tutar = parseAmount(parts[config.tutarIndex]); // + giris, - cikis
      const bakiye = parseAmount(parts[config.bakiyeIndex] || '0');

      // İlk hareket için açılış bakiyesini hesapla
      if (!ilkHareketParsed) {
        ilkBakiye = bakiye - tutar;
        ilkHareketParsed = true;
      }

      sonBakiye = bakiye;

      // Giriş/Çıkış ayrımı
      if (tutar >= 0) {
        toplamGiris += tutar;
      } else {
        toplamCikis += Math.abs(tutar);
      }

      hareketler.push({
        tarih,
        aciklama,
        tutar, // + giris, - cikis (types.ts'e göre)
        bakiye
      });
    }

    // Dönem tespiti
    const donem = extractDonemFromDates(hareketler);

    // Muhasebe hesap kodu tahmin et (banka bazında)
    const muhasebeHesapKoduMap: Record<BankaKodu, string> = {
      YKB: '102.01',
      AKBANK: '102.02',
      HALKBANK: '102.03',
      ZIRAAT: '102.04',
      ALBARAKA: '102.05',
      VAKIFBANK: '102.06',
      GARANTI: '102.07',
      ISBANK: '102.08',
      DIGER: '102.99'
    };

    return {
      banka,
      bankaAdi: BANKA_ADI_MAP[banka],
      muhasebeHesapKodu: muhasebeHesapKoduMap[banka],
      hesapNo,
      donem,
      hareketler,
      toplamlar: {
        giris: toplamGiris,
        cikis: toplamCikis,
        acilisBakiye: ilkBakiye,
        kapanisBakiye: sonBakiye,
        hareketSayisi: hareketler.length
      },
      parseInfo: {
        kaynak: file.fileName,
        parseTarihi: new Date().toISOString()
      }
    };

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);

    // Hata durumunda boş sonuç döndür
    return {
      banka: 'DIGER',
      bankaAdi: 'Diğer Banka',
      muhasebeHesapKodu: '102.99',
      hesapNo: undefined,
      donem: '',
      hareketler: [],
      toplamlar: {
        giris: 0,
        cikis: 0,
        acilisBakiye: 0,
        kapanisBakiye: 0,
        hareketSayisi: 0
      },
      parseInfo: {
        kaynak: file.fileName,
        parseTarihi: new Date().toISOString()
      }
    };
  }
}
