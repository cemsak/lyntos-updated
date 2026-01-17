/**
 * LYNTOS KDV Beyanname & Tahakkuk Parser
 * GİB 1015A KDV Beyannamesi PDF formatından veri çıkarır
 *
 * Çıkarılan veriler:
 * - VKN, Unvan, Vergi Dairesi
 * - Dönem (Yıl, Ay)
 * - Matrah toplamı, Hesaplanan KDV
 * - İndirimler (önceki dönem devir, yurtiçi alımlar)
 * - Ödenecek/Devreden KDV
 * - Tahakkuk bilgileri (THK dosyasından)
 */

import type { ParsedKDVBeyanname, KDVMatrahDetay, DetectedFile } from '../types';
import { extractTextFromPDF } from './pdfUtils';

// Regex pattern'ları - GİB PDF formatına göre
const PATTERNS = {
  vkn: /Vergi Kimlik Numarası\s*[:\s]*(\d{10,11})/i,
  unvan: /Soyadı \(Unvanı\)\s*([^\n]+)/i,
  vergiDairesi: /(\w+)\s*VD/i,
  donem: /Yıl\s*(\d{4})[\s\S]*?Ay\s*(\w+)/i,
  onayZamani: /Onay Zamanı\s*:\s*([\d\.\-\s:]+)/i,

  // Matrah ve KDV
  matrahToplami: /Matrah Toplamı\s*([\d\.,]+)/i,
  hesaplananKDV: /Hesaplanan Katma Değer Vergisi\s*([\d\.,]+)/i,
  toplamKDV: /Toplam Katma Değer Vergisi\s*([\d\.,]+)/i,

  // İndirimler
  oncekiDonemDevir: /Önceki Dönemden Devreden[^\d]*([\d\.,]+)/i,
  yurticiAlimlar: /Yurtiçi Alımlara İlişkin KDV\s*([\d\.,]+)/i,
  indirimlerToplami: /İndirimler Toplamı\s*([\d\.,]+)/i,

  // Sonuç
  odenecekKDV: /Bu Dönemde Ödenmesi Gereken[^\d]*([\d\.,]+)/i,
  devredenKDV: /Sonraki Döneme Devreden[^\d]*([\d\.,]+)/i,

  // Diğer bilgiler
  krediKartiTahsilat: /Kredi Kartı İle Tahsil[^\d]*([\d\.,]+)/i,
  teslimHizmetBedeli: /Teslim ve Hizmetlerin Karşılığını Teşkil Eden Bedel \(aylık\)\s*([\d\.,]+)/i
};

const AY_MAP: Record<string, { num: number; adi: string }> = {
  'OCAK': { num: 1, adi: 'Ocak' },
  'ŞUBAT': { num: 2, adi: 'Şubat' },
  'SUBAT': { num: 2, adi: 'Şubat' },
  'MART': { num: 3, adi: 'Mart' },
  'NİSAN': { num: 4, adi: 'Nisan' },
  'NISAN': { num: 4, adi: 'Nisan' },
  'MAYIS': { num: 5, adi: 'Mayıs' },
  'HAZİRAN': { num: 6, adi: 'Haziran' },
  'HAZIRAN': { num: 6, adi: 'Haziran' },
  'TEMMUZ': { num: 7, adi: 'Temmuz' },
  'AĞUSTOS': { num: 8, adi: 'Ağustos' },
  'AGUSTOS': { num: 8, adi: 'Ağustos' },
  'EYLÜL': { num: 9, adi: 'Eylül' },
  'EYLUL': { num: 9, adi: 'Eylül' },
  'EKİM': { num: 10, adi: 'Ekim' },
  'EKIM': { num: 10, adi: 'Ekim' },
  'KASIM': { num: 11, adi: 'Kasım' },
  'ARALIK': { num: 12, adi: 'Aralık' }
};

