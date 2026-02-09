/**
 * Defter Kontrol Durum Badge Bileşenleri
 */

import { CheckCircle2, XCircle, AlertTriangle, AlertCircle } from 'lucide-react';

/**
 * Hesap durum badge'i (OK, FARK_VAR, SADECE_* durumları)
 */
export function getDurumBadge(durum: string) {
  switch (durum) {
    case 'OK':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#00804D] bg-[#ECFDF5] rounded-full">
          <CheckCircle2 className="w-3 h-3" />
          OK
        </span>
      );
    case 'FARK_VAR':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#BF192B] bg-[#FEF2F2] rounded-full">
          <XCircle className="w-3 h-3" />
          FARK
        </span>
      );
    case 'SADECE_YEVMIYE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#0049AA] bg-[#E6F9FF] rounded-full">
          <AlertTriangle className="w-3 h-3" />
          Sadece Yevmiye
        </span>
      );
    case 'SADECE_KEBIR':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#FA841E] bg-[#FFFBEB] rounded-full">
          <AlertTriangle className="w-3 h-3" />
          Sadece Kebir
        </span>
      );
    case 'SADECE_MIZAN':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#0049AA] bg-[#E6F9FF] rounded-full">
          <AlertTriangle className="w-3 h-3" />
          Sadece Mizan
        </span>
      );
    default:
      return null;
  }
}

/**
 * Kontrol sonucu severity badge'i
 */
export function getSeverityBadge(severity: string, passed: boolean) {
  if (passed && severity === 'OK') {
    return <CheckCircle2 className="w-6 h-6 text-[#00A651]" />;
  }
  if (severity === 'WARNING') {
    return <AlertTriangle className="w-6 h-6 text-[#FFB114]" />;
  }
  if (severity === 'ERROR' || severity === 'CRITICAL') {
    return <XCircle className="w-6 h-6 text-[#F0282D]" />;
  }
  return <CheckCircle2 className="w-6 h-6 text-[#00A651]" />;
}

/**
 * Genel durum badge'i (PASS, WARNING, FAIL, CRITICAL)
 */
export function getOverallStatusBadge(status: string) {
  switch (status) {
    case 'PASS':
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium text-[#00804D] bg-[#ECFDF5] rounded-full">
          <CheckCircle2 className="w-4 h-4" />
          BAŞARILI
        </span>
      );
    case 'WARNING':
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium text-[#FA841E] bg-[#FFFBEB] rounded-full">
          <AlertTriangle className="w-4 h-4" />
          UYARI
        </span>
      );
    case 'FAIL':
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium text-[#BF192B] bg-[#FEF2F2] rounded-full">
          <XCircle className="w-4 h-4" />
          HATA
        </span>
      );
    case 'CRITICAL':
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium text-[#BF192B] bg-[#FEF2F2] rounded-full">
          <AlertCircle className="w-4 h-4" />
          KRİTİK
        </span>
      );
    default:
      return null;
  }
}
