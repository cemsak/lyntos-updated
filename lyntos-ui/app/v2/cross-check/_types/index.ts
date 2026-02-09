/**
 * Defter Kontrol Tip Tanımları
 * Tavsiye Mektubu 2 yapısı
 */

export interface DonemUyumsuzluk {
  tur: string;
  muhtemel_eksik_ay: string;
  ay_tutari: number;
  fark: number;
  aciklama: string;
}

export interface CheckResult {
  check_type: string;
  check_name: string;
  severity: 'OK' | 'WARNING' | 'ERROR' | 'CRITICAL';
  passed: boolean;
  message: string;
  details: {
    toplam_borc?: number;
    toplam_alacak?: number;
    fark?: number;
    fis_sayisi?: number;
    satir_sayisi?: number;
    hesap_sayisi?: number;
    toplam_hesap?: number;
    esit_hesap?: number;
    farkli_hesap?: number;
    sadece_yevmiye?: number;
    sadece_kebir?: number;
    sadece_mizan?: number;
    toplam_borc_fark?: number;
    toplam_alacak_fark?: number;
    toplam_fark?: number;
    dengesiz_fisler?: Array<{
      fis_no: string;
      borc: number;
      alacak: number;
      fark: number;
    }>;
    // C3 dönem uyuşmazlığı için
    kebir_toplam_borc?: number;
    kebir_toplam_alacak?: number;
    mizan_toplam_borc?: number;
    mizan_toplam_alacak?: number;
    kebir_aylar?: string[];
    kebir_aylik_borc?: Record<string, number>;
    donem_uyumsuzluk?: DonemUyumsuzluk | null;
  };
}

export interface AccountComparison {
  hesap_kodu: string;
  hesap_adi: string | null;
  source_borc: number;
  source_alacak: number;
  target_borc: number;
  target_alacak: number;
  borc_fark: number;
  alacak_fark: number;
  durum: 'OK' | 'FARK_VAR' | 'SADECE_YEVMIYE' | 'SADECE_KEBIR' | 'SADECE_MIZAN';
}

export interface Summary {
  total_checks: number;
  passed_checks: number;
  warning_checks: number;
  error_checks: number;
  critical_checks: number;
  overall_status: 'PASS' | 'WARNING' | 'FAIL' | 'CRITICAL' | 'NO_DATA';
}

// TD-002: Açılış Bakiyesi Durumu
export interface OpeningBalanceStatus {
  has_data: boolean;
  status: string;
  status_color: string;
  status_text: string;
  fiscal_year?: number;
  hesap_sayisi: number;
  toplam_borc: number;
  toplam_alacak: number;
  is_balanced: boolean;
  source_type?: string;
  upload_date?: string;
}

export interface FullReportResponse {
  client_id: string;
  period_id: string;
  generated_at: string;
  balance_checks: CheckResult[];
  reconciliation_checks: CheckResult[];
  yevmiye_kebir_details: AccountComparison[];
  kebir_mizan_details: AccountComparison[];
  summary: Summary;
}

export type FilterType = 'all' | 'ok' | 'fark' | 'sadece';
export type TabType = 'c2' | 'c3';
