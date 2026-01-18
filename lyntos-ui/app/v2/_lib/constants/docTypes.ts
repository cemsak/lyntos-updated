/**
 * LYNTOS Document Type Definitions
 * Big-6 document categories required for period completion
 */

export const BIG_6_DOC_TYPES = [
  'MIZAN',
  'BEYANNAME',
  'TAHAKKUK',
  'BANKA',
  'EDEFTER_BERAT',
  'EFATURA_ARSIV',
] as const;

export type Big6DocType = typeof BIG_6_DOC_TYPES[number];

export interface DocTypeInfo {
  key: Big6DocType;
  label: string;
  labelTr: string;
  description: string;
  required: boolean;
  icon: string; // Lucide icon name
}

export const DOC_TYPE_INFO: Record<Big6DocType, DocTypeInfo> = {
  MIZAN: {
    key: 'MIZAN',
    label: 'Trial Balance',
    labelTr: 'Mizan',
    description: 'Donem sonu mizan raporu',
    required: true,
    icon: 'Table',
  },
  BEYANNAME: {
    key: 'BEYANNAME',
    label: 'Tax Declaration',
    labelTr: 'Beyanname',
    description: 'KDV, Muhtasar, Kurumlar vergisi beyannameleri',
    required: true,
    icon: 'FileText',
  },
  TAHAKKUK: {
    key: 'TAHAKKUK',
    label: 'Tax Assessment',
    labelTr: 'Tahakkuk',
    description: 'Vergi tahakkuk fisleri',
    required: true,
    icon: 'Receipt',
  },
  BANKA: {
    key: 'BANKA',
    label: 'Bank Statement',
    labelTr: 'Banka Ekstre',
    description: 'Banka hesap ekstreleri',
    required: true,
    icon: 'Landmark',
  },
  EDEFTER_BERAT: {
    key: 'EDEFTER_BERAT',
    label: 'e-Ledger Certificate',
    labelTr: 'e-Defter Berat',
    description: 'Elektronik defter berat dosyalari',
    required: true,
    icon: 'BookCheck',
  },
  EFATURA_ARSIV: {
    key: 'EFATURA_ARSIV',
    label: 'e-Invoice Archive',
    labelTr: 'e-Fatura/Arsiv',
    description: 'Elektronik fatura ve arsiv faturalari',
    required: true,
    icon: 'FileStack',
  },
};

// Status types for each document category
export type DocStatus = 'present' | 'missing' | 'error' | 'partial';

export interface DocCategoryStatus {
  docType: Big6DocType;
  info: DocTypeInfo;
  status: DocStatus;
  count: number;
  expectedMin: number;
  errorCount?: number;
  lastUpdated?: string;
}
