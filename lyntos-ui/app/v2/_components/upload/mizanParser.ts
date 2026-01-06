/**
 * LYNTOS Mizan Parser
 * Extracts account balances from Excel/CSV mizan files
 */

import * as XLSX from 'xlsx';

// Account balance structure
export interface AccountBalance {
  hesapKodu: string;
  hesapAdi: string;
  borcToplam: number;
  alacakToplam: number;
  borcBakiye: number;
  alacakBakiye: number;
}

// Parsed mizan result
export interface ParsedMizan {
  accounts: AccountBalance[];
  totals: {
    borcToplam: number;
    alacakToplam: number;
    borcBakiye: number;
    alacakBakiye: number;
  };
  metadata: {
    rowCount: number;
    parseDate: string;
    sourceFile: string;
  };
}

// Common column name mappings (Turkish variations)
const COLUMN_MAPPINGS = {
  hesapKodu: ['hesap kodu', 'hesap no', 'hesapkodu', 'hesapno', 'kod', 'account code', 'hsp kodu'],
  hesapAdi: ['hesap adi', 'hesapadi', 'aciklama', 'account name'],
  borcToplam: ['borc toplam', 'borctoplam', 'borc', 'debit total', 'debit'],
  alacakToplam: ['alacak toplam', 'alacaktoplam', 'alacak', 'credit total', 'credit'],
  borcBakiye: ['borc bakiye', 'borcbakiye', 'debit balance'],
  alacakBakiye: ['alacak bakiye', 'alacakbakiye', 'credit balance'],
};

// Find matching column index
function findColumnIndex(headers: string[], mappings: string[]): number {
  const normalized = headers.map(h => h?.toString().toLowerCase().trim() || '');
  for (const mapping of mappings) {
    const idx = normalized.indexOf(mapping.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

// Parse number from cell (handles Turkish format)
function parseNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;

  const str = value.toString()
    .replace(/\./g, '')      // Remove thousand separators
    .replace(/,/g, '.')      // Convert decimal comma to dot
    .replace(/[^\d.-]/g, ''); // Remove non-numeric chars

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// Parse Excel/CSV buffer
export function parseMizanFile(buffer: ArrayBuffer, fileName: string): ParsedMizan {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to JSON with headers (header: 1 returns array of arrays)
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

  if (rows.length < 2) {
    throw new Error('Mizan dosyasi bos veya gecersiz format');
  }

  // Find header row (first row with recognizable columns)
  let headerRowIdx = 0;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row) || row.length < 3) continue;

    const rowStrs = row.map(c => c?.toString().toLowerCase().trim() || '');
    const hasHesapKodu = COLUMN_MAPPINGS.hesapKodu.some(m => rowStrs.includes(m.toLowerCase()));
    const hasBorcOrAlacak = COLUMN_MAPPINGS.borcToplam.some(m => rowStrs.includes(m.toLowerCase())) ||
                            COLUMN_MAPPINGS.alacakToplam.some(m => rowStrs.includes(m.toLowerCase()));

    if (hasHesapKodu && hasBorcOrAlacak) {
      headerRowIdx = i;
      headers = rowStrs;
      break;
    }
  }

  if (headers.length === 0) {
    throw new Error('Mizan baslik satiri bulunamadi');
  }

  // Map columns
  const colIdx = {
    hesapKodu: findColumnIndex(headers, COLUMN_MAPPINGS.hesapKodu),
    hesapAdi: findColumnIndex(headers, COLUMN_MAPPINGS.hesapAdi),
    borcToplam: findColumnIndex(headers, COLUMN_MAPPINGS.borcToplam),
    alacakToplam: findColumnIndex(headers, COLUMN_MAPPINGS.alacakToplam),
    borcBakiye: findColumnIndex(headers, COLUMN_MAPPINGS.borcBakiye),
    alacakBakiye: findColumnIndex(headers, COLUMN_MAPPINGS.alacakBakiye),
  };

  if (colIdx.hesapKodu === -1) {
    throw new Error('Hesap kodu sutunu bulunamadi');
  }

  // Parse data rows
  const accounts: AccountBalance[] = [];
  const totals = { borcToplam: 0, alacakToplam: 0, borcBakiye: 0, alacakBakiye: 0 };

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row) || row.length === 0) continue;

    const hesapKodu = row[colIdx.hesapKodu]?.toString().trim() || '';
    if (!hesapKodu || !/^\d{3}/.test(hesapKodu)) continue; // Skip non-account rows

    const account: AccountBalance = {
      hesapKodu,
      hesapAdi: colIdx.hesapAdi >= 0 ? row[colIdx.hesapAdi]?.toString().trim() || '' : '',
      borcToplam: colIdx.borcToplam >= 0 ? parseNumber(row[colIdx.borcToplam]) : 0,
      alacakToplam: colIdx.alacakToplam >= 0 ? parseNumber(row[colIdx.alacakToplam]) : 0,
      borcBakiye: colIdx.borcBakiye >= 0 ? parseNumber(row[colIdx.borcBakiye]) : 0,
      alacakBakiye: colIdx.alacakBakiye >= 0 ? parseNumber(row[colIdx.alacakBakiye]) : 0,
    };

    // Calculate bakiye if not provided
    if (colIdx.borcBakiye === -1 && colIdx.alacakBakiye === -1) {
      const net = account.borcToplam - account.alacakToplam;
      if (net > 0) {
        account.borcBakiye = net;
      } else {
        account.alacakBakiye = Math.abs(net);
      }
    }

    accounts.push(account);

    // Update totals
    totals.borcToplam += account.borcToplam;
    totals.alacakToplam += account.alacakToplam;
    totals.borcBakiye += account.borcBakiye;
    totals.alacakBakiye += account.alacakBakiye;
  }

  return {
    accounts,
    totals,
    metadata: {
      rowCount: accounts.length,
      parseDate: new Date().toISOString(),
      sourceFile: fileName,
    },
  };
}

// Get balance for a specific account code (supports wildcards like "15X" for all 150-159)
export function getAccountBalance(mizan: ParsedMizan, hesapKodu: string): number {
  if (hesapKodu.includes('X')) {
    // Wildcard: sum all matching accounts
    const prefix = hesapKodu.replace('X', '');
    const matching = mizan.accounts.filter(a => a.hesapKodu.startsWith(prefix));
    return matching.reduce((sum, a) => sum + a.borcBakiye - a.alacakBakiye, 0);
  }

  const account = mizan.accounts.find(a => a.hesapKodu === hesapKodu || a.hesapKodu.startsWith(hesapKodu));
  if (!account) return 0;

  return account.borcBakiye - account.alacakBakiye;
}

// Get total for account group (e.g., "1" for all assets)
export function getAccountGroupTotal(mizan: ParsedMizan, groupPrefix: string): number {
  const matching = mizan.accounts.filter(a => a.hesapKodu.startsWith(groupPrefix));
  return matching.reduce((sum, a) => sum + a.borcBakiye - a.alacakBakiye, 0);
}
