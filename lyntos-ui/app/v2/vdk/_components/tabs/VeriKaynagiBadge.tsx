'use client';

import React from 'react';
import { Globe, Lock, Database } from 'lucide-react';

export type VeriKaynagiTipi = 'GIB_VUK_MD5' | 'GIB_EBELGE' | 'GIB_SEKTOR' | 'MIZAN' | 'MERSIS' | 'MANUEL' | 'SIMULASYON' | 'HARDCODED';

export const VERI_KAYNAGI_BADGE: Record<VeriKaynagiTipi, {
  label: string;
  color: string;
  icon: 'globe' | 'database' | 'lock';
  guvenilirlik: number;
}> = {
  'GIB_VUK_MD5': {
    label: 'GİB VUK Md.5 Listesi',
    color: 'bg-[#ECFDF5] text-[#005A46] border-[#AAE8B8]',
    icon: 'globe',
    guvenilirlik: 100
  },
  'GIB_EBELGE': {
    label: 'GİB e-Belge Portalı',
    color: 'bg-[#ECFDF5] text-[#005A46] border-[#AAE8B8]',
    icon: 'globe',
    guvenilirlik: 100
  },
  'GIB_SEKTOR': {
    label: 'GİB Sektör İstatistikleri',
    color: 'bg-[#E6F9FF] text-[#00287F] border-[#ABEBFF]',
    icon: 'globe',
    guvenilirlik: 90
  },
  'MIZAN': {
    label: 'Mizan Verisi',
    color: 'bg-[#E6F9FF] text-[#0049AA] border-[#ABEBFF]',
    icon: 'database',
    guvenilirlik: 100
  },
  'MERSIS': {
    label: 'MERSIS/Ticaret Sicil',
    color: 'bg-[#E6F9FF] text-[#00287F] border-[#ABEBFF]',
    icon: 'lock',
    guvenilirlik: 80
  },
  'MANUEL': {
    label: 'Manuel Doğrulama',
    color: 'bg-[#FFFBEB] text-[#E67324] border-[#FFF08C]',
    icon: 'lock',
    guvenilirlik: 70
  },
  'SIMULASYON': {
    label: '⚠️ Simülasyon',
    color: 'bg-[#FEF2F2] text-[#980F30] border-[#FFC7C9]',
    icon: 'database',
    guvenilirlik: 30
  },
  'HARDCODED': {
    label: '⚠️ Sabit Değer',
    color: 'bg-[#FEF2F2] text-[#980F30] border-[#FFC7C9]',
    icon: 'database',
    guvenilirlik: 50
  }
};

// Veri Kaynağı Badge Komponenti
export function VeriKaynagiBadge({ kaynak }: { kaynak: string }) {
  // Kaynak string'inden tip çıkar
  const kaynakLower = kaynak.toLowerCase();

  let tip: VeriKaynagiTipi = 'MIZAN'; // Varsayılan olarak Mizan (gerçek veri)

  if (kaynakLower.includes('gib') && kaynakLower.includes('vuk')) {
    tip = 'GIB_VUK_MD5';
  } else if (kaynakLower.includes('gib') && (kaynakLower.includes('ebelge') || kaynakLower.includes('e-fatura'))) {
    tip = 'GIB_EBELGE';
  } else if (kaynakLower.includes('gib') && (kaynakLower.includes('sektör') || kaynakLower.includes('sektor') || kaynakLower.includes('beyanname') || kaynakLower.includes('ortalama'))) {
    tip = 'GIB_SEKTOR';
  } else if (kaynakLower.includes('mizan') || kaynakLower.includes('hs.') || kaynakLower.includes('hesap')) {
    tip = 'MIZAN';
  } else if (kaynakLower.includes('gelir tablosu') || kaynakLower.includes('bilanço') || kaynakLower.includes('bilanco')) {
    tip = 'MIZAN';
  } else if (kaynakLower.includes('hesaplanan') || kaynakLower.includes('risk değerlendirme') || kaynakLower.includes('hesaplama')) {
    // Hesaplanan değerler mizan verisinden türetildi
    tip = 'MIZAN';
  } else if (kaynakLower.includes('cari') || kaynakLower.includes('şirket') || kaynakLower.includes('sirket') || kaynakLower.includes('kâr') || kaynakLower.includes('kar')) {
    // Şirket verileri mizan'dan geliyor
    tip = 'MIZAN';
  } else if (kaynakLower.includes('kdv') || kaynakLower.includes('beyan') || kaynakLower.includes('fatura') || kaynakLower.includes('iade')) {
    // Beyanname ve fatura verileri
    tip = 'GIB_EBELGE';
  } else if (kaynakLower.includes('mersis') || kaynakLower.includes('sicil')) {
    tip = 'MERSIS';
  } else if (kaynakLower.includes('simulasyon') || kaynakLower.includes('simülasyon')) {
    tip = 'SIMULASYON';
  } else if (kaynakLower.includes('hardcoded') || kaynakLower.includes('sabit') || kaynakLower.includes('varsayılan')) {
    tip = 'HARDCODED';
  } else if (kaynakLower.includes('sistem') || kaynakLower.includes('eksik')) {
    // Veri eksikliği durumu
    tip = 'MANUEL';
  }

  const config = VERI_KAYNAGI_BADGE[tip];

  const IconComponent = config.icon === 'globe' ? Globe : config.icon === 'lock' ? Lock : Database;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${config.color}`}>
      <IconComponent className="w-3 h-3" />
      {config.label}
      <span className="opacity-60">(%{config.guvenilirlik})</span>
    </span>
  );
}
