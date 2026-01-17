/**
 * LYNTOS e-Defter XML Parser
 * GIB XBRL-GL formatindan e-defter okur
 *
 * Namespace'ler:
 * - http://www.edefter.gov.tr
 * - http://www.xbrl.org/int/gl/cor/2006-10-25 (gl-cor)
 * - http://www.xbrl.org/int/gl/bus/2006-10-25 (gl-bus)
 *
 * Dosya tipleri:
 * - Y: Yevmiye
 * - K: Kebir
 * - YB/KB: Berat
 * - DR: Donem Raporu
 * - GIB-: GIB onayli
 */

import type { ParsedEDefter, EDefterYevmiyeKayit, EDefterYevmiyeSatir, DetectedFile } from '../types';

// XBRL-GL Namespace'ler
const NS = {
  edefter: 'http://www.edefter.gov.tr',
  glCor: 'http://www.xbrl.org/int/gl/cor/2006-10-25',
  glBus: 'http://www.xbrl.org/int/gl/bus/2006-10-25',
  xbrli: 'http://www.xbrl.org/2003/instance'
};

function getElementText(element: Element, tagName: string): string | null {
  // Coklu NS arama stratejisi
  const selectors = [
    tagName,
    `gl-cor\\:${tagName}`,
    `glCor\\:${tagName}`,
    `gl-bus\\:${tagName}`,
    `glBus\\:${tagName}`,
    `edefter\\:${tagName}`
  ];

  for (const selector of selectors) {
    try {
      const child = element.querySelector(selector);
      if (child?.textContent) {
        return child.textContent.trim();
      }
    } catch {
      // querySelector hatalarini yoksay
    }
  }

  // getElementsByTagName fallback
  const children = element.getElementsByTagName(tagName);
  if (children.length > 0 && children[0].textContent) {
    return children[0].textContent.trim();
  }

  return null;
}

function getAllElements(parent: Element | Document, tagName: string): Element[] {
  const results: Element[] = [];

  // Coklu NS arama
  const prefixes = ['', 'gl-cor:', 'glCor:', 'gl-bus:', 'glBus:', 'edefter:'];

  for (const prefix of prefixes) {
    const elements = parent.getElementsByTagName(`${prefix}${tagName}`);
    for (let i = 0; i < elements.length; i++) {
      results.push(elements[i]);
    }
  }

  // Namespace URI ile de dene
  try {
    const nsElements = parent.getElementsByTagNameNS(NS.glCor, tagName);
    for (let i = 0; i < nsElements.length; i++) {
      if (!results.includes(nsElements[i])) {
        results.push(nsElements[i]);
      }
    }
  } catch {
    // NS arama hatasini yoksay
  }

  return results;
}

function parseDecimal(value: string | null): number {
  if (!value) return 0;
  const num = parseFloat(value.replace(/,/g, '.'));
  return isNaN(num) ? 0 : num;
}

function parseXMLDate(value: string | null): string {
  if (!value) return '';
  // ISO format: 2025-01-15
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.substring(0, 10);
  }
  return value;
}

function detectEDefterType(filename: string): 'YEVMIYE' | 'KEBIR' | 'BERAT' | 'RAPOR' {
  const upper = filename.toUpperCase();

  if (upper.includes('-Y-') || upper.endsWith('-Y.XML')) return 'YEVMIYE';
  if (upper.includes('-K-') || upper.endsWith('-K.XML')) return 'KEBIR';
  if (upper.includes('-YB') || upper.includes('-KB') || upper.includes('BERAT')) return 'BERAT';
  if (upper.includes('-DR') || upper.includes('RAPOR')) return 'RAPOR';

  // Icerik bazli tespit icin varsayilan
  return 'YEVMIYE';
}

