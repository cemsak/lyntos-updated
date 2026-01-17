/**
 * LYNTOS Muhtasar ve Prim Hizmet Beyannamesi Parser
 * GİB 1003A Muhtasar Beyannamesi PDF formatından veri çıkarır
 *
 * Çıkarılan veriler:
 * - VKN, Unvan, Vergi Dairesi, Dönem
 * - Çalışan sayıları (Asgari/Diğer, SGK muaf)
 * - Ücret toplamları, Gelir vergisi matrahı
 * - Stopaj kesintileri, Damga vergisi
 * - SGK prim bilgileri
 */

import type { ParsedMuhtasar, MuhtasarOdeme, MuhtasarCalisanBilgi, DetectedFile } from '../types';
import { extractTextFromPDF } from './pdfUtils';

const MUHTASAR_PATTERNS = {
  vkn: /Vergi Kimlik Numarası\s*(\d{10,11})/i,
  unvan: /Soyadı \(Unvanı\)\s*([^\n]+)/i,
  vergiDairesi: /(\w+)\s*VD/i,
  donem: /Yıl\s*(\d{4})[\s\S]*?Ay\s*(\w+)/i,
  onayZamani: /Onay Zamanı\s*:\s*([\d\.\-\s:]+)/i,

  // Matrah ve vergi bildirimi
  toplamGayrisafiTutar: /Toplam\s*([\d\.,]+)\s*([\d\.,]+)/,
  terkinSonrasi: /Terkin Sonrası Kalan Vergi Tutarı\s*([\d\.,]+)/i,
  damgaVergisi: /Tevkifata İlişkin Damga Vergisi\s*([\d\.,]+)/i,

  // Çalışan bilgileri - Asgari ücretli
  asgariUcretli: /Asgari\s*Ücretli\s*(\d+)\s+(\d+)\s+(\d+)\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)/i,
  digerUcretli: /Diğer\s*Ücretli\s*(\d+)\s+(\d+)\s+(\d+)\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)/i
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
  const cleaned = value.replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
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

export async function parseMuhtasar(file: DetectedFile): Promise<ParsedMuhtasar> {
  try {
    if (!file.rawContent) {
      throw new Error('Dosya içeriği bulunamadı');
    }

    const text = await extractTextFromPDF(file.rawContent as ArrayBuffer);
    const tip = detectTip(file.fileName, text);

    // Kimlik bilgileri
    const vkn = extractMatch(text, MUHTASAR_PATTERNS.vkn) || '';
    const vergiDairesi = extractMatch(text, MUHTASAR_PATTERNS.vergiDairesi) || '';
    const onayZamani = extractMatch(text, MUHTASAR_PATTERNS.onayZamani) || undefined;

    // Dönem
    const donemMatch = text.match(MUHTASAR_PATTERNS.donem);
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

    // Çalışan bilgileri
    const calisanlar: MuhtasarCalisanBilgi[] = [];
    let toplamCalisan = 0;
    let toplamGayrisafiTutar = 0;
    let toplamKesintiTutar = 0;

    // Asgari ücretli satırını parse et
    const asgariMatch = text.match(/Asgari[\s\S]*?Ücretli\s*(\d+)\s+(\d+)\s+(\d+)\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)/i);
    if (asgariMatch) {
      const calisanSayisi = parseInt(asgariMatch[1]) || 0;
      const muafSayisi = parseInt(asgariMatch[2]) || 0;
      const gvMatrahi = parseDecimal(asgariMatch[4]);
      const asgariUcretIstisnasi = parseDecimal(asgariMatch[5]);
      const gvKesintisi = parseDecimal(asgariMatch[6]);

      calisanlar.push({
        tip: 'ASGARI_UCRETLI',
        calisanSayisi,
        muafSayisi,
        gelirVergisiMatrahi: gvMatrahi,
        gelirVergisiKesintisi: gvKesintisi,
        asgariUcretIstisnasi,
        damgaVergisiKesintisi: 0
      });

      toplamCalisan += calisanSayisi;
      toplamGayrisafiTutar += gvMatrahi;
      toplamKesintiTutar += gvKesintisi;
    }

    // Diğer ücretli satırını parse et
    const digerMatch = text.match(/Diğer[\s\S]*?Ücretli\s*(\d+)\s+(\d+)\s+(\d+)\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)/i);
    if (digerMatch) {
      const calisanSayisi = parseInt(digerMatch[1]) || 0;
      const muafSayisi = parseInt(digerMatch[2]) || 0;
      const gvMatrahi = parseDecimal(digerMatch[4]);
      const gvKesintisi = parseDecimal(digerMatch[6]);

      calisanlar.push({
        tip: 'DIGER_UCRETLI',
        calisanSayisi,
        muafSayisi,
        gelirVergisiMatrahi: gvMatrahi,
        gelirVergisiKesintisi: gvKesintisi,
        asgariUcretIstisnasi: 0,
        damgaVergisiKesintisi: 0
      });

      toplamCalisan += calisanSayisi;
      toplamGayrisafiTutar += gvMatrahi;
      toplamKesintiTutar += gvKesintisi;
    }

    // Damga vergisi
    const damgaVergisi = parseDecimal(extractMatch(text, MUHTASAR_PATTERNS.damgaVergisi));

    // Ödemeler (varsayılan ücret ödemesi)
    const odemeler: MuhtasarOdeme[] = [];
    if (toplamGayrisafiTutar > 0) {
      odemeler.push({
        turKodu: '011', // Ücret ödemeleri
        gayrisafiTutar: toplamGayrisafiTutar,
        kesintiTutar: toplamKesintiTutar
      });
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
      odemeler,
      odemelerToplam: {
        gayrisafiTutar: toplamGayrisafiTutar,
        kesintiTutar: toplamKesintiTutar
      },
      damgaVergisi,
      calisanlar,
      toplamCalisan,
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
      odemeler: [],
      odemelerToplam: {
        gayrisafiTutar: 0,
        kesintiTutar: 0
      },
      damgaVergisi: 0,
      calisanlar: [],
      toplamCalisan: 0,
      parseInfo: {
        kaynak: file.fileName,
        parseTarihi: new Date().toISOString()
      }
    };
  }
}