function parseDecimal(value: string | null | undefined): number {
  if (!value) return 0;
  // Türkçe format: 1.234.567,89 -> 1234567.89
  const cleaned = value
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function extractMatch(text: string, pattern: RegExp, group: number = 1): string | null {
  const match = text.match(pattern);
  return match ? match[group]?.trim() || null : null;
}

function detectBeyannameType(filename: string, text: string): 'BEYANNAME' | 'TAHAKKUK' {
  if (filename.includes('THK') || filename.includes('_THK')) return 'TAHAKKUK';
  if (filename.includes('BYN') || filename.includes('_BYN')) return 'BEYANNAME';

  // İçerikten tespit
  if (text.includes('TAHAKKUK FİŞİ') || text.includes('TAHAKKUK EDEN')) return 'TAHAKKUK';
  if (text.includes('KATMA DEĞER VERGİSİ BEYANNAMESİ')) return 'BEYANNAME';

  return 'BEYANNAME';
}

export async function parseKDVBeyanname(file: DetectedFile): Promise<ParsedKDVBeyanname> {
  try {
    if (!file.rawContent) {
      throw new Error('Dosya içeriği bulunamadı');
    }

    // PDF'den metin çıkar
    const text = await extractTextFromPDF(file.rawContent as ArrayBuffer);

    // Beyanname mi tahakkuk mu?
    const tip = detectBeyannameType(file.fileName, text);

    // VKN ve kimlik bilgileri
    const vkn = extractMatch(text, PATTERNS.vkn) || '';
    const vergiDairesi = extractMatch(text, PATTERNS.vergiDairesi) || '';
    const onayZamani = extractMatch(text, PATTERNS.onayZamani) || undefined;

    // Dönem bilgisi
    const donemMatch = text.match(PATTERNS.donem);
    let yil = new Date().getFullYear();
    let ay = 1;
    let ayAdi = 'Ocak';

    if (donemMatch) {
      yil = parseInt(donemMatch[1]);
      const ayStr = donemMatch[2].toUpperCase();
      if (AY_MAP[ayStr]) {
        ay = AY_MAP[ayStr].num;
        ayAdi = AY_MAP[ayStr].adi;
      }
    }

    // Ana değerler
    const matrahToplam = parseDecimal(extractMatch(text, PATTERNS.matrahToplami));
    const hesaplananKDV = parseDecimal(extractMatch(text, PATTERNS.hesaplananKDV));

    // İndirimler
    const oncekiDonemDevir = parseDecimal(extractMatch(text, PATTERNS.oncekiDonemDevir));
    const yurticiAlimlar = parseDecimal(extractMatch(text, PATTERNS.yurticiAlimlar));
    const indirimlerToplam = parseDecimal(extractMatch(text, PATTERNS.indirimlerToplami));

    // Sonuç
    const odenecekKDV = parseDecimal(extractMatch(text, PATTERNS.odenecekKDV));
    const devredenKDV = parseDecimal(extractMatch(text, PATTERNS.devredenKDV));

    // Diğer bilgiler
    const krediKartiTahsilat = parseDecimal(extractMatch(text, PATTERNS.krediKartiTahsilat));
    const teslimHizmetBedeli = parseDecimal(extractMatch(text, PATTERNS.teslimHizmetBedeli));

    // Oran bazlı matrahlar
    const matrahlar: KDVMatrahDetay[] = [];

    // %10 oranı
    const oran10Match = text.match(/(\d[\d\.,]*)\s+10\s+([\d\.,]+)/g);
    if (oran10Match) {
      for (const match of oran10Match.slice(0, 1)) {
        const parts = match.split(/\s+/);
        if (parts.length >= 3) {
          matrahlar.push({
            oran: 10,
            matrah: parseDecimal(parts[0]),
            kdv: parseDecimal(parts[2])
          });
        }
      }
    }

    // %20 oranı
    const oran20Match = text.match(/(\d[\d\.,]*)\s+20\s+([\d\.,]+)/g);
    if (oran20Match) {
      for (const match of oran20Match.slice(0, 1)) {
        const parts = match.split(/\s+/);
        if (parts.length >= 3) {
          matrahlar.push({
            oran: 20,
            matrah: parseDecimal(parts[0]),
            kdv: parseDecimal(parts[2])
          });
        }
      }
    }

    return {
      tip,
      vkn,
      vergiDairesi,
      donem: {
        yil,
        ay,
        ayAdi
      },
      onayZamani,
      matrahlar,
      matrahToplam,
      hesaplananKDV,
      indirimler: {
        oncekiDonemDevir,
        yurticiAlimlar,
        digerIndirimler: indirimlerToplam - oncekiDonemDevir - yurticiAlimlar,
        toplam: indirimlerToplam
      },
      sonuc: {
        odenecekKDV,
        devredenKDV,
        iadeKDV: 0 // PDF'den parse edilebilir
      },
      digerBilgiler: {
        krediKartiTahsilat: krediKartiTahsilat || undefined,
        teslimHizmetBedeli: teslimHizmetBedeli || undefined
      },
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
        ay: 1,
        ayAdi: 'Ocak'
      },
      matrahlar: [],
      matrahToplam: 0,
      hesaplananKDV: 0,
      indirimler: {
        oncekiDonemDevir: 0,
        yurticiAlimlar: 0,
        digerIndirimler: 0,
        toplam: 0
      },
      sonuc: {
        odenecekKDV: 0,
        devredenKDV: 0,
        iadeKDV: 0
      },
      digerBilgiler: {},
      parseInfo: {
        kaynak: file.fileName,
        parseTarihi: new Date().toISOString()
      }
    };
  }
}
