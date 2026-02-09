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
import { formatNumber } from '../../_lib/format';

export function MinCapitalBanner() {
  const { data, loading, error } = useMinCapitalRequirements();

  if (loading || error || !data) return null;

  // Calculate days remaining
  const deadline = new Date(data.deadline_for_existing);
  const today = new Date();
  const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const isUrgent = daysRemaining < 180; // Less than 6 months
  const isCritical = daysRemaining < 90; // Less than 3 months

  // Determine styling based on urgency
  const styles = isCritical
    ? {
        bg: 'bg-[#F0282D]/10',
        border: 'border-[#F0282D]',
        text: 'text-[#F0282D]',
        icon: <AlertCircle className="w-6 h-6 text-[#F0282D]" />,
      }
    : isUrgent
      ? {
          bg: 'bg-[#FFB114]/10',
          border: 'border-[#FFB114]',
          text: 'text-[#FFB114]',
          icon: <AlertTriangle className="w-6 h-6 text-[#FFB114]" />,
        }
      : {
          bg: 'bg-[#0049AA]/10',
          border: 'border-[#0049AA]',
          text: 'text-[#0049AA]',
          icon: <Info className="w-6 h-6 text-[#0049AA]" />,
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

          <p className="text-[13px] text-[#5A5A5A] mt-1">
            7511 sayili Kanun geregi, mevcut sirketlerin asgari sermayelerini{' '}
            <strong className="text-[#2E2E2E]">{data.deadline_for_existing}</strong>{' '}
            tarihine kadar tamamlamasi gerekmektedir.
          </p>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white/70 rounded-lg p-2">
              <div className="text-[11px] text-[#5A5A5A]">A.S. Asgari Sermaye</div>
              <div className="text-[14px] font-bold text-[#2E2E2E]">
                {formatNumber(data.requirements.as.min_capital)} TL
              </div>
            </div>
            <div className="bg-white/70 rounded-lg p-2">
              <div className="text-[11px] text-[#5A5A5A]">Ltd. Asgari Sermaye</div>
              <div className="text-[14px] font-bold text-[#2E2E2E]">
                {formatNumber(data.requirements.ltd.min_capital)} TL
              </div>
            </div>
            <div
              className={`rounded-lg p-2 ${
                isCritical
                  ? 'bg-[#F0282D]/20'
                  : isUrgent
                    ? 'bg-[#FFB114]/20'
                    : 'bg-white/70'
              }`}
            >
              <div className="text-[11px] text-[#5A5A5A] flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Kalan Sure
              </div>
              <div
                className={`text-[14px] font-bold ${
                  isCritical
                    ? 'text-[#F0282D]'
                    : isUrgent
                      ? 'text-[#FFB114]'
                      : 'text-[#2E2E2E]'
                }`}
              >
                {daysRemaining} gun
              </div>
            </div>
          </div>

          <p className="text-[11px] mt-2 text-[#5A5A5A] flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-[#FFB114]" />
            Suresinde tamamlanmazsa sirket infisah etmis (kendiliginiden sona ermis) sayilir.
          </p>
        </div>
      </div>
    </div>
  );
}
