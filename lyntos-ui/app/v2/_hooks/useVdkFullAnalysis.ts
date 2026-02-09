/**
 * LYNTOS VDK Full Analysis Hook
 * VDK 13 Kriter + Kategori bazlı tam risk analizi
 *
 * GET /api/v1/contracts/kurgan-risk?client_id={clientId}&period={period}
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '../_lib/auth';

// ============================================================================
// TYPES
// ============================================================================

export interface HesapKontrol {
  hesap_kodu: string;
  hesap_adi: string;
  kontrol_adi: string;
  deger: number;
  esik_uyari: number;
  esik_kritik: number;
  durum: 'NORMAL' | 'UYARI' | 'KRITIK';
  risk_puani: number;
  aciklama: string;
  oneri: string;
  mevzuat_ref: string[];
  // Kanıt verileri - SMMM için kritik
  kanitlar?: Array<Record<string, unknown>>;
}

export interface KategoriAnalizi {
  kategori_id: string;
  kategori_adi: string;
  toplam_risk: number;
  kontroller: HesapKontrol[];
  uyarilar: string[];
  aksiyonlar: string[];
  kritik_sayisi: number;
  uyari_sayisi: number;
  normal_sayisi: number;
}

export interface KurganSenaryo {
  senaryo_id: string;
  senaryo_adi: string;
  risk_puani: number;
  aksiyon: 'TAKIP' | 'BILGI_ISTEME' | 'IZAHA_DAVET' | 'INCELEME';
  sure: string | null;
  tetiklendi: boolean;
  tetikleme_nedeni: string | null;
  oneriler: string[];
  // Kontrol sonucu ve kanıtlar - SMMM için kritik
  kontrol_detayi: string | null;
  kanitlar: Array<Record<string, unknown>>;
  // Senaryo aktiflik durumu (ör: KRG-09 kişisel veri eksikliğinden aktif değil)
  aktif?: boolean;
  aktif_degil_nedeni?: string;
}

export interface TTK376Sonucu {
  sermaye: number;
  yasal_yedekler: number;
  ozkaynaklar: number;
  sermaye_kaybi_orani: number;
  durum: 'NORMAL' | 'YARI_KAYIP' | 'UCTE_IKI_KAYIP' | 'BORCA_BATIK';
  aksiyon: string | null;
  aciklama: string;
}

export interface OrtulSermayeSonucu {
  donem_basi_ozkaynak: number;
  sinir: number;
  iliskili_borc: number;
  ortulu_sermaye_tutari: number;
  durum: 'SINIR_ALTINDA' | 'SINIR_UZERINDE';
  kkeg_tutari: number;
  aksiyon: string | null;
}

export interface FinansmanGiderKisitlamasi {
  ozkaynak: number;
  yabanci_kaynak: number;
  toplam_finansman_gideri: number;
  asan_kisim: number;
  kisitlamaya_tabi_gider: number;
  kkeg_tutari: number;
  uygulanir_mi: boolean;
}

export interface CezaTespiti {
  baslik: string;
  aciklama: string;
  hesap_kodu: string;
  matrah_farki: number;
  vergi: number;
  vzc: number;
  gecikme_faizi: number;
  toplam: number;
  mevzuat_ref: string[];
}

export interface MuhtemelCezalar {
  tespitler: CezaTespiti[];
  toplam_matrah_farki: number;
  toplam_vergi: number;
  toplam_vzc: number;
  toplam_gecikme_faizi: number;
  genel_toplam: number;
  uyari: string;
}

export interface AcilAksiyon {
  aksiyon: string;
  oncelik: 'high' | 'medium' | 'low';
  tahmini_sure: string;
  kategori: string;
  ilgili_hesap: string | null;
  puan_etkisi?: number; // Bu aksiyon yapılırsa risk puanı ne kadar düşer
}

export interface RiskSummary {
  total_score: number;
  trend: string;
  inspection_probability: number;
  inspection_probability_formula?: string;  // Hesaplama formülü açıklaması
  inspection_probability_note?: string;     // Uyarı notu
  inspection_risk_level: string;
  top_risk_factors: string[];
  kurgan_triggered_count?: number;          // Tetiklenen senaryo sayısı
  urgent_action_count?: number;             // Acil aksiyon sayısı
}

export interface UrgentActions {
  count: number;
  estimated_time: string;
  items: AcilAksiyon[];
  toplam_puan_etkisi?: number; // Tüm aksiyonlar yapılırsa toplam puan düşüşü
}

// Sektör bilgisi (Vergi Levhasından + TCMB EVDS + GİB)
export interface SektorBilgisi {
  nace_kodu: string;
  nace_adi: string;
  sektor_adi: string;
  vergi_dairesi?: string;

  // GİB Vergi İstatistikleri 2024
  sektor_vergi_yuku?: number;

  // Likidite Oranları (TCMB EVDS)
  cari_oran?: number;
  asit_test_orani?: number;
  nakit_orani?: number;

  // Finansal Yapı Oranları (TCMB EVDS)
  yabanci_kaynak_aktif?: number;
  ozkaynak_aktif?: number;
  donen_varlik_aktif?: number;
  duran_varlik_aktif?: number;
  banka_kredileri_orani?: number;

  // Karlılık Oranları (TCMB EVDS)
  net_kar_marji?: number;
  brut_kar_marji?: number;
  faaliyet_kar_marji?: number;
  roa?: number;
  faaliyet_gider_orani?: number;
  faiz_gider_orani?: number;

  // Devir Hızları (TCMB EVDS)
  alacak_devir_hizi?: number;
  borc_devir_hizi?: number;
  calisma_sermaye_devir?: number;

  // Eski alanlar (geriye uyumluluk)
  sektor_kar_marji?: number;
  sektor_stok_devir?: number;
  sektor_yabanci_kaynak_orani?: number;

  // Meta
  kaynak?: string;
  veri_yili?: string;
  guncelleme_tarihi?: string;
  veri_kaynak?: string;
}

// TCMB Güncel Ekonomik Göstergeler
export interface TcmbVerileri {
  usd_kuru: number;
  eur_kuru: number;
  gbp_kuru?: number;
  politika_faizi: number;
  enflasyon_yillik: number;
  reeskont_faizi: number;
  gecikme_faizi_aylik?: number;
  tecil_faizi_yillik?: number;
  bulten_tarihi?: string;
  guncelleme_zamani: string;
  kaynak: string;
  son_guncelleme_oranlar?: string;
}

// Mükellef Finansal Oranları - Backend'den hesaplanmış
export interface MukellefFinansalOranlari {
  // Likidite Oranları
  cari_oran?: number | null;
  asit_test_orani?: number | null;
  nakit_orani?: number | null;

  // Finansal Yapı Oranları
  yabanci_kaynak_aktif?: number | null;
  ozkaynak_aktif?: number | null;

  // Kârlılık Oranları
  net_kar_marji?: number | null;
  brut_kar_marji?: number | null;
  roa?: number | null;

  // Faaliyet Oranları
  alacak_devir_hizi?: number | null;
  borc_devir_hizi?: number | null;
  stok_devir_hizi?: number | null;

  // Vergi Oranları
  vergi_yuku?: number | null;

  // Ham veriler (debug için)
  _ham_veriler?: Record<string, number>;
  _kaynak?: {
    hesaplama_tarihi: string;
    veri_kaynagi: string;
    formul_referansi: string;
  };
}

export interface VdkFullAnalysisData {
  // no_data durumu: Mizan verisi yüklenmemiş
  status?: 'no_data' | 'ok';
  message?: string;

  kurgan_risk: {
    score: number;
    risk_level: string;
    warnings: string[];
    action_items: string[];
    criteria_scores: Record<string, number>;
    // Veri kaynağı şeffaflığı
    data_source?: 'database' | 'json' | 'none';
    mizan_entry_count?: number;
  } | null;
  // Sektör bilgisi (Vergi Levhasından)
  sektor_bilgisi?: SektorBilgisi | null;
  // TCMB Güncel Verileri
  tcmb_verileri?: TcmbVerileri | null;
  // Mükellef Finansal Oranları - BACKEND'DE HESAPLANIYOR!
  mukellef_finansal_oranlari?: MukellefFinansalOranlari | null;
  risk_summary: RiskSummary | null;
  urgent_actions: UrgentActions | null;
  category_analysis: Record<string, KategoriAnalizi> | null;
  kurgan_scenarios: KurganSenaryo[] | null;
  ttk_376: TTK376Sonucu | null;
  ortulu_sermaye: OrtulSermayeSonucu | null;
  finansman_gider_kisitlamasi: FinansmanGiderKisitlamasi | null;
  muhtemel_cezalar: MuhtemelCezalar | null;
  what_to_do: string;
  time_estimate: string;
  vdk_reference: string;
  effective_date: string;
}

export interface VdkFullAnalysisState {
  data: VdkFullAnalysisData | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
}

// ============================================================================
// HOOK
// ============================================================================

export function useVdkFullAnalysis(
  clientId: string | null,
  period: string | null
): VdkFullAnalysisState & { refetch: () => Promise<void> } {
  const [data, setData] = useState<VdkFullAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!clientId || !period) {
      setData(null);
      setIsLoading(false);
      setIsError(false);
      setError(null);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setError('Oturum bilgisi bulunamadi');
      setIsError(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);

    const url = `/api/v1/contracts/kurgan-risk?client_id=${encodeURIComponent(clientId)}&period=${encodeURIComponent(period)}`;

    try {
      const response = await fetch(url, {
        headers: { Authorization: token },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setData(null);
          setIsLoading(false);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const responseData = result.data || result;

      // no_data durumu: Mizan verisi yüklenmemiş
      if (responseData.status === 'no_data') {
        setData({
          status: 'no_data',
          message: responseData.message || 'Bu dönem için veri bulunamadı.',
          kurgan_risk: null,
          sektor_bilgisi: null,
          tcmb_verileri: null,
          mukellef_finansal_oranlari: null,
          risk_summary: null,
          urgent_actions: null,
          category_analysis: null,
          kurgan_scenarios: null,
          ttk_376: null,
          ortulu_sermaye: null,
          finansman_gider_kisitlamasi: null,
          muhtemel_cezalar: null,
          what_to_do: responseData.what_to_do || '',
          time_estimate: '',
          vdk_reference: '',
          effective_date: '',
        });
        setIsLoading(false);
        return;
      }

      setData({
        status: 'ok',
        kurgan_risk: responseData.kurgan_risk,
        // Sektör Bilgisi (Vergi Levhasından) + TCMB Güncel Verileri
        sektor_bilgisi: responseData.sektor_bilgisi || null,
        tcmb_verileri: responseData.tcmb_verileri || null,
        // Mükellef Finansal Oranları - Backend'den hesaplanmış
        mukellef_finansal_oranlari: responseData.mukellef_finansal_oranlari || null,
        risk_summary: responseData.risk_summary || null,
        urgent_actions: responseData.urgent_actions || null,
        category_analysis: responseData.category_analysis || null,
        kurgan_scenarios: responseData.kurgan_scenarios || null,
        ttk_376: responseData.ttk_376 || null,
        ortulu_sermaye: responseData.ortulu_sermaye || null,
        finansman_gider_kisitlamasi: responseData.finansman_gider_kisitlamasi || null,
        muhtemel_cezalar: responseData.muhtemel_cezalar || null,
        what_to_do: responseData.what_to_do || '',
        time_estimate: responseData.time_estimate || '',
        vdk_reference: responseData.vdk_reference || '',
        effective_date: responseData.effective_date || '',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      console.error('[VdkFullAnalysis] Error:', errorMessage);
      setError(errorMessage);
      setIsError(true);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    isError,
    error,
    refetch: fetchData,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getRiskLevelColor(riskLevel: string): string {
  const level = riskLevel.toUpperCase();
  if (level.includes('KRITIK') || level.includes('YUKSEK')) return 'text-red-600';
  if (level.includes('ORTA')) return 'text-amber-600';
  return 'text-green-600';
}

export function getRiskLevelBgColor(riskLevel: string): string {
  const level = riskLevel.toUpperCase();
  if (level.includes('KRITIK') || level.includes('YUKSEK')) return 'bg-red-50';
  if (level.includes('ORTA')) return 'bg-amber-50';
  return 'bg-green-50';
}

export function getScoreColor(score: number): string {
  // KURGAN: Yüksek skor = İYİ (düşük risk)
  // 100'den başlar, her risk için CEZA kesilir
  // 88 = az ceza = düşük risk = YEŞİL
  if (score >= 70) return 'text-green-600';   // ✅ Düşük risk = YEŞİL
  if (score >= 40) return 'text-amber-600';   // ⚠️ Orta risk = SARI
  return 'text-red-600';                       // 🔴 Yüksek risk = KIRMIZI
}

export function getScoreBorderColor(score: number): string {
  // KURGAN: Yüksek skor = İYİ (düşük risk)
  if (score >= 70) return 'border-green-400';  // ✅ Düşük risk
  if (score >= 40) return 'border-amber-400';  // ⚠️ Orta risk
  return 'border-red-400';                      // 🔴 Yüksek risk
}

export function getDurumColor(durum: string): string {
  if (durum === 'KRITIK') return 'text-red-600 bg-red-50';
  if (durum === 'UYARI') return 'text-amber-600 bg-amber-50';
  return 'text-green-600 bg-green-50';
}

export function getAksiyonColor(aksiyon: string): string {
  if (aksiyon === 'INCELEME') return 'text-red-700 bg-red-100';
  if (aksiyon === 'IZAHA_DAVET') return 'text-orange-700 bg-orange-100';
  if (aksiyon === 'BILGI_ISTEME') return 'text-amber-700 bg-amber-100';
  return 'text-blue-700 bg-blue-100';
}

export function getOncelikColor(oncelik: string): string {
  if (oncelik === 'high') return 'text-red-600';
  if (oncelik === 'medium') return 'text-amber-600';
  return 'text-green-600';
}

// Kategori isimleri Turkce
export const KATEGORI_LABELS: Record<string, string> = {
  likidite: 'Likidite (Kasa/Banka)',
  ortaklar: 'Ortaklar',
  kdv: 'KDV',
  ticari: 'Ticari Alacak/Borc',
  vergi_sgk: 'Vergi/SGK',
  sermaye: 'Sermaye/Ozkaynak',
  gelir_gider: 'Gelir/Gider',
  stok: 'Stok',
  duran_varlik: 'Duran Varlik',
};

// KURGAN aksiyon aciklamalari
export const AKSIYON_LABELS: Record<string, string> = {
  TAKIP: 'Takip',
  BILGI_ISTEME: 'Bilgi Isteme',
  IZAHA_DAVET: 'Izaha Davet',
  INCELEME: 'Inceleme',
};
