'use client';
import React from 'react';
import {
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  CheckSquare,
} from 'lucide-react';
import { Card } from '../../_components/shared/Card';
import type { MutabakatOzet } from '../_types/cariMutabakat';

interface OzetKartlariProps {
  ozet: MutabakatOzet;
  formatTL: (val: number) => string;
}

/**
 * 5 KPI kart: Toplam Hesap, Uyumlu, Farklı, Toplam Fark, Onaylanan
 */
export function OzetKartlari({ ozet, formatTL }: OzetKartlariProps) {
  const kartlar = [
    {
      label: 'Toplam Hesap',
      value: ozet.toplam_hesap,
      isNumber: true,
      bgClass: 'bg-[#F5F6F8]',
      iconClass: 'text-[#5A5A5A]',
      valueClass: 'text-[#2E2E2E]',
      Icon: ArrowUpDown,
    },
    {
      label: 'Uyumlu',
      value: ozet.uyumlu,
      isNumber: true,
      bgClass: 'bg-[#ECFDF5]',
      iconClass: 'text-[#00804D]',
      valueClass: 'text-[#00804D]',
      Icon: CheckCircle2,
    },
    {
      label: 'Farklı',
      value: ozet.farkli,
      isNumber: true,
      bgClass: 'bg-[#FFFBEB]',
      iconClass: 'text-[#FA841E]',
      valueClass: 'text-[#FA841E]',
      Icon: AlertTriangle,
    },
    {
      label: 'Toplam Fark',
      value: formatTL(ozet.toplam_fark),
      isNumber: false,
      bgClass: 'bg-[#FEF2F2]',
      iconClass: 'text-[#BF192B]',
      valueClass: 'text-[#BF192B]',
      Icon: ShieldAlert,
    },
    {
      label: 'Onaylanan',
      value: ozet.onaylanan,
      isNumber: true,
      bgClass: 'bg-[#E6F9FF]',
      iconClass: 'text-[#0049AA]',
      valueClass: 'text-[#0049AA]',
      Icon: CheckSquare,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {kartlar.map((kart) => (
        <Card key={kart.label}>
          <div className="flex items-center gap-3 p-1">
            <div
              className={`w-10 h-10 ${kart.bgClass} rounded-lg flex items-center justify-center`}
            >
              <kart.Icon className={`w-5 h-5 ${kart.iconClass}`} />
            </div>
            <div>
              <p className="text-sm text-[#969696]">{kart.label}</p>
              <p
                className={`${kart.isNumber ? 'text-xl' : 'text-lg'} font-bold ${kart.valueClass}`}
              >
                {kart.value}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
