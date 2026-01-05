import type { DocumentType, AccountingSoftware, BeratType, TurkishBank } from './types';
import { getBankFromIBAN, findIBANsInText } from './bankRegistry';

export interface ClassificationResult {
  type: DocumentType;
  confidence: number;
  details: {
    bank?: TurkishBank;
    software?: AccountingSoftware;
    beratType?: BeratType;
    vkn?: string;
    period?: string;
    headers?: string[];
    ibans?: string[];
    needsExtraction?: boolean;
    error?: string;
  };
}

// Detect document type from file
export async function classifyFile(file: File): Promise<ClassificationResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  // ZIP files (likely e-Berat)
  if (ext === 'zip') {
    return { type: 'e_berat_xml', confidence: 0.7, details: { needsExtraction: true } };
  }

  // XML files (e-Berat or e-Fatura)
  if (ext === 'xml') {
    const content = await file.text();
    return classifyXML(content, file.name);
  }

  // PDF files (GIB documents)
  if (ext === 'pdf') {
    return classifyPDFByName(file.name);
  }

  // Excel files (Mizan or Bank statement)
  if (ext === 'xlsx' || ext === 'xls') {
    return await classifyExcelByHeaders(file);
  }

  // CSV files
  if (ext === 'csv') {
    return await classifyCSV(file);
  }

  return { type: 'unknown', confidence: 0, details: {} };
}

// Classify XML content
function classifyXML(content: string, filename: string): ClassificationResult {
  // e-Berat filename pattern: GIB-{VKN}-{YYYYMM}-{TYPE}-{PART}.xml
  const beratPattern = /GIB-(\d{10,11})-(\d{6})-(YB|KB|DR)-(\d{6})\.xml/i;
  const match = filename.match(beratPattern);

  if (match) {
    const [, vkn, period, beratType] = match;
    return {
      type: 'e_berat_xml',
      confidence: 0.95,
      details: { vkn, period, beratType: beratType as BeratType }
    };
  }

  // Check XML content for e-Fatura namespace
  if (content.includes('xmlns:inv=') || content.includes('Invoice')) {
    return { type: 'e_fatura_xml', confidence: 0.8, details: {} };
  }

  // XBRL namespace (e-Defter)
  if (content.includes('xbrli:') || content.includes('gl-cor:')) {
    return { type: 'e_berat_xml', confidence: 0.85, details: {} };
  }

  return { type: 'unknown', confidence: 0.3, details: {} };
}

// Classify PDF by filename
function classifyPDFByName(filename: string): ClassificationResult {
  const lower = filename.toLowerCase();

  if (lower.includes('beyanname') || lower.includes('kdv') || lower.includes('muhtasar') || lower.includes('gecici')) {
    return { type: 'beyanname_pdf', confidence: 0.7, details: {} };
  }

  if (lower.includes('tahakkuk')) {
    return { type: 'tahakkuk_pdf', confidence: 0.7, details: {} };
  }

  if (lower.includes('ekstre') || lower.includes('banka') || lower.includes('hesap')) {
    return { type: 'banka_ekstresi', confidence: 0.6, details: {} };
  }

  return { type: 'unknown', confidence: 0.3, details: {} };
}

// Classify Excel file by reading headers
async function classifyExcelByHeaders(file: File): Promise<ClassificationResult> {
  try {
    // Dynamic import xlsx
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1 });

    if (data.length === 0) {
      return { type: 'unknown', confidence: 0, details: {} };
    }

    const firstRow = data[0] as unknown[];
    const headers = firstRow.map(h => String(h || '').toLowerCase().trim());

    // Check for Mizan patterns
    const mizanResult = detectMizanFormat(headers);
    if (mizanResult.isMizan) {
      return {
        type: 'mizan_excel',
        confidence: 0.9,
        details: { software: mizanResult.software, headers }
      };
    }

    // Check for bank statement patterns (IBAN in content)
    const allText = data.flat().join(' ');
    const ibans = findIBANsInText(allText);
    if (ibans.length > 0) {
      const bank = getBankFromIBAN(ibans[0]);
      return {
        type: 'banka_ekstresi',
        confidence: 0.8,
        details: { bank: bank || undefined, ibans }
      };
    }

    return { type: 'unknown', confidence: 0.3, details: { headers } };
  } catch (error) {
    return { type: 'unknown', confidence: 0, details: { error: String(error) } };
  }
}

