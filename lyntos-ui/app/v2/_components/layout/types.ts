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
}

// Layout context
export interface LayoutContextType {
  user: User | null;
  selectedClient: Client | null;
  selectedPeriod: Period | null;
  clients: Client[];
  periods: Period[];
  setSelectedClient: (client: Client | null) => void;
  setSelectedPeriod: (period: Period | null) => void;
}

// Risk level colors (Stripe palette)
export const RISK_COLORS = {
  kritik: { bg: 'bg-[#cd3d64]', text: 'text-[#cd3d64]', dot: 'bg-[#cd3d64]' },
  yuksek: { bg: 'bg-[#e56f4a]', text: 'text-[#e56f4a]', dot: 'bg-[#e56f4a]' },
  orta: { bg: 'bg-[#f5a623]', text: 'text-[#f5a623]', dot: 'bg-[#f5a623]' },
  dusuk: { bg: 'bg-[#0caf60]', text: 'text-[#0caf60]', dot: 'bg-[#0caf60]' },
  belirsiz: { bg: 'bg-[#697386]', text: 'text-[#697386]', dot: 'bg-[#697386]' },
} as const;
