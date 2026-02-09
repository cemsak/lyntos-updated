'use client';
import React from 'react';
import { Upload, Check, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '../shared/Badge';
import type { BelgeDurumData, BelgeTipi } from './types';
import { BELGE_TANIMLARI } from './types';

interface BelgeKartiProps {
  belge: BelgeDurumData;
  onUploadClick?: (tip: BelgeTipi) => void;
  compact?: boolean;
}

export function BelgeKarti({ belge, onUploadClick, compact = false }: BelgeKartiProps) {
  const tanim = BELGE_TANIMLARI[belge.tip];
  if (!tanim) return null;

  const handleClick = () => {
    if (belge.durum === 'EKSIK' && onUploadClick) {
      onUploadClick(belge.tip);
    }
  };

  // Status icon and colors
  const getStatusConfig = () => {
    switch (belge.durum) {
      case 'VAR':
        return {
          icon: <Check className="w-3.5 h-3.5" />,
          bgClass: 'bg-[#ECFDF5]/50',
          borderClass: 'border-[#AAE8B8]',
          iconClass: 'text-[#00804D]',
        };
      case 'BEKLIYOR':
        return {
          icon: <Clock className="w-3.5 h-3.5" />,
          bgClass: 'bg-[#FFFBEB]/50',
          borderClass: 'border-[#FFF08C]',
          iconClass: 'text-[#FA841E]',
        };
      case 'EKSIK':
      default:
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
          bgClass: 'bg-[#FEF2F2]/50',
          borderClass: 'border-[#FFC7C9]',
          iconClass: 'text-[#BF192B]',
        };
    }
  };

  const status = getStatusConfig();

  // Compact mode (nested under category)
  if (compact) {
    return (
      <div
        className={`
          flex items-center gap-2 px-2 py-1.5 rounded-md text-sm
          ${status.bgClass} border ${status.borderClass}
          ${belge.durum === 'EKSIK' ? 'cursor-pointer hover:opacity-80' : ''}
        `}
        onClick={handleClick}
      >
        <span className={status.iconClass}>{status.icon}</span>
        <span className="flex-1 text-[#2E2E2E] truncate text-xs">
          {tanim.kisaAd}
        </span>
        {belge.dosyaAdi && (
          <span className="text-xs text-[#969696] truncate max-w-[100px]">
            {belge.dosyaAdi}
          </span>
        )}
      </div>
    );
  }

  // Full mode
  return (
    <div
      className={`
        flex items-center gap-3 p-3 rounded-lg border transition-colors
        ${status.bgClass} ${status.borderClass}
        ${belge.durum === 'EKSIK' ? 'cursor-pointer hover:opacity-80' : ''}
      `}
      onClick={handleClick}
    >
      {/* Icon */}
      <div className={`p-1.5 rounded ${belge.durum === 'VAR' ? 'bg-[#ECFDF5]' : 'bg-[#FEF2F2]'}`}>
        <span className={status.iconClass}>{status.icon}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[#2E2E2E] text-sm">
            {tanim.ad}
          </span>
          {tanim.zorunlu && <span className="text-[#BF192B] text-xs">*</span>}
        </div>
        {belge.yuklemeTarihi && (
          <p className="text-xs text-[#969696] truncate">
            {belge.yuklemeTarihi} - {belge.dosyaAdi}
          </p>
        )}
        {belge.durum === 'EKSIK' && (
          <p className="text-xs text-[#BF192B]">Tıkla ve yükle</p>
        )}
      </div>

      {/* Status Badge */}
      <Badge variant={belge.durum === 'VAR' ? 'success' : belge.durum === 'BEKLIYOR' ? 'warning' : 'error'}>
        {belge.durum === 'VAR' ? 'Yüklendi' : belge.durum === 'BEKLIYOR' ? 'Bekliyor' : 'Eksik'}
      </Badge>
    </div>
  );
}
