/**
 * LYNTOS Mizan Store
 * Sprint 5.2 - Mizan Data Management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ParsedMizan, AccountBalance } from '../../_components/upload/mizanParser';

interface MizanMeta {
  taxpayerId: string;
  taxpayerName: string;
  period: string; // "2024-Q4" veya "2024-12"
  uploadedAt: string;
}

interface MizanState {
  // Data
  parsedMizan: ParsedMizan | null;
  meta: MizanMeta | null;

  // Computed (Rule Engine için)
  accounts: AccountBalance[];
  summary: {
    aktifToplam: number;
    pasifToplam: number;
    ozSermaye: number;
    yabanciKaynak: number;
    borcToplam: number;
    alacakToplam: number;
  } | null;

  // Status
  loaded: boolean;

  // Actions
  setMizan: (data: ParsedMizan, meta: MizanMeta) => void;
  clearMizan: () => void;
  getAccountByCode: (kod: string) => AccountBalance | undefined;
  getAccountsByPrefix: (prefix: string) => AccountBalance[];
}

function calculateSummary(accounts: AccountBalance[]) {
  // 1xx, 2xx = Aktif (Borç bakiye)
  const aktifToplam = accounts
    .filter(a => a.hesapKodu.startsWith('1') || a.hesapKodu.startsWith('2'))
    .reduce((sum, a) => sum + a.borcBakiye - a.alacakBakiye, 0);

  // 3xx, 4xx = Yabancı Kaynak (Alacak bakiye)
  const yabanciKaynak = accounts
    .filter(a => a.hesapKodu.startsWith('3') || a.hesapKodu.startsWith('4'))
    .reduce((sum, a) => sum + a.alacakBakiye - a.borcBakiye, 0);

  // 5xx = Öz Sermaye (Alacak bakiye)
  const ozSermaye = accounts
    .filter(a => a.hesapKodu.startsWith('5'))
    .reduce((sum, a) => sum + a.alacakBakiye - a.borcBakiye, 0);

  const pasifToplam = yabanciKaynak + ozSermaye;

  const borcToplam = accounts.reduce((sum, a) => sum + a.borcToplam, 0);
  const alacakToplam = accounts.reduce((sum, a) => sum + a.alacakToplam, 0);

  return { aktifToplam, pasifToplam, ozSermaye, yabanciKaynak, borcToplam, alacakToplam };
}

export const useMizanStore = create<MizanState>()(
  persist(
    (set, get) => ({
      parsedMizan: null,
      meta: null,
      accounts: [],
      summary: null,
      loaded: false,

      setMizan: (data, meta) => {
        const accounts = data.accounts;
        const summary = calculateSummary(accounts);
        set({
          parsedMizan: data,
          meta,
          accounts,
          summary,
          loaded: true,
        });
      },

      clearMizan: () => set({
        parsedMizan: null,
        meta: null,
        accounts: [],
        summary: null,
        loaded: false,
      }),

      getAccountByCode: (kod) => get().accounts.find(a => a.hesapKodu === kod),

      getAccountsByPrefix: (prefix) => get().accounts.filter(a => a.hesapKodu.startsWith(prefix)),
    }),
    { name: 'lyntos-mizan-store', version: 1 }
  )
);

// Selector hooks
export const useMizanLoaded = () => useMizanStore(s => s.loaded);
export const useMizanAccounts = () => useMizanStore(s => s.accounts);
export const useMizanSummary = () => useMizanStore(s => s.summary);
export const useMizanMeta = () => useMizanStore(s => s.meta);
