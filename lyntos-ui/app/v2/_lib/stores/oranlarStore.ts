/**
 * LYNTOS Güncel Oran Yönetim Sistemi
 * Sprint 5.2 - Otomatik Güncellenen Yasal Parametreler
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../api/client';

// ═══════════════════════════════════════════════════════════════════
// TİP TANIMLARI
// ═══════════════════════════════════════════════════════════════════

export interface OranKaynagi {
  tip: 'TCMB_API' | 'GIB' | 'RESMI_GAZETE' | 'ADMIN_OVERRIDE' | 'DEFAULT';
  tarih: string;
  referans?: string;
}

export interface FaizOranlari {
  tcmb_ticari_tl: number;
  tcmb_ticari_eur: number;
  tcmb_ticari_usd: number;
  tcmb_politika_faizi: number;
  reeskont_orani: number;
  avans_faiz_orani: number;
  gecikme_zammi_orani: number;
  tecil_faizi_orani: number;
  kaynak: OranKaynagi;
}

export interface VergiOranlari {
  kurumlar_vergisi: number;
  gecici_vergi: number;
  kdv_genel: number;
  kdv_indirimli_1: number;
  kdv_indirimli_2: number;
  stopaj_menkul_sermaye: number;
  stopaj_gayrimenkul: number;
  stopaj_serbest_meslek: number;
  damga_vergisi_orani: number;
  kaynak: OranKaynagi;
}

export interface BinekOtoLimitleri {
  yil: number;
  aylik_kira_limiti: number;
  otv_kdv_gider_limiti: number;
  amortisman_limiti_otv_kdv_dahil: number;
  amortisman_limiti_otv_kdv_haric: number;
  gider_kkeg_orani: number;
  kaynak: OranKaynagi;
}

export interface DovizKurlari {
  tarih: string;
  usd_alis: number;
  usd_satis: number;
  eur_alis: number;
  eur_satis: number;
  gbp_alis: number;
  gbp_satis: number;
  usd_efektif_alis: number;
  eur_efektif_alis: number;
  kaynak: OranKaynagi;
}

// ═══════════════════════════════════════════════════════════════════
// VARSAYILAN DEĞERLER (2024-2025)
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_FAIZ_ORANLARI: FaizOranlari = {
  tcmb_ticari_tl: 60.33,
  tcmb_ticari_eur: 6.96,
  tcmb_ticari_usd: 8.33,
  tcmb_politika_faizi: 50.00,
  reeskont_orani: 55.75,
  avans_faiz_orani: 56.75,
  gecikme_zammi_orani: 4.50,
  tecil_faizi_orani: 48.00,
  kaynak: { tip: 'DEFAULT', tarih: '2024-12-27', referans: 'TCMB EVDS' }
};

const DEFAULT_VERGI_ORANLARI: VergiOranlari = {
  kurumlar_vergisi: 0.25,
  gecici_vergi: 0.25,
  kdv_genel: 0.20,
  kdv_indirimli_1: 0.10,
  kdv_indirimli_2: 0.01,
  stopaj_menkul_sermaye: 0.10,
  stopaj_gayrimenkul: 0.20,
  stopaj_serbest_meslek: 0.20,
  damga_vergisi_orani: 0.00948,
  kaynak: { tip: 'DEFAULT', tarih: '2024-01-01', referans: 'KVK, GVK, KDVK' }
};

const DEFAULT_BINEK_OTO: Record<number, BinekOtoLimitleri> = {
  2024: {
    yil: 2024,
    aylik_kira_limiti: 26000,
    otv_kdv_gider_limiti: 690000,
    amortisman_limiti_otv_kdv_dahil: 1500000,
    amortisman_limiti_otv_kdv_haric: 790000,
    gider_kkeg_orani: 0.30,
    kaynak: { tip: 'GIB', tarih: '2024-01-01', referans: '324 Seri No.lu GVK Tebliği' }
  },
  2025: {
    yil: 2025,
    aylik_kira_limiti: 37000,
    otv_kdv_gider_limiti: 990000,
    amortisman_limiti_otv_kdv_dahil: 2100000,
    amortisman_limiti_otv_kdv_haric: 1100000,
    gider_kkeg_orani: 0.30,
    kaynak: { tip: 'GIB', tarih: '2025-01-01', referans: '329 Seri No.lu GVK Tebliği' }
  }
};

const DEFAULT_DOVIZ_KURLARI: DovizKurlari = {
  tarih: '2024-12-31',
  usd_alis: 35.1234,
  usd_satis: 35.2345,
  eur_alis: 36.5432,
  eur_satis: 36.6543,
  gbp_alis: 44.1234,
  gbp_satis: 44.2345,
  usd_efektif_alis: 35.0123,
  eur_efektif_alis: 36.4321,
  kaynak: { tip: 'DEFAULT', tarih: '2024-12-31', referans: 'TCMB' }
};

// ═══════════════════════════════════════════════════════════════════
// STORE STATE
// ═══════════════════════════════════════════════════════════════════

export interface OranlarState {
  faizOranlari: FaizOranlari;
  vergiOranlari: VergiOranlari;
  binekOtoLimitleri: Record<number, BinekOtoLimitleri>;
  dovizKurlari: DovizKurlari;
  sonGuncelleme: string;
  guncellemeDurumu: 'idle' | 'updating' | 'error';
  hataMesaji?: string;

  // Actions
  setFaizOranlari: (oranlar: FaizOranlari) => void;
  setVergiOranlari: (oranlar: VergiOranlari) => void;
  setBinekOtoLimitleri: (yil: number, limitler: BinekOtoLimitleri) => void;
  setDovizKurlari: (kurlar: DovizKurlari) => void;
  fetchTcmbOranlar: () => Promise<void>;
  fetchDovizKurlari: (tarih?: string) => Promise<void>;
  getYillikOranlar: (yil: number) => {
    binekOto: BinekOtoLimitleri | undefined;
  };
}

// ═══════════════════════════════════════════════════════════════════
// ZUSTAND STORE
// ═══════════════════════════════════════════════════════════════════

export const useOranlarStore = create<OranlarState>()(
  persist(
    (set, get) => ({
      faizOranlari: DEFAULT_FAIZ_ORANLARI,
      vergiOranlari: DEFAULT_VERGI_ORANLARI,
      binekOtoLimitleri: DEFAULT_BINEK_OTO,
      dovizKurlari: DEFAULT_DOVIZ_KURLARI,
      sonGuncelleme: new Date().toISOString(),
      guncellemeDurumu: 'idle',

      setFaizOranlari: (oranlar) => set({
        faizOranlari: oranlar,
        sonGuncelleme: new Date().toISOString()
      }),

      setVergiOranlari: (oranlar) => set({
        vergiOranlari: oranlar,
        sonGuncelleme: new Date().toISOString()
      }),

      setBinekOtoLimitleri: (yil, limitler) => set((state) => ({
        binekOtoLimitleri: { ...state.binekOtoLimitleri, [yil]: limitler },
        sonGuncelleme: new Date().toISOString()
      })),

      setDovizKurlari: (kurlar) => set({
        dovizKurlari: kurlar,
        sonGuncelleme: new Date().toISOString()
      }),

      fetchTcmbOranlar: async () => {
        set({ guncellemeDurumu: 'updating' });
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const res = await api.get<any>('/api/tcmb', { params: { tip: 'oranlar' } });
          if (!res.ok) throw new Error('TCMB API hatası');
          const data = res.data;

          if (data.success && data.faizOranlari) {
            set({
              faizOranlari: {
                ...data.faizOranlari,
                kaynak: { tip: 'TCMB_API', tarih: new Date().toISOString(), referans: 'TCMB EVDS API' }
              },
              guncellemeDurumu: 'idle',
              sonGuncelleme: new Date().toISOString()
            });
          }
        } catch (error) {
          set({
            guncellemeDurumu: 'error',
            hataMesaji: error instanceof Error ? error.message : 'Bilinmeyen hata'
          });
        }
      },

      fetchDovizKurlari: async (tarih?: string) => {
        set({ guncellemeDurumu: 'updating' });
        try {
          const targetDate = tarih || new Date().toISOString().split('T')[0];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const res = await api.get<any>('/api/tcmb', { params: { tip: 'kurlar', tarih: targetDate } });
          if (!res.ok) throw new Error('TCMB Kur API hatası');
          const data = res.data;

          if (data.success && data.kurlar) {
            set({
              dovizKurlari: {
                ...data.kurlar,
                tarih: targetDate,
                kaynak: { tip: 'TCMB_API', tarih: targetDate, referans: 'TCMB Döviz Kurları' }
              },
              guncellemeDurumu: 'idle',
              sonGuncelleme: new Date().toISOString()
            });
          }
        } catch (error) {
          set({
            guncellemeDurumu: 'error',
            hataMesaji: error instanceof Error ? error.message : 'Bilinmeyen hata'
          });
        }
      },

      getYillikOranlar: (yil: number) => ({
        binekOto: get().binekOtoLimitleri[yil],
      }),
    }),
    { name: 'lyntos-oranlar-store', version: 1 }
  )
);

// ═══════════════════════════════════════════════════════════════════
// SELECTOR HOOKS
// ═══════════════════════════════════════════════════════════════════

export const useFaizOranlari = () => useOranlarStore((state) => state.faizOranlari);
export const useVergiOranlari = () => useOranlarStore((state) => state.vergiOranlari);
export const useBinekOtoLimitleri = (yil: number) => useOranlarStore((state) => state.binekOtoLimitleri[yil]);
export const useDovizKurlari = () => useOranlarStore((state) => state.dovizKurlari);
export const useAdatFaiziOrani = () => useOranlarStore((state) => state.faizOranlari.tcmb_ticari_tl);
