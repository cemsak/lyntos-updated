/**
 * TD-002: Açılış Bakiyesi Uyarı Kartı
 */

import { BookOpen, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { OpeningBalanceStatus } from '../_types';
import { formatCurrency } from '../../_lib/format';

interface OpeningBalanceCardProps {
  openingBalance: OpeningBalanceStatus;
}

export function OpeningBalanceCard({ openingBalance }: OpeningBalanceCardProps) {
  const getColorClass = () => {
    if (openingBalance.has_data && openingBalance.status_color === 'green') {
      return 'bg-[#ECFDF5] border-[#AAE8B8]';
    }
    if (openingBalance.has_data && openingBalance.status_color === 'yellow') {
      return 'bg-[#FFFBEB] border-[#FFF08C]';
    }
    return 'bg-[#FEF2F2] border-[#FFC7C9]';
  };

  const getIconBgClass = () => {
    if (openingBalance.has_data && openingBalance.status_color === 'green') {
      return 'bg-[#ECFDF5]';
    }
    if (openingBalance.has_data && openingBalance.status_color === 'yellow') {
      return 'bg-[#FFFBEB]';
    }
    return 'bg-[#FEF2F2]';
  };

  const getIconColorClass = () => {
    if (openingBalance.has_data && openingBalance.status_color === 'green') {
      return 'text-[#00804D]';
    }
    if (openingBalance.has_data && openingBalance.status_color === 'yellow') {
      return 'text-[#FA841E]';
    }
    return 'text-[#BF192B]';
  };

  const getTextColorClass = () => {
    if (openingBalance.has_data && openingBalance.status_color === 'green') {
      return 'text-[#00804D]';
    }
    if (openingBalance.has_data && openingBalance.status_color === 'yellow') {
      return 'text-[#FA841E]';
    }
    return 'text-[#BF192B]';
  };

  const getStatusIcon = () => {
    if (openingBalance.has_data) {
      if (openingBalance.status_color === 'green') {
        return <CheckCircle2 className="w-5 h-5 text-[#00A651]" />;
      }
      if (openingBalance.status_color === 'yellow') {
        return <AlertTriangle className="w-5 h-5 text-[#FFB114]" />;
      }
      return <XCircle className="w-5 h-5 text-[#F0282D]" />;
    }
    return <XCircle className="w-5 h-5 text-[#F0282D]" />;
  };

  return (
    <div className={`rounded-xl p-4 border flex items-center justify-between ${getColorClass()}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getIconBgClass()}`}>
          <BookOpen className={`w-5 h-5 ${getIconColorClass()}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#2E2E2E]">Açılış Bakiyesi</span>
            {getStatusIcon()}
          </div>
          <p className={`text-sm ${getTextColorClass()}`}>
            {openingBalance.has_data
              ? openingBalance.status_text
              : 'Açılış bakiyesi yüklenmedi. Kebir-Mizan farkının nedeni bu olabilir.'}
          </p>
        </div>
      </div>

      {openingBalance.has_data && (
        <div className="text-right">
          <p className="text-sm text-[#5A5A5A]">
            {openingBalance.hesap_sayisi} hesap • {formatCurrency(openingBalance.toplam_borc)}
          </p>
          {openingBalance.source_type && (
            <p className="text-xs text-[#969696]">
              Kaynak: {openingBalance.source_type === 'acilis_fisi' ? 'Açılış Fişi' :
                       openingBalance.source_type === 'acilis_mizani' ? 'Açılış Mizanı' : 'Manuel Giriş'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
