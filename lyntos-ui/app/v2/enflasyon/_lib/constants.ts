/**
 * Enflasyon modülü sabitleri
 * Yİ-ÜFE endeks verileri ve hesap sınıflandırmaları
 */

// LocalStorage key prefix
export const ENFLASYON_KEY_BASE = 'lyntos_enflasyon_progress';

// =============================================================================
// Yİ-ÜFE ENDEKS VERİLERİ
// =============================================================================

export const YIUFE_DATA: Record<string, number> = {
  '2025-12': 3256.78,
  '2025-11': 3198.45,
  '2025-10': 3142.33,
  '2024-12': 2832.15,
  '2024-01': 2156.78,
  '2023-12': 2095.33,
  '2023-01': 1548.92,
  '2022-12': 1380.75,
  '2022-01': 850.12,
  '2021-12': 686.95,
  '2020-12': 568.27,
  '2019-12': 461.68,
  '2018-12': 422.94,
};

// =============================================================================
// HESAP SINIFLANDIRMA
// =============================================================================

export const HESAP_SINIFLANDIRMA = {
  parasal: {
    varlik: [
      '100 Kasa',
      '101 Alınan Çekler',
      '102 Bankalar',
      '103 Verilen Çek ve Ödeme Emirleri',
      '108 Diğer Hazır Değerler',
      '120 Alıcılar',
      '121 Alacak Senetleri',
      '126 Verilen Depozito ve Teminatlar',
    ],
    kaynak: [
      '300 Banka Kredileri',
      '303 Uzun Vadeli Borçların Anapara Taksit ve Faizleri',
      '320 Satıcılar',
      '321 Borç Senetleri',
      '360 Ödenecek Vergi ve Fonlar',
      '361 Ödenecek SGK Kesintileri',
    ],
  },
  parasalOlmayan: {
    varlik: [
      '150 İlk Madde ve Malzeme',
      '151 Yarı Mamuller',
      '152 Mamuller',
      '153 Ticari Mallar',
      '157 Diğer Stoklar',
      '250 Arazi ve Arsalar',
      '251 Yeraltı ve Yerüstü Düzenleri',
      '252 Binalar',
      '253 Tesis, Makine ve Cihazlar',
      '254 Taşıtlar',
      '255 Demirbaşlar',
    ],
    kaynak: [
      '500 Sermaye',
      '520 Hisse Senetleri İhraç Primleri',
      '540 Yasal Yedekler',
      '542 Olağanüstü Yedekler',
      '549 Özel Fonlar',
      '570 Geçmiş Yıllar Karları',
      '580 Geçmiş Yıllar Zararları',
    ],
  },
};
