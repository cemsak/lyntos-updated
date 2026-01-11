/**
 * LYNTOS Dashboard Types
 * Universal data contracts for all panels
 *
 * Rule: Every panel MUST use PanelEnvelope<T>
 */

// ============================================
// PANEL STATUS - Universal state machine
// ============================================
export type PanelStatus =
  | 'loading'   // Veri yukleniyor
  | 'ok'        // Veri basariyla yuklendi
  | 'empty'     // Veri var ama bos
  | 'missing'   // Veri eksik (belge yuklenmemis)
  | 'auth'      // Yetki gerekli
  | 'error';    // Hata olustu

// ============================================
// PANEL ENVELOPE - Universal data wrapper
// ============================================
export interface PanelEnvelope<T> {
  /** Current status of the panel */
  status: PanelStatus;

  /** The actual data (null when loading/error/empty) */
  data: T | null;

  /** Human-readable message for non-ok states */
  message?: string;

  /** Optional action button for fail-soft UX */
  action?: {
    label: string;
    onClick: () => void;
  };

  /** Metadata for debugging/display */
  meta?: {
    timestamp: string;
    source: string;
    requestId?: string;
  };
}

// ============================================
// HELPER: Create envelope factories
// ============================================
export function createLoadingEnvelope<T>(): PanelEnvelope<T> {
  return {
    status: 'loading',
    data: null,
  };
}

export function createOkEnvelope<T>(data: T, source?: string): PanelEnvelope<T> {
  return {
    status: 'ok',
    data,
    meta: {
      timestamp: new Date().toISOString(),
      source: source || 'api',
    },
  };
}

export function createEmptyEnvelope<T>(message?: string): PanelEnvelope<T> {
  return {
    status: 'empty',
    data: null,
    message: message || 'Veri bulunamadi',
  };
}

export function createMissingEnvelope<T>(message: string, action?: PanelEnvelope<T>['action']): PanelEnvelope<T> {
  return {
    status: 'missing',
    data: null,
    message,
    action,
  };
}

export function createAuthEnvelope<T>(message?: string): PanelEnvelope<T> {
  return {
    status: 'auth',
    data: null,
    message: message || 'Bu islem icin yetkiniz bulunmuyor',
  };
}

export function createErrorEnvelope<T>(message: string, action?: PanelEnvelope<T>['action']): PanelEnvelope<T> {
  return {
    status: 'error',
    data: null,
    message,
    action,
  };
}

// ============================================
// KPI DATA TYPES
// ============================================
export interface KpiData {
  id: string;
  label: string;
  value: string | number;
  subLabel?: string;
  status: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  };
  trend?: {
    direction: 'up' | 'down' | 'stable';
    value: string;
  };
  detailUrl?: string;
}

export interface KpiStripData {
  kpis: KpiData[];
  period: string;
  lastUpdated: string;
}

// ============================================
// DOCUMENT STATUS TYPES
// ============================================
export type DocumentStatus = 'uploaded' | 'missing' | 'processing' | 'error';

export interface DocumentItem {
  id: string;
  name: string;
  status: DocumentStatus;
  required: boolean;
  uploadedAt?: string;
  fileSize?: string;
}

export interface DocumentStatusData {
  total: number;
  uploaded: number;
  missing: number;
  completionPercent: number;
  documents: DocumentItem[];
}

// ============================================
// TAX ANALYSIS TYPES (Gecici + Kurumlar)
// ============================================
export type ControlStatus = 'passed' | 'warning' | 'failed' | 'pending' | 'skipped';

export interface TaxControl {
  id: string;
  name: string;
  status: ControlStatus;
  description?: string;
  value?: string | number;
  threshold?: string | number;
}

export interface TaxAnalysisData {
  period: string;
  totalControls: number;
  passedControls: number;
  warningControls: number;
  failedControls: number;
  estimatedTax?: number;
  controls: TaxControl[];
  summary?: {
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
  };
}

// ============================================
// KURUMLAR VERGISI SPECIFIC
// ============================================
export interface KurumlarCategory {
  id: string;
  title: string;
  description: string;
  itemCount: number;
  status: 'success' | 'warning' | 'error' | 'neutral';
  items: TaxControl[];
}

export interface KurumlarVergisiData extends TaxAnalysisData {
  categories: {
    denetimKontrolleri: KurumlarCategory;  // 6 kontrol
    vergiAvantajlari: KurumlarCategory;     // 6 avantaj
    zorunluKontroller: KurumlarCategory;    // 8 kontrol
  };
  matrahHesabi?: {
    ticariKar: number;
    kkegToplam: number;
    indirimler: number;
    matrah: number;
  };
}

// ============================================
// MIZAN & CROSS-CHECK TYPES
// ============================================
export interface MizanHesap {
  kod: string;
  ad: string;
  borc: number;
  alacak: number;
  bakiye: number;
  status: 'normal' | 'warning' | 'critical';
  note?: string;
}

export interface MizanOmurgaData {
  period: string;
  toplamBorc: number;
  toplamAlacak: number;
  bakiyeDengesi: boolean;
  kritikHesaplar: MizanHesap[];
  vdkSkoru: number;
  kontrolSayisi: number;
  gecenKontrol: number;
}

export interface CrossCheckResult {
  id: string;
  source: string;
  target: string;
  status: 'matched' | 'mismatch' | 'pending';
  difference?: number;
  details?: string;
}

export interface CrossCheckData {
  period: string;
  checks: CrossCheckResult[];
  matchedCount: number;
  mismatchCount: number;
  pendingCount: number;
}

// ============================================
// REGWATCH TYPES
// ============================================
export interface RegWatchEvent {
  id: string;
  title: string;
  source: string;
  date: string;
  severity: 'high' | 'medium' | 'low';
  status: 'new' | 'reviewed' | 'applied' | 'dismissed';
  summary?: string;
  affectedAreas?: string[];
}

export interface RegWatchData {
  lastScan: string;
  totalEvents: number;
  newEvents: number;
  pendingReview: number;
  events: RegWatchEvent[];
}

// ============================================
// ACTIONABLE TASKS (Acil Isler)
// ============================================
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface ActionableTask {
  id: string;
  title: string;
  clientName: string;
  deadline: string;
  daysRemaining: number;
  estimatedTime: string;
  priority: TaskPriority;
  taskType: string;
  details?: {
    missingItems?: string[];
    complianceImpact?: string;
  };
  actions?: {
    canEmail: boolean;
    canAutoResolve: boolean;
  };
}

export interface ActionableTasksData {
  tasks: ActionableTask[];
  totalCount: number;
  criticalCount: number;
  todayCount: number;
}

// ============================================
// INFLATION (Enflasyon Muhasebesi)
// ============================================
export interface InflationDocument {
  id: string;
  name: string;
  status: 'uploaded' | 'missing' | 'processing';
  required: boolean;
}

export interface InflationData {
  period: string;
  tufeEndeksi: number;
  yiufeDegisim: number;
  documents: InflationDocument[];
  missingDocuments: number;
  status: 'ready' | 'incomplete' | 'processing';
  calculationResult?: {
    duzeltmeFarki: number;
    amortismanDuzeltme: number;
    netPozisyon: number;
  };
}

// ============================================
// TYPE ALIASES
// ============================================
/** Alias for MizanOmurgaData - used by hooks */
export type MizanData = MizanOmurgaData;
