import {
  FileSpreadsheet,
  FileText,
  FileCode,
  Building2,
  Receipt,
  AlertCircle,
  ArrowRightLeft,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FileTypeConfigEntry } from './types';

export const FILE_TYPE_CONFIG: Record<string, FileTypeConfigEntry> = {
  'MIZAN': { label: 'Mizan', icon: FileSpreadsheet, color: 'text-[#00804D] bg-[#ECFDF5]' },
  'BANKA': { label: 'Banka Ekstresi', icon: Building2, color: 'text-[#00A651] bg-[#ECFDF5]' },
  'BEYANNAME': { label: 'Beyanname', icon: FileText, color: 'text-[#BF192B] bg-[#FEF2F2]' },
  'TAHAKKUK': { label: 'Tahakkuk', icon: FileText, color: 'text-[#BF192B] bg-[#FEF2F2]' },
  'YEVMIYE': { label: 'Yevmiye', icon: FileSpreadsheet, color: 'text-[#0049AA] bg-[#E6F9FF]' },
  'KEBIR': { label: 'Kebir', icon: FileSpreadsheet, color: 'text-[#0049AA] bg-[#E6F9FF]' },
  'EDEFTER_BERAT': { label: 'E-Defter Berat\u0131', icon: FileCode, color: 'text-[#0078D0] bg-[#E6F9FF]' },
  'EFATURA_ARSIV': { label: 'E-Fatura/Ar\u015Fiv', icon: Receipt, color: 'text-[#FA841E] bg-[#FFFBEB]' },
  'OTHER': { label: 'Di\u011Fer', icon: AlertCircle, color: 'text-[#FA841E] bg-[#FFFBEB]' },
};

export function getFileTypeConfig(fileType: string): FileTypeConfigEntry {
  return FILE_TYPE_CONFIG[fileType] || FILE_TYPE_CONFIG['OTHER'];
}

export const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.xml', '.pdf', '.zip', '.txt', '.json'];
export const MAX_FILE_SIZE_MB = 50;
export const MAX_ZIP_SIZE_MB = 200;

export function validateFile(file: File, isZipMode: boolean): { valid: boolean; error?: string } {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  const maxSize = isZipMode ? MAX_ZIP_SIZE_MB : MAX_FILE_SIZE_MB;
  const sizeMB = file.size / (1024 * 1024);

  if (isZipMode && ext !== '.zip') {
    return { valid: false, error: `ZIP modu se\u00E7ili ama dosya tipi "${ext}". L\u00FCtfen .zip dosyas\u0131 y\u00FCkleyin.` };
  }

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `"${ext}" dosya tipi desteklenmiyor. Desteklenen: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  if (sizeMB > maxSize) {
    return {
      valid: false,
      error: `Dosya boyutu (${sizeMB.toFixed(1)} MB) \u00E7ok b\u00FCy\u00FCk. Maksimum: ${maxSize} MB`,
    };
  }

  return { valid: true };
}

// ─── Belge Kategori Sistemi (Zorunlu / Önerilen / Opsiyonel) ─────────────
export type UploadDocTier = 'zorunlu' | 'onerilen' | 'opsiyonel';

export interface UploadDocCategory {
  icon: LucideIcon;
  label: string;
  description: string;
  tier: UploadDocTier;
  subTypes?: string;
}

export const UPLOAD_DOC_CATEGORIES: UploadDocCategory[] = [
  // ── ZORUNLU (5 kategori) ──
  { icon: FileSpreadsheet, label: 'Mizan', description: 'Dönem sonu ayrıntılı mizan', tier: 'zorunlu' },
  { icon: FileCode, label: 'E-Defter', description: 'Yevmiye ve Kebir beratları (ZIP/XML)', tier: 'zorunlu' },
  { icon: FileText, label: 'Beyannameler', description: 'KDV, Muhtasar, Geçici Vergi — sistem otomatik algılar', tier: 'zorunlu', subTypes: 'KDV • Muhtasar • Geçici Vergi • Kurumlar' },
  { icon: Building2, label: 'Banka Ekstresi', description: 'Tüm hesapların dönem ekstresi', tier: 'zorunlu' },
  { icon: Receipt, label: 'Vergi Tahakkukları', description: 'GİB vergi tahakkuk belgeleri', tier: 'zorunlu' },
  // ── ÖNERİLEN ──
  { icon: Receipt, label: 'E-Fatura Listesi', description: 'Cross-check ve anomali tespiti için önerilir', tier: 'onerilen' },
  // ── OPSİYONEL ──
  { icon: FileText, label: 'Mali Tablolar', description: 'Bilanço, Gelir Tablosu', tier: 'opsiyonel' },
  { icon: ArrowRightLeft, label: 'Cari Hesap Ekstresi', description: 'Cari hesap mutabakat ekstreleri', tier: 'opsiyonel' },
];
