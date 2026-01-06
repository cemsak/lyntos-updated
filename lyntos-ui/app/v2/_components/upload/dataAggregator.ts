/**
 * LYNTOS Data Aggregator
 * Combines parsed data from multiple sources into TaxpayerData for VDK validation
 */

import { ParsedMizan, getAccountBalance, getAccountGroupTotal } from './mizanParser';

// TaxpayerData structure matching backend vdk_kurgan_engine.py
export interface TaxpayerData {
  vkn: string;
  period: string;

  // Mizan-derived data
  kasa_bakiye: number;         // 100
  banka_bilanco: number;       // 102
  alicilar: number;            // 120
  ortaklardan_alacak: number;  // 131
  stoklar: number;             // 15X
  devreden_kdv: number;        // 190
  indirilecek_kdv: number;     // 191
  saticilar: number;           // 320
  ortaklara_borc: number;      // 331
  sermaye: number;             // 500
  gecmis_yil_karlari: number;  // 570
  gecmis_yil_zararlari: number; // 580

  // Income statement
  net_satislar: number;        // 600 - 610 - 620
  satilan_mal_maliyeti: number; // 621
  faaliyet_giderleri: number;  // 630 + 631 + 632

  // Calculated fields
  aktif_toplam: number;
  pasif_toplam: number;
  ozsermaye: number;
  brut_kar: number;
  brut_kar_marji: number;
  cari_oran: number;

  // External data (may be null if not provided)
  banka_fiili?: number;
  ba_toplam?: number;
  bs_toplam?: number;
  gelir_beyan?: number;
  sektor_kar_marji_avg?: number;

  // History flags (default false if unknown)
  vtr_tespiti_var: boolean;
  iliskili_kisi_var: boolean;
  sbk_raporu_var: boolean;
  ardisik_zarar_yili: number;
  gecmis_inceleme_sayisi: number;
  gecmis_ceza_sayisi: number;
}

// Aggregate mizan data into TaxpayerData
export function aggregateMizanData(
  mizan: ParsedMizan,
  vkn: string = 'UNKNOWN',
  period: string = 'UNKNOWN'
): TaxpayerData {
  // Extract key account balances
  const kasa = getAccountBalance(mizan, '100');
  const banka = getAccountBalance(mizan, '102');
  const alicilar = getAccountBalance(mizan, '120');
  const ortaklardan = getAccountBalance(mizan, '131');
  const stoklar = getAccountGroupTotal(mizan, '15');
  const devredenKdv = getAccountBalance(mizan, '190');
  const indirilecekKdv = getAccountBalance(mizan, '191');
  const saticilar = Math.abs(getAccountBalance(mizan, '320'));
  const ortaklara = Math.abs(getAccountBalance(mizan, '331'));
  const sermaye = Math.abs(getAccountBalance(mizan, '500'));
  const gecmisKarlar = Math.abs(getAccountBalance(mizan, '570'));
  const gecmisZararlar = getAccountBalance(mizan, '580');

  // Income statement
  const satislar600 = getAccountBalance(mizan, '600');
  const iadeler610 = Math.abs(getAccountBalance(mizan, '610'));
  const iskontolar620 = Math.abs(getAccountBalance(mizan, '620'));
  const netSatislar = satislar600 - iadeler610 - iskontolar620;

  const satilanMalMaliyeti = Math.abs(getAccountBalance(mizan, '621'));

  const gider630 = Math.abs(getAccountBalance(mizan, '630'));
  const gider631 = Math.abs(getAccountBalance(mizan, '631'));
  const gider632 = Math.abs(getAccountBalance(mizan, '632'));
  const faaliyetGiderleri = gider630 + gider631 + gider632;

  // Calculated totals
  const aktifToplam = getAccountGroupTotal(mizan, '1') + getAccountGroupTotal(mizan, '2');
  const pasifToplam = Math.abs(getAccountGroupTotal(mizan, '3') + getAccountGroupTotal(mizan, '4') + getAccountGroupTotal(mizan, '5'));

  // Ozsermaye = Sermaye + Gecmis Yil Karlari - Gecmis Yil Zararlari
  const ozsermaye = sermaye + gecmisKarlar - gecmisZararlar;

  // Brut kar
  const brutKar = netSatislar - satilanMalMaliyeti;
  const brutKarMarji = netSatislar > 0 ? brutKar / netSatislar : 0;

  // Cari oran = Donen Varliklar / Kisa Vadeli Borclar
  const donenVarliklar = getAccountGroupTotal(mizan, '1');
  const kisaVadeliBorclar = Math.abs(getAccountGroupTotal(mizan, '3'));
  const cariOran = kisaVadeliBorclar > 0 ? donenVarliklar / kisaVadeliBorclar : 0;

  // Check for consecutive losses
  const ardisikZarar = gecmisZararlar > 0 ? 1 : 0;

  return {
    vkn,
    period,

    // Account balances
    kasa_bakiye: kasa,
    banka_bilanco: banka,
    alicilar,
    ortaklardan_alacak: ortaklardan,
    stoklar,
    devreden_kdv: devredenKdv,
    indirilecek_kdv: indirilecekKdv,
    saticilar,
    ortaklara_borc: ortaklara,
    sermaye,
    gecmis_yil_karlari: gecmisKarlar,
    gecmis_yil_zararlari: gecmisZararlar,

    // Income statement
    net_satislar: netSatislar,
    satilan_mal_maliyeti: satilanMalMaliyeti,
    faaliyet_giderleri: faaliyetGiderleri,

    // Calculated
    aktif_toplam: aktifToplam,
    pasif_toplam: pasifToplam,
    ozsermaye,
    brut_kar: brutKar,
    brut_kar_marji: brutKarMarji,
    cari_oran: cariOran,

    // External (unknown at this stage)
    banka_fiili: undefined,
    ba_toplam: undefined,
    bs_toplam: undefined,
    gelir_beyan: netSatislar,
    sektor_kar_marji_avg: undefined,

    // Flags (default to false/0)
    vtr_tespiti_var: false,
    iliskili_kisi_var: false,
    sbk_raporu_var: false,
    ardisik_zarar_yili: ardisikZarar,
    gecmis_inceleme_sayisi: 0,
    gecmis_ceza_sayisi: 0,
  };
}

// Merge external data into TaxpayerData
export function mergeExternalData(
  baseData: TaxpayerData,
  external: Partial<TaxpayerData>
): TaxpayerData {
  return {
    ...baseData,
    ...external,
    // Ensure required fields aren't overwritten with undefined
    vkn: external.vkn || baseData.vkn,
    period: external.period || baseData.period,
  };
}