function extractVKN(doc: Document, filename: string): string {
  // Dosya adindan VKN cikart: 0480525636-202501-Y-000000.xml
  const fnMatch = filename.match(/(\d{10,11})-\d{6}/);
  if (fnMatch) return fnMatch[1];

  // XML iceriginden
  const identifiers = getAllElements(doc, 'identifier');
  for (const id of identifiers) {
    const value = id.textContent?.trim();
    if (value && /^\d{10,11}$/.test(value)) {
      return value;
    }
  }

  // Alternatif arama
  const xmlStr = doc.documentElement?.outerHTML || '';
  const vknMatch = xmlStr.match(/VKN[">:\s]*(\d{10,11})/i);
  if (vknMatch) return vknMatch[1];

  return '';
}

function extractDonem(doc: Document, filename: string): string {
  // Dosya adindan: 0480525636-202501-Y-000000.xml
  const fnMatch = filename.match(/\d{10,11}-(\d{4})(\d{2})/);
  if (fnMatch) return `${fnMatch[1]}-${fnMatch[2]}`;

  // Period context'ten
  const periods = getAllElements(doc, 'period');
  for (const period of periods) {
    const startDate = getElementText(period, 'startDate');
    if (startDate) {
      const match = startDate.match(/(\d{4})-(\d{2})/);
      if (match) return `${match[1]}-${match[2]}`;
    }
  }

  return '';
}

function parseYevmiyeEntries(doc: Document): EDefterYevmiyeKayit[] {
  const kayitlar: EDefterYevmiyeKayit[] = [];

  // gl-cor:entryHeader elementlerini bul
  const entries = getAllElements(doc, 'entryHeader');

  for (const entry of entries) {
    // Entry numarasi
    const entryNumberStr = getElementText(entry, 'entryNumber');
    const entryNumber = entryNumberStr ? parseInt(entryNumberStr, 10) : 0;
    const entryDate = getElementText(entry, 'entryDate') || getElementText(entry, 'postingDate');

    // Entry detail satirlari
    const details = getAllElements(entry, 'entryDetail');

    const satirlar: EDefterYevmiyeSatir[] = [];

    for (const detail of details) {
      const accountMainID = getElementText(detail, 'accountMainID');
      const accountSubID = getElementText(detail, 'accountSubID');
      const accountNumber = accountMainID || getElementText(detail, 'accountNumber') || '';

      const amountStr = getElementText(detail, 'amount');
      const amount = parseDecimal(amountStr);

      const debitCreditCode = getElementText(detail, 'debitCreditCode');
      const isDebit = debitCreditCode?.toUpperCase() === 'D' || debitCreditCode?.toUpperCase() === 'DEBIT';

      const satir: EDefterYevmiyeSatir = {
        hesapKodu: accountNumber,
        altHesapKodu: accountSubID || undefined,
        hesapAdi: getElementText(detail, 'accountName') || '',
        tutar: amount,
        borcAlacak: isDebit ? 'D' : 'C',
        belgeTipi: getElementText(detail, 'documentType') || undefined,
        belgeNo: getElementText(detail, 'documentNumber') || undefined,
        aciklama: getElementText(detail, 'comment') || getElementText(detail, 'memo') || undefined
      };

      satirlar.push(satir);
    }

    if (satirlar.length > 0) {
      const kayit: EDefterYevmiyeKayit = {
        yevmiyeNo: entryNumber,
        tarih: parseXMLDate(entryDate),
        aciklama: getElementText(entry, 'entryComment') || getElementText(entry, 'memo') || '',
        satirlar
      };

      kayitlar.push(kayit);
    }
  }

  return kayitlar;
}

export async function parseEDefter(file: DetectedFile): Promise<ParsedEDefter> {
  if (!file.rawContent) {
    throw new Error('Dosya icerigi bulunamadi');
  }

  // XML string'e cevir
  let xmlString: string;
  if (file.rawContent instanceof ArrayBuffer) {
    const decoder = new TextDecoder('utf-8');
    xmlString = decoder.decode(file.rawContent);
  } else {
    throw new Error('Desteklenmeyen icerik formati');
  }

  // XML parse et
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');

  // Parse hata kontrolu
  const parseError = doc.getElementsByTagName('parsererror')[0];
  if (parseError) {
    throw new Error(`XML parse hatasi: ${parseError.textContent}`);
  }

  // Dosya tipini belirle
  const tip = detectEDefterType(file.fileName);

  // Meta bilgileri cikar
  const vkn = extractVKN(doc, file.fileName);
  const donem = extractDonem(doc, file.fileName);

  // Kayitlari parse et
  let kayitlar: EDefterYevmiyeKayit[] = [];

  if (tip === 'YEVMIYE' || tip === 'KEBIR') {
    kayitlar = parseYevmiyeEntries(doc);
  }

  // Toplamlari hesapla
  let toplamSatir = 0;
  for (const kayit of kayitlar) {
    toplamSatir += kayit.satirlar.length;
  }

  // GIB onayli mi kontrol et
  const gibOnayli = file.fileName.toUpperCase().startsWith('GIB-');

  // Donem baslangic/bitis hesapla
  let donemBaslangic = '';
  let donemBitis = '';
  if (donem) {
    const [yil, ay] = donem.split('-');
    if (yil && ay) {
      const ayNum = parseInt(ay, 10);
      const yilNum = parseInt(yil, 10);
      donemBaslangic = `${yil}-${ay}-01`;
      // Ayin son gunu
      const sonGun = new Date(yilNum, ayNum, 0).getDate();
      donemBitis = `${yil}-${ay}-${String(sonGun).padStart(2, '0')}`;
    }
  }

  return {
    tip,
    vkn,
    donem,
    firmaAdi: undefined,
    smmmAdi: undefined,
    donemBaslangic,
    donemBitis,
    kayitlar,
    toplamlar: {
      kayitSayisi: kayitlar.length,
      satirSayisi: toplamSatir
    },
    beratBilgisi: tip === 'BERAT' ? {
      gibOnayli,
      onayTarihi: undefined,
      hash: undefined
    } : undefined,
    parseInfo: {
      kaynak: file.fileName,
      parseTarihi: new Date().toISOString()
    }
  };
}
