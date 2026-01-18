/**
 * LYNTOS Mizan Store
 * Sprint 5.2 - Mizan Data Management
 * Sprint 6.0 - Backend Sync Integration
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ParsedMizan, AccountBalance } from '../../_components/upload/mizanParser';
import { syncMizanToBackend, type MizanSyncResponse } from '../api/mizanSync';

interface MizanMeta {
  taxpayerId: string;
  taxpayerName: string;
  period: string; // "2024-Q4" veya "2024-12"
  uploadedAt: string;
  sourceFile?: string;
}

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface MizanState {
  // Data
  parsedMizan: ParsedMizan | null;
  meta: MizanMeta | null;

  // Computed (Rule Engine icin)
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

  // Sync state
  syncStatus: SyncStatus;
  lastSyncResult: MizanSyncResponse | null;
  lastSyncAt: string | null;

  // Actions
  setMizan: (data: ParsedMizan, meta: MizanMeta) => void;
  clearMizan: () => void;
  getAccountByCode: (kod: string) => AccountBalance | undefined;
  getAccountsByPrefix: (prefix: string) => AccountBalance[];
  syncToBackend: (tenantId: string, clientId: string, periodId: string) => Promise<MizanSyncResponse>;
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
      syncStatus: 'idle',
      lastSyncResult: null,
      lastSyncAt: null,

      setMizan: (data, meta) => {
        const accounts = data.accounts;
        const summary = calculateSummary(accounts);
        set({
          parsedMizan: data,
          meta,
          accounts,
          summary,
          loaded: true,
          // Reset sync status when new data is loaded
          syncStatus: 'idle',
          lastSyncResult: null,
        });
      },

      clearMizan: () => set({
        parsedMizan: null,
        meta: null,
        accounts: [],
        summary: null,
        loaded: false,
        syncStatus: 'idle',
        lastSyncResult: null,
        lastSyncAt: null,
      }),

      getAccountByCode: (kod) => get().accounts.find(a => a.hesapKodu === kod),

      getAccountsByPrefix: (prefix) => get().accounts.filter(a => a.hesapKodu.startsWith(prefix)),

      syncToBackend: async (tenantId, clientId, periodId) => {
        const state = get();

        // Check if there's data to sync
        if (!state.loaded || state.accounts.length === 0) {
          const errorResult: MizanSyncResponse = {
            success: false,
            synced_count: 0,
            error_count: 0,
            period_id: periodId,
            totals: { borc_toplam: 0, alacak_toplam: 0, borc_bakiye: 0, alacak_bakiye: 0 },
            errors: ['No mizan data to sync'],
            missing_data: { reason: 'Store is empty' },
            actions: ['Upload and parse mizan file first'],
          };
          set({ lastSyncResult: errorResult, syncStatus: 'error' });
          return errorResult;
        }

        // Set syncing status
        set({ syncStatus: 'syncing' });

        // Build payload - map camelCase to snake_case
        const payload = {
          meta: {
            tenant_id: tenantId,
            client_id: clientId,
            period_id: periodId,
            source_file: state.meta?.sourceFile || state.parsedMizan?.metadata?.sourceFile || 'unknown',
            uploaded_at: state.meta?.uploadedAt || new Date().toISOString(),
          },
          entries: state.accounts.map((account, idx) => ({
            hesap_kodu: account.hesapKodu,
            hesap_adi: account.hesapAdi,
            borc_toplam: account.borcToplam,
            alacak_toplam: account.alacakToplam,
            borc_bakiye: account.borcBakiye,
            alacak_bakiye: account.alacakBakiye,
            row_index: idx,
          })),
          summary: state.summary ? {
            aktif_toplam: state.summary.aktifToplam,
            pasif_toplam: state.summary.pasifToplam,
            oz_sermaye: state.summary.ozSermaye,
            yabanci_kaynak: state.summary.yabanciKaynak,
            borc_toplam: state.summary.borcToplam,
            alacak_toplam: state.summary.alacakToplam,
          } : undefined,
        };

        // Call API
        const result = await syncMizanToBackend(payload);

        // Update state with result
        set({
          lastSyncResult: result,
          lastSyncAt: new Date().toISOString(),
          syncStatus: result.success ? 'synced' : 'error',
        });

        return result;
      },
    }),
    { name: 'lyntos-mizan-store', version: 2 }
  )
);

// Selector hooks
export const useMizanLoaded = () => useMizanStore(s => s.loaded);
export const useMizanAccounts = () => useMizanStore(s => s.accounts);
export const useMizanSummary = () => useMizanStore(s => s.summary);
export const useMizanMeta = () => useMizanStore(s => s.meta);

// Sync selector hooks
export const useMizanSyncStatus = () => useMizanStore(s => s.syncStatus);
export const useMizanLastSyncResult = () => useMizanStore(s => s.lastSyncResult);
export const useMizanLastSyncAt = () => useMizanStore(s => s.lastSyncAt);
export const useMizanSyncToBackend = () => useMizanStore(s => s.syncToBackend);
