import {
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: 'create' | 'view' | 'download' | 'verify' | 'modify';
  user: string;
  details: string;
  ipAddress?: string;
}

export interface EvidenceDocument {
  id: string;
  filename: string;
  category: string;
  uploadedAt: string;
  uploadedBy: string;
  fileSize: number;
  mimeType: string;
  hash: string;
  version: number;
  status: 'verified' | 'pending' | 'rejected';
  legalReference?: string;
  workpaperRef?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  auditTrail: AuditEntry[];
}

export interface BundleSection {
  id: string;
  title: string;
  description: string;
  status: 'complete' | 'partial' | 'pending';
  files: number;
  documents: EvidenceDocument[];
  workpaperPrefix: string;
  legalBasis?: string;
  isExpanded?: boolean;
}

export interface BundleSummary {
  sections: BundleSection[];
  totalFiles: number;
  completedFiles: number;
  lastUpdated: string;
  preparedBy: string;
  reviewedBy?: string;
  bundleHash?: string;
}

export const STATUS_CONFIG = {
  complete: { icon: CheckCircle, color: 'text-[#00804D]', bg: 'bg-[#ECFDF5]', label: 'Tamamlandı' },
  partial: { icon: Clock, color: 'text-[#FA841E]', bg: 'bg-[#FFFBEB]', label: 'Eksik' },
  pending: { icon: AlertCircle, color: 'text-[#969696]', bg: 'bg-[#F5F6F8]', label: 'Bekliyor' },
};

export const DOC_STATUS_CONFIG = {
  verified: { icon: CheckCircle, color: 'text-[#00804D]', bg: 'bg-[#ECFDF5]', label: 'Doğrulandı' },
  pending: { icon: Clock, color: 'text-[#FA841E]', bg: 'bg-[#FFFBEB]', label: 'Bekliyor' },
  rejected: { icon: AlertCircle, color: 'text-[#BF192B]', bg: 'bg-[#FEF2F2]', label: 'Reddedildi' },
};

export const BIG4_SECTIONS: BundleSection[] = [
  {
    id: 'A-general',
    title: 'A - Genel Bilgiler',
    description: 'Şirket bilgileri, sözleşmeler, yetki belgeleri',
    status: 'pending',
    files: 0,
    documents: [],
    workpaperPrefix: 'A',
    legalBasis: 'TTK Md. 64-88',
  },
  {
    id: 'B-mizan',
    title: 'B - Mizan ve Defterler',
    description: 'Dönem sonu mizan, yevmiye, kebir defterleri',
    status: 'pending',
    files: 0,
    documents: [],
    workpaperPrefix: 'B',
    legalBasis: 'VUK Md. 171-182',
  },
  {
    id: 'C-beyan',
    title: 'C - Vergi Beyannameleri',
    description: 'KV, KDV, Muhtasar, Geçici vergi beyannameleri',
    status: 'pending',
    files: 0,
    documents: [],
    workpaperPrefix: 'C',
    legalBasis: 'VUK Md. 25-30',
  },
  {
    id: 'D-fatura',
    title: 'D - E-Fatura / E-Arşiv',
    description: 'Elektronik fatura ve arşiv belgeleri',
    status: 'pending',
    files: 0,
    documents: [],
    workpaperPrefix: 'D',
    legalBasis: 'VUK Md. 232, 242',
  },
  {
    id: 'E-banka',
    title: 'E - Banka ve Finansal',
    description: 'Banka ekstreleri, mutabakat mektupları',
    status: 'pending',
    files: 0,
    documents: [],
    workpaperPrefix: 'E',
    legalBasis: 'VUK Md. 256',
  },
  {
    id: 'F-sgk',
    title: 'F - SGK ve Bordro',
    description: 'APHB, bordro dökümleri, SGK bildirgeleri',
    status: 'pending',
    files: 0,
    documents: [],
    workpaperPrefix: 'F',
    legalBasis: '5510 SK Md. 86',
  },
  {
    id: 'G-analiz',
    title: 'G - Analitik İnceleme',
    description: 'Risk analizi, KURGAN raporu, VDK kontrolleri',
    status: 'pending',
    files: 0,
    documents: [],
    workpaperPrefix: 'G',
    legalBasis: 'VUK Md. 134-141',
  },
  {
    id: 'H-sonuc',
    title: 'H - Sonuç ve Görüş',
    description: 'Denetim görüşü, düzeltme önerileri',
    status: 'pending',
    files: 0,
    documents: [],
    workpaperPrefix: 'H',
    legalBasis: 'SPK Denetim Standartları',
  },
];
