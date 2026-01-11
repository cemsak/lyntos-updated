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
          bgClass: 'bg-emerald-50/50',
          borderClass: 'border-emerald-200',
          iconClass: 'text-emerald-600',
        };
      case 'BEKLIYOR':
        return {
          icon: <Clock className="w-3.5 h-3.5" />,
          bgClass: 'bg-amber-50/50',
          borderClass: 'border-amber-200',
          iconClass: 'text-amber-600',
        };
      case 'EKSIK':
      default:
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
          bgClass: 'bg-red-50/50',
          borderClass: 'border-red-200',
          iconClass: 'text-red-600',
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
        <span className="flex-1 text-slate-900 truncate text-xs">
          {tanim.kisaAd}
        </span>
        {belge.dosyaAdi && (
          <span className="text-xs text-slate-400 truncate max-w-[100px]">
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
      <div className={`p-1.5 rounded ${belge.durum === 'VAR' ? 'bg-emerald-50' : 'bg-red-50'}`}>
        <span className={status.iconClass}>{status.icon}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 text-sm">
            {tanim.ad}
          </span>
          {tanim.zorunlu && <span className="text-red-600 text-xs">*</span>}
        </div>
        {belge.yuklemeTarihi && (
          <p className="text-xs text-slate-400 truncate">
            {belge.yuklemeTarihi} - {belge.dosyaAdi}
          </p>
        )}
        {belge.durum === 'EKSIK' && (
          <p className="text-xs text-red-600">Tıkla ve yükle</p>
        )}
      </div>

      {/* Status Badge */}
      <Badge variant={belge.durum === 'VAR' ? 'success' : belge.durum === 'BEKLIYOR' ? 'warning' : 'error'}>
        {belge.durum === 'VAR' ? 'Yüklendi' : belge.durum === 'BEKLIYOR' ? 'Bekliyor' : 'Eksik'}
      </Badge>
    </div>
  );
}
