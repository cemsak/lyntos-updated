'use client';

/**
 * AlertBanner - Dönem sonu uyarı/bilgi banner'ı
 */

import { AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import { type AlertBannerProps } from '../_types';

export function AlertBanner({
  variant,
  title,
  description,
  action,
  icon,
}: AlertBannerProps) {
  const config = {
    info: {
      bg: 'bg-gradient-to-r from-[#E6F9FF] to-[#E6F9FF]',
      border: 'border-[#ABEBFF]',
      icon: 'text-[#0078D0]',
      title: 'text-[#00287F]',
      desc: 'text-[#0049AA]',
      button: 'bg-[#0049AA] text-white hover:bg-[#0049AA]',
    },
    warning: {
      bg: 'bg-gradient-to-r from-[#FFFBEB] to-[#FFFBEB]',
      border: 'border-[#FFF08C]',
      icon: 'text-[#FFB114]',
      title: 'text-[#E67324]',
      desc: 'text-[#FA841E]',
      button: 'bg-[#FA841E] text-white hover:bg-[#FA841E]',
    },
    success: {
      bg: 'bg-gradient-to-r from-[#ECFDF5] to-[#ECFDF5]',
      border: 'border-[#AAE8B8]',
      icon: 'text-[#00A651]',
      title: 'text-[#005A46]',
      desc: 'text-[#00804D]',
      button: 'bg-[#00804D] text-white hover:bg-[#00804D]',
    },
    error: {
      bg: 'bg-gradient-to-r from-[#FEF2F2] to-[#FEF2F2]',
      border: 'border-[#FFC7C9]',
      icon: 'text-[#F0282D]',
      title: 'text-[#980F30]',
      desc: 'text-[#BF192B]',
      button: 'bg-[#BF192B] text-white hover:bg-[#BF192B]',
    },
  };

  const cfg = config[variant];

  const defaultIcons = {
    info: <AlertCircle className="w-5 h-5" />,
    warning: <Upload className="w-5 h-5" />,
    success: <CheckCircle2 className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
  };

  return (
    <div className={`${cfg.bg} border ${cfg.border} rounded-xl p-4 animate-slide-up`}>
      <div className="flex items-start gap-3">
        <div className={`${cfg.icon} flex-shrink-0 mt-0.5`}>
          {icon || defaultIcons[variant]}
        </div>
        <div className="flex-1">
          <h4 className={`font-semibold ${cfg.title}`}>{title}</h4>
          <p className={`text-sm mt-1 ${cfg.desc}`}>{description}</p>
          {action && (
            <button
              onClick={action.onClick}
              className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${cfg.button}`}
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
