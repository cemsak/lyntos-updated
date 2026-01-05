// TCMB FAST System Participants 2025
// Source: https://www.tcmb.gov.tr (Official)
// NO DUMMY DATA - Real bank codes

import type { TurkishBank } from './types';

export const TURKISH_BANKS: Record<string, Omit<TurkishBank, 'code'>> = {
  // KAMU BANKALARI (Vergi odemesi yapilabilir)
  '0010': { name: 'T.C. ZIRAAT BANKASI A.S.', shortName: 'Ziraat', isTaxPayment: true, isKatilim: false },
  '0012': { name: 'T. HALK BANKASI A.S.', shortName: 'Halkbank', isTaxPayment: true, isKatilim: false },
  '0015': { name: 'T. VAKIFLAR BANKASI T.A.O', shortName: 'Vakifbank', isTaxPayment: true, isKatilim: false },

  // OZEL BANKALAR
  '0046': { name: 'AKBANK T.A.S.', shortName: 'Akbank', isTaxPayment: false, isKatilim: false },
  '0062': { name: 'T. GARANTI BANKASI A.S.', shortName: 'Garanti', isTaxPayment: false, isKatilim: false },
  '0064': { name: 'T. IS BANKASI A.S.', shortName: 'Is Bankasi', isTaxPayment: false, isKatilim: false },
  '0067': { name: 'YAPI VE KREDI BANKASI A.S.', shortName: 'Yapi Kredi', isTaxPayment: false, isKatilim: false },
  '0032': { name: 'T. EKONOMI BANKASI A.S.', shortName: 'TEB', isTaxPayment: false, isKatilim: false },
  '0099': { name: 'ING BANK A.S.', shortName: 'ING', isTaxPayment: false, isKatilim: false },
  '0111': { name: 'QNB FINANSBANK A.S.', shortName: 'QNB', isTaxPayment: false, isKatilim: false },
  '0134': { name: 'DENIZBANK A.S.', shortName: 'Denizbank', isTaxPayment: false, isKatilim: false },
  '0103': { name: 'FIBABANKA A.S.', shortName: 'Fibabanka', isTaxPayment: false, isKatilim: false },
  '0123': { name: 'HSBC BANK A.S.', shortName: 'HSBC', isTaxPayment: false, isKatilim: false },
  '0124': { name: 'ALTERNATIFBANK A.S.', shortName: 'Alternatifbank', isTaxPayment: false, isKatilim: false },
  '0125': { name: 'BURGAN BANK A.S.', shortName: 'Burgan', isTaxPayment: false, isKatilim: false },
  '0135': { name: 'ANADOLUBANK A.S.', shortName: 'Anadolubank', isTaxPayment: false, isKatilim: false },
  '0146': { name: 'ODEA BANK A.S.', shortName: 'Odeabank', isTaxPayment: false, isKatilim: false },
  '0059': { name: 'SEKERBANK T.A.S.', shortName: 'Sekerbank', isTaxPayment: false, isKatilim: false },
  '0060': { name: 'TURK TICARET BANKASI A.S.', shortName: 'Turk Ticaret', isTaxPayment: false, isKatilim: false },
  '0109': { name: 'ICBC TURKEY BANK A.S.', shortName: 'ICBC', isTaxPayment: false, isKatilim: false },
  '0157': { name: 'ENPARA BANK A.S.', shortName: 'Enpara', isTaxPayment: false, isKatilim: false },
  '0158': { name: 'COLENDI BANK A.S.', shortName: 'Colendi', isTaxPayment: false, isKatilim: false },
  '0159': { name: 'FUPS BANK A.S.', shortName: 'Fups', isTaxPayment: false, isKatilim: false },

  // KATILIM BANKALARI
  '0203': { name: 'ALBARAKA TURK KATILIM BANKASI A.S.', shortName: 'Albaraka', isTaxPayment: false, isKatilim: true },
  '0205': { name: 'KUVEYT TURK KATILIM BANKASI A.S.', shortName: 'Kuveyt Turk', isTaxPayment: false, isKatilim: true },
  '0206': { name: 'TURKIYE FINANS KATILIM BANKASI A.S.', shortName: 'Turkiye Finans', isTaxPayment: false, isKatilim: true },
  '0209': { name: 'ZIRAAT KATILIM BANKASI A.S.', shortName: 'Ziraat Katilim', isTaxPayment: true, isKatilim: true },
  '0210': { name: 'VAKIF KATILIM BANKASI A.S.', shortName: 'Vakif Katilim', isTaxPayment: true, isKatilim: true },
  '0211': { name: 'TURKIYE EMLAK KATILIM BANKASI A.S.', shortName: 'Emlak Katilim', isTaxPayment: false, isKatilim: true },
  '0212': { name: 'HAYAT FINANS KATILIM BANKASI A.S.', shortName: 'Hayat Finans', isTaxPayment: false, isKatilim: true },
  '0213': { name: 'T.O.M. KATILIM BANKASI A.S.', shortName: 'TOM Katilim', isTaxPayment: false, isKatilim: true },
  '0214': { name: 'DUNYA KATILIM BANKASI A.S.', shortName: 'Dunya Katilim', isTaxPayment: false, isKatilim: true },

  // YATIRIM BANKALARI
  '0143': { name: 'AKTIF YATIRIM BANKASI A.S.', shortName: 'Aktif Yatirim', isTaxPayment: false, isKatilim: false },
  '0150': { name: 'GOLDEN GLOBAL YATIRIM BANKASI A.S.', shortName: 'Golden Global', isTaxPayment: false, isKatilim: false },
  '0152': { name: 'DESTEK YATIRIM BANKASI A.S.', shortName: 'Destek Yatirim', isTaxPayment: false, isKatilim: false },
  '0153': { name: 'MISYON YATIRIM BANKASI A.S.', shortName: 'Misyon', isTaxPayment: false, isKatilim: false },
  '0160': { name: 'ZIRAAT DINAMIK BANKA A.S.', shortName: 'Ziraat Dinamik', isTaxPayment: false, isKatilim: false },

  // DIGER
  '0807': { name: 'POSTA VE TELGRAF TESKILATI A.S.', shortName: 'PTT', isTaxPayment: true, isKatilim: false },
};

// Extract bank code from IBAN
// Turkish IBAN format: TR + 2 check digits + 5 bank code + 16 account
export function getBankFromIBAN(iban: string): TurkishBank | null {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  if (!cleaned.startsWith('TR') || cleaned.length !== 26) return null;

  const bankCode = cleaned.substring(4, 9);
  const bank = TURKISH_BANKS[bankCode];

  return bank ? { code: bankCode, ...bank } : null;
}

// Find IBAN patterns in text
export function findIBANsInText(text: string): string[] {
  const ibanRegex = /TR\s?\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}/gi;
  return (text.match(ibanRegex) || []).map(iban => iban.replace(/\s/g, ''));
}

// Get bank count
export function getBankCount(): number {
  return Object.keys(TURKISH_BANKS).length;
}

// Get tax payment banks
export function getTaxPaymentBanks(): TurkishBank[] {
  return Object.entries(TURKISH_BANKS)
    .filter(([, bank]) => bank.isTaxPayment)
    .map(([code, bank]) => ({ code, ...bank }));
}

// Get katilim banks
export function getKatilimBanks(): TurkishBank[] {
  return Object.entries(TURKISH_BANKS)
    .filter(([, bank]) => bank.isKatilim)
    .map(([code, bank]) => ({ code, ...bank }));
}
