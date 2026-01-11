'use client';

/**
 * Asgari Sermaye Uyari Banner
 * Sprint S2 - LYNTOS V2
 *
 * Warning banner for minimum capital compliance deadline
 */

import React from 'react';
import { AlertTriangle, AlertCircle, Info, Calendar } from 'lucide-react';
import { useMinCapitalRequirements } from './useCorporate';

export function MinCapitalBanner() {
  const { data, loading, error } = useMinCapitalRequirements();

  if (loading || error || !data) return null;

  // Calculate days remaining
  const deadline = new Date(data.deadline_for_existing);
  const today = new Date();
  const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const isUrgent = daysRemaining < 180; // Less than 6 months
  const isCritical = daysRemaining < 90; // Less than 3 months

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR').format(value);
  };

  // Determine styling based on urgency
  const styles = isCritical
    ? {
        bg: 'bg-[#cd3d64]/10',
        border: 'border-[#cd3d64]',
        text: 'text-[#cd3d64]',
        icon: <AlertCircle className="w-6 h-6 text-[#cd3d64]" />,
      }
    : isUrgent
      ? {
          bg: 'bg-[#f5a623]/10',
          border: 'border-[#f5a623]',
          text: 'text-[#f5a623]',
          icon: <AlertTriangle className="w-6 h-6 text-[#f5a623]" />,
        }
      : {
          bg: 'bg-[#635bff]/10',
          border: 'border-[#635bff]',
          text: 'text-[#635bff]',
          icon: <Info className="w-6 h-6 text-[#635bff]" />,
        };

  return (
    <div
      className={`rounded-xl p-4 mb-6 ${styles.bg} border-2 ${styles.border} transition-colors`}
    >
      <div className="flex items-start gap-3">
        {styles.icon}

        <div className="flex-1">
          <h3 className={`text-[15px] font-semibold ${styles.text}`}>
            Asgari Sermaye Tamamlama Zorunlulugu
          </h3>

          <p className="text-[13px] text-[#697386] mt-1">
            7511 sayili Kanun geregi, mevcut sirketlerin asgari sermayelerini{' '}
            <strong className="text-[#1a1f36]">{data.deadline_for_existing}</strong>{' '}
            tarihine kadar tamamlamasi gerekmektedir.
          </p>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white/70 rounded-lg p-2">
              <div className="text-[11px] text-[#697386]">A.S. Asgari Sermaye</div>
              <div className="text-[14px] font-bold text-[#1a1f36]">
                {formatCurrency(data.requirements.as.min_capital)} TL
              </div>
            </div>
            <div className="bg-white/70 rounded-lg p-2">
              <div className="text-[11px] text-[#697386]">Ltd. Asgari Sermaye</div>
              <div className="text-[14px] font-bold text-[#1a1f36]">
                {formatCurrency(data.requirements.ltd.min_capital)} TL
              </div>
            </div>
            <div
              className={`rounded-lg p-2 ${
                isCritical
                  ? 'bg-[#cd3d64]/20'
                  : isUrgent
                    ? 'bg-[#f5a623]/20'
                    : 'bg-white/70'
              }`}
            >
              <div className="text-[11px] text-[#697386] flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Kalan Sure
              </div>
              <div
                className={`text-[14px] font-bold ${
                  isCritical
                    ? 'text-[#cd3d64]'
                    : isUrgent
                      ? 'text-[#f5a623]'
                      : 'text-[#1a1f36]'
                }`}
              >
                {daysRemaining} gun
              </div>
            </div>
          </div>

          <p className="text-[11px] mt-2 text-[#697386] flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-[#f5a623]" />
            Suresinde tamamlanmazsa sirket infisah etmis (kendiliginiden sona ermis) sayilir.
          </p>
        </div>
      </div>
    </div>
  );
}
