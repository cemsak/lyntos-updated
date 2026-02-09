/**
 * LYNTOS Dashboard Layout Types
 * Sprint 7.3 - Stripe Dashboard Shell
 */

// User type - SMMM bilgileri
export interface User {
  id: string;
  name: string;           // "Ahmet Yılmaz"
  title: string;          // "SMMM" | "YMM"
  email: string;
  avatar?: string;        // URL or initials fallback
  initials: string;       // "AY"
}

// Client type - Mükellef bilgileri
export interface Client {
  id: string;
  name: string;           // "ÖZKAN KIRTASİYE TİC. LTD. ŞTİ."
  shortName: string;      // "ÖZKAN KIRTASİYE"
  vkn: string;            // "1234567890"
  riskLevel: 'kritik' | 'yuksek' | 'orta' | 'dusuk' | 'belirsiz';
  riskScore?: number;     // 0-100
  sector?: string;        // "Perakende"
  naceCode?: string;      // "47.62"
  isFavorite?: boolean;
  lastActivity?: string;  // ISO date
}

// Period type - Dönem bilgileri
export interface Period {
  id: string;
  code: string;           // "2025-Q2"
  label: string;          // "2025 Q2"
  description: string;    // "Nisan - Haziran 2025"
  startDate: string;      // "2025-04-01"
  endDate: string;        // "2025-06-30"
  isActive: boolean;      // Aktif beyanname dönemi mi?
  isCurrent: boolean;     // Şu anki dönem mi?
  year: number;           // 2025
  periodType: 'quarter' | 'month';  // Çeyrek veya ay
  periodNumber: number;   // 1-4 for quarter, 1-12 for month
}

// Türkçe çeyrek isimleri
export const QUARTERS_TR: Record<number, string> = {
  1: '1. Çeyrek',
  2: '2. Çeyrek',
  3: '3. Çeyrek',
  4: '4. Çeyrek',
};

// Türkçe ay isimleri
export const MONTHS_TR: Record<number, string> = {
  1: 'Ocak', 2: 'Şubat', 3: 'Mart',
  4: 'Nisan', 5: 'Mayıs', 6: 'Haziran',
  7: 'Temmuz', 8: 'Ağustos', 9: 'Eylül',
  10: 'Ekim', 11: 'Kasım', 12: 'Aralık',
};

// Layout context
export interface LayoutContextType {
  user: User | null;
  selectedClient: Client | null;
  selectedPeriod: Period | null;
  clients: Client[];
  periods: Period[];
  loading: boolean;
  error: string | null;
  setSelectedClient: (client: Client | null) => void;
  setSelectedPeriod: (period: Period | null) => void;
  refreshPeriods: (clientId: string) => Promise<void>;
  refreshClients: () => Promise<void>;
  /** Header selector'ları vurgulama (ScopeGuide tarafından tetiklenir) */
  highlightSelectors: boolean;
  setHighlightSelectors: (value: boolean) => void;
}

// Risk level colors (LYNTOS Kartela Uyumlu - design-tokens.ts)
// Renk değerleri: KRITIK=#980F30, YUKSEK=#F0282D, ORTA=#FFB114, DUSUK=#00A651, NORMAL=#5A5A5A
export const RISK_COLORS = {
  kritik: { bg: 'bg-[#980F30]', text: 'text-[#980F30]', dot: 'bg-[#980F30]' },  // LYNTOS Kritik
  yuksek: { bg: 'bg-[#F0282D]', text: 'text-[#BF192B]', dot: 'bg-[#F0282D]' },  // LYNTOS Yüksek
  orta: { bg: 'bg-[#FFB114]', text: 'text-[#E67324]', dot: 'bg-[#FFB114]' },    // LYNTOS Orta
  dusuk: { bg: 'bg-[#00A651]', text: 'text-[#00804D]', dot: 'bg-[#00A651]' },   // LYNTOS Düşük
  belirsiz: { bg: 'bg-[#5A5A5A]', text: 'text-[#5A5A5A]', dot: 'bg-[#5A5A5A]' }, // LYNTOS Nötr
} as const;