// Classify CSV file
async function classifyCSV(file: File): Promise<ClassificationResult> {
  try {
    const text = await file.text();
    const lines = text.split('\n');
    if (lines.length === 0) {
      return { type: 'unknown', confidence: 0, details: {} };
    }

    const headers = lines[0].split(/[,;\t]/).map(h => h.toLowerCase().trim().replace(/"/g, ''));

    // Check for Mizan patterns
    const mizanResult = detectMizanFormat(headers);
    if (mizanResult.isMizan) {
      return {
        type: 'mizan_csv',
        confidence: 0.85,
        details: { software: mizanResult.software, headers }
      };
    }

    // Check for bank statement patterns
    const ibans = findIBANsInText(text);
    if (ibans.length > 0) {
      const bank = getBankFromIBAN(ibans[0]);
      return {
        type: 'banka_ekstresi',
        confidence: 0.75,
        details: { bank: bank || undefined, ibans }
      };
    }

    return { type: 'unknown', confidence: 0.3, details: { headers } };
  } catch (error) {
    return { type: 'unknown', confidence: 0, details: { error: String(error) } };
  }
}

// Detect Mizan format and accounting software
function detectMizanFormat(headers: string[]): { isMizan: boolean; software: AccountingSoftware } {
  const headerStr = headers.join('|');

  // LUCA: "Hesap Kodu", "Hesap Adi", "Borc", "Alacak"
  if (headerStr.includes('hesap kodu') && headerStr.includes('hesap adi')) {
    return { isMizan: true, software: 'luca' };
  }

  // LOGO: "HesapKodu", "HesapAdi", "Borc", "Alacak"
  if (headerStr.includes('hesapkodu') || headerStr.includes('hesapadi')) {
    return { isMizan: true, software: 'logo' };
  }

  // MIKRO: "HES_KOD", "HES_ADI", "BORC", "ALACAK"
  if (headerStr.includes('hes_kod') || headerStr.includes('hes_adi')) {
    return { isMizan: true, software: 'mikro' };
  }

  // ETA: "KOD", "ADI", "BORC_TUTAR", "ALACAK_TUTAR"
  if (headerStr.includes('borc_tutar') || headerStr.includes('alacak_tutar')) {
    return { isMizan: true, software: 'eta' };
  }

  // ZIRVE: "hesap_no", "hesap_adi", "borc", "alacak"
  if (headerStr.includes('hesap_no') && headerStr.includes('borc')) {
    return { isMizan: true, software: 'zirve' };
  }

  // NETSIS: "HESAP_KODU", "HESAP_ADI", "BORC", "ALACAK"
  if (headerStr.includes('hesap_kodu') && headerStr.includes('hesap_adi')) {
    return { isMizan: true, software: 'netsis' };
  }

  // PARASUT: "account_code", "account_name", "debit", "credit"
  if (headerStr.includes('account_code') || headerStr.includes('debit')) {
    return { isMizan: true, software: 'parasut' };
  }

  // DIA: "HspKod", "HspAd", "Brc", "Alc"
  if (headerStr.includes('hspkod') || headerStr.includes('hspad')) {
    return { isMizan: true, software: 'dia' };
  }

  // Generic mizan detection
  const hasBorcAlacak = (headerStr.includes('borc') || headerStr.includes('borç')) &&
                        (headerStr.includes('alacak'));
  const hasHesap = headerStr.includes('hesap') || headerStr.includes('account');

  if (hasBorcAlacak && hasHesap) {
    return { isMizan: true, software: 'unknown' };
  }

  return { isMizan: false, software: 'unknown' };
}
