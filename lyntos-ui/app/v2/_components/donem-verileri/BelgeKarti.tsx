'use client';
import React from 'react';
import {
  BookOpen,
  Book,
  Table,
  FileText,
  Building2,
  Receipt,
  FileSpreadsheet,
  Users,
  Stamp,
  CalendarClock,
  Building,
  User,
  Fuel,
  Scale,
  TrendingUp,
  Banknote,
  PieChart,
  FileQuestion,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '../shared/Badge';
import type { BelgeDurumData, BelgeDurumu } from './types';
import { BELGE_TANIMLARI } from './types';

// Icon string to component mapper
const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen,
  Book,
  Table,
  FileText,
  Building2,
  Receipt,
  FileSpreadsheet,
  Users,
  Stamp,
  CalendarClock,
  Building,
  User,
  Fuel,
  Scale,
  TrendingUp,
  Banknote,
  PieChart,
};

interface BelgeKartiProps {
  belge: BelgeDurumData;
  onUploadClick?: (tip: BelgeDurumData['tip']) => void;
}

const DURUM_CONFIG: Record<BelgeDurumu, { variant: 'success' | 'error' | 'warning'; label: string; bgClass: string }> = {
  VAR: { variant: 'success', label: 'Yuklendi', bgClass: 'bg-green-50 border-green-200' },
  EKSIK: { variant: 'error', label: 'Eksik', bgClass: 'bg-red-50 border-red-200' },
  BEKLIYOR: { variant: 'warning', label: 'Bekliyor', bgClass: 'bg-amber-50 border-amber-200' },
};

export function BelgeKarti({ belge, onUploadClick }: BelgeKartiProps) {
  const tanim = BELGE_TANIMLARI[belge.tip];
  const durumConfig = DURUM_CONFIG[belge.durum];

  const handleClick = () => {
    if (belge.durum === 'EKSIK' && onUploadClick) {
      onUploadClick(belge.tip);
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border ${durumConfig.bgClass} ${
        belge.durum === 'EKSIK' ? 'cursor-pointer hover:opacity-80' : ''
      }`}
      onClick={handleClick}
      role={belge.durum === 'EKSIK' ? 'button' : undefined}
      tabIndex={belge.durum === 'EKSIK' ? 0 : undefined}
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-slate-200">
        {(() => {
          const IconComponent = tanim.icon ? ICON_MAP[tanim.icon] : FileQuestion;
          return IconComponent ? (
            <IconComponent className="w-5 h-5 text-slate-600" />
          ) : (
            <FileQuestion className="w-5 h-5 text-slate-600" />
          );
        })()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900 truncate">
            {tanim.label_tr}
          </span>
          {tanim.gerekliMi && <span className="text-red-500 text-xs">*</span>}
        </div>
        {belge.durum === 'VAR' && belge.yuklemeTarihi && (
          <p className="text-xs text-slate-500 truncate">
            {new Date(belge.yuklemeTarihi).toLocaleDateString('tr-TR')}
            {belge.dosyaAdi && ` - ${belge.dosyaAdi}`}
          </p>
        )}
        {belge.durum === 'EKSIK' && (
          <p className="text-xs text-red-600">Tikla ve yukle</p>
        )}
        {belge.durum === 'BEKLIYOR' && (
          <p className="text-xs text-amber-600">Isleniyor...</p>
        )}
      </div>

      {/* Status Badge */}
      <Badge variant={durumConfig.variant}>{durumConfig.label}</Badge>
    </div>
  );
}
