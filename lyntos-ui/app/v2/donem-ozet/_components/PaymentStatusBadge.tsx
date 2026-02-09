import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';

export function PaymentStatusBadge({ status, gecikmeGun }: { status?: string | null; gecikmeGun?: number | null }) {
  if (!status) {
    return <span className="text-[#969696] text-sm">-</span>;
  }

  const statusConfig: Record<string, { icon: React.ReactNode; text: string; className: string }> = {
    odendi: {
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      text: 'Ödendi',
      className: 'bg-[#ECFDF5] text-[#00804D]'
    },
    gecikli_odendi: {
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      text: `Gecikmeli (${gecikmeGun || 0} gün)`,
      className: 'bg-[#FFFBEB] text-[#FA841E]'
    },
    odenmedi: {
      icon: <XCircle className="w-3.5 h-3.5" />,
      text: gecikmeGun ? `Gecikmiş (${gecikmeGun} gün)` : 'Ödenmedi',
      className: 'bg-[#FEF2F2] text-[#BF192B]'
    },
    vadesi_gelmedi: {
      icon: <Clock className="w-3.5 h-3.5" />,
      text: 'Vadesi Gelmedi',
      className: 'bg-[#F5F6F8] text-[#5A5A5A]'
    }
  };

  const config = statusConfig[status] || statusConfig.vadesi_gelmedi;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${config.className}`}>
      {config.icon}
      {config.text}
    </span>
  );
}
