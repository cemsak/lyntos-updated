/**
 * Risk Rules Sabit Tanımları
 */

import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Severity konfigürasyonu
interface SeverityConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}

export const severityConfig: Record<string, SeverityConfig> = {
  CRITICAL: { label: 'Kritik', color: 'bg-[#FEF2F2] text-[#BF192B] border-[#FFC7C9]', icon: AlertCircle },
  HIGH: { label: 'Yüksek', color: 'bg-[#FFFBEB] text-[#FA841E] border-[#FFF08C]', icon: AlertTriangle },
  MEDIUM: { label: 'Orta', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Info },
  LOW: { label: 'Düşük', color: 'bg-[#ECFDF5] text-[#00804D] border-[#AAE8B8]', icon: CheckCircle2 }
};

// Kategori etiketleri
export const categoryLabels: Record<string, string> = {
  VDK_RISK: 'VDK Risk',
  KURGAN: 'KURGAN',
  RAM: 'RAM',
  KV_BRIDGE: 'Kurumlar',
  CROSS_CHECK: 'Çapraz Kontrol',
  GVK: 'Gelir Vergisi',
  KDV: 'KDV',
  MIZAN: 'Mizan',
  SGK: 'SGK',
  INFLATION: 'Enflasyon',
  ALACAK_ANALIZI: 'Alacak',
  VARLIK_ANALIZI: 'Varlık',
  STOK_ANALIZI: 'Stok',
  ILISKILI_TARAF: 'İlişkili Taraf',
  TEDARIKCI_ANALIZI: 'Tedarikçi',
  TREND_ANALIZI: 'Trend'
};

// Kaynak tipi etiketleri
export const sourceLabels: Record<string, { label: string; color: string }> = {
  yaml: { label: 'YAML', color: 'bg-[#E6F9FF] text-[#0049AA]' },
  json: { label: 'JSON', color: 'bg-[#E6F9FF] text-[#0049AA]' },
  python: { label: 'Python', color: 'bg-[#ECFDF5] text-[#00804D]' },
  db: { label: 'DB', color: 'bg-[#F5F6F8] text-[#5A5A5A]' }
};

// Resolution etiketleri
export const resolutionLabels: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'Bekliyor', color: 'bg-[#FFFBEB] text-[#FA841E]', icon: '⏳' },
  keep_both: { label: 'İkisi de Korundu', color: 'bg-[#ECFDF5] text-[#00804D]', icon: '✅' },
  merge: { label: 'Birleştirildi', color: 'bg-[#E6F9FF] text-[#0049AA]', icon: '🔗' },
  deprecate_1: { label: 'İlk Kural Devre Dışı', color: 'bg-[#FEF2F2] text-[#BF192B]', icon: '❌' },
  deprecate_2: { label: 'İkinci Kural Devre Dışı', color: 'bg-[#FEF2F2] text-[#BF192B]', icon: '❌' },
  remove_duplicate: { label: 'Yanlış Eşleşme', color: 'bg-[#F5F6F8] text-[#5A5A5A]', icon: '🚫' }
};
