/**
 * E-Defter Rapor - Shared types, constants, and helpers
 */

export interface EDefterRapor {
  vkn: string;
  unvan: string;
  donem: string;
  defter_tipi: string;
  fis_sayisi: number;
  satir_sayisi: number;
  toplam_borc: number;
  toplam_alacak: number;
}

export interface RaporSummary {
  toplam_borc: number;
  toplam_alacak: number;
  toplam_fis: number;
  fark: number;
}

export interface ClientInfo {
  vkn: string;
  unvan: string;
}

export interface DefterTipiInfo {
  label: string;
  aciklama: string;
  renk: string;
  isBerat: boolean;
}

export const DEFTER_TIPLERI: Record<string, DefterTipiInfo> = {
  Y: {
    label: 'Yevmiye Defteri',
    aciklama: 'Günlük işlemlerin kronolojik kaydı - Borç/alacak dengeli olmalı',
    renk: 'blue',
    isBerat: false,
  },
  YB: {
    label: 'Yevmiye Beratı',
    aciklama: "GİB'e gönderilen özet belge - Sadece dönem sonu bakiyeleri içerir",
    renk: 'indigo',
    isBerat: true,
  },
  K: {
    label: 'Kebir (Büyük Defter)',
    aciklama: 'Hesap bazlı işlem özeti - Borç/alacak dengeli olmalı',
    renk: 'purple',
    isBerat: false,
  },
  KB: {
    label: 'Kebir Beratı',
    aciklama: "GİB'e gönderilen özet belge - Sadece dönem sonu bakiyeleri içerir",
    renk: 'violet',
    isBerat: true,
  },
  DR: {
    label: 'Defter Raporu',
    aciklama: 'Dönem sonu özet raporu - Borç/alacak dengeli olmalı',
    renk: 'emerald',
    isBerat: false,
  },
};

export function getDefterTipi(tip: string): DefterTipiInfo {
  return DEFTER_TIPLERI[tip] || {
    label: tip || 'E-Defter',
    aciklama: '',
    renk: 'slate',
    isBerat: false,
  };
}

export function formatNumber(val: number): string {
  return new Intl.NumberFormat('tr-TR').format(val || 0);
}
