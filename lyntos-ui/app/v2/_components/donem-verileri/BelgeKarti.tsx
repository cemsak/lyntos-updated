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
          bgClass: 'bg-lyntos-success-bg/50',
          borderClass: 'border-lyntos-success-muted',
          iconClass: 'text-lyntos-success',
        };
      case 'BEKLIYOR':
        return {
          icon: <Clock className="w-3.5 h-3.5" />,
          bgClass: 'bg-lyntos-warning-bg/50',
          borderClass: 'border-lyntos-warning-muted',
          iconClass: 'text-lyntos-warning',
        };
      case 'EKSIK':
      default:
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
          bgClass: 'bg-lyntos-risk-bg/50',
          borderClass: 'border-lyntos-risk-muted',
          iconClass: 'text-lyntos-risk',
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
        <span className="flex-1 text-lyntos-text-primary truncate text-xs">
          {tanim.kisaAd}
        </span>
        {belge.dosyaAdi && (
          <span className="text-xs text-lyntos-text-muted truncate max-w-[100px]">
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
      <div className={`p-1.5 rounded ${belge.durum === 'VAR' ? 'bg-lyntos-success-bg' : 'bg-lyntos-risk-bg'}`}>
        <span className={status.iconClass}>{status.icon}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-lyntos-text-primary text-sm">
            {tanim.ad}
          </span>
          {tanim.zorunlu && <span className="text-lyntos-risk text-xs">*</span>}
        </div>
        {belge.yuklemeTarihi && (
          <p className="text-xs text-lyntos-text-muted truncate">
            {belge.yuklemeTarihi} - {belge.dosyaAdi}
          </p>
        )}
        {belge.durum === 'EKSIK' && (
          <p className="text-xs text-lyntos-risk">Tıkla ve yükle</p>
        )}
      </div>

      {/* Status Badge */}
      <Badge variant={belge.durum === 'VAR' ? 'success' : belge.durum === 'BEKLIYOR' ? 'warning' : 'error'}>
        {belge.durum === 'VAR' ? 'Yüklendi' : belge.durum === 'BEKLIYOR' ? 'Bekliyor' : 'Eksik'}
      </Badge>
    </div>
  );
}
