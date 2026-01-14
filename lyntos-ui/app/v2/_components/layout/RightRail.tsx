'use client';

/**
 * LYNTOS RightRail Component
 * Sprint 2.4 - Anayasa Compliance
 *
 * "Komutan Paneli" - Dönem durumu ve hızlı aksiyonlar
 * Feed ile senkronize çalışır
 */

import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  FileX,
  Lightbulb,
  FileCheck,
  ChevronRight,
  BarChart3,
  ShieldAlert,
  FolderArchive,
  Zap,
} from 'lucide-react';

interface RightRailProps {
  // Feed'den gelen veriler
  kritikSayisi?: number;
  yuksekSayisi?: number;
  eksikBelgeSayisi?: number;
  // Dinamik öneriler
  oneriler?: string[];
  // Kanıt paketi durumu
  kanitPaketiDurumu?: 'hazir' | 'eksik' | 'bekliyor';
  kanitPaketiYuzde?: number;
  // Tamamlanan belgeler
  tamamlananBelgeler?: string[];
}

interface RailCardProps {
  title: string;
  icon: React.ReactNode;
  value: string | number;
  status?: 'danger' | 'warning' | 'success' | 'neutral';
  href?: string;
  children?: React.ReactNode;
}

function RailCard({ title, icon, value, status = 'neutral', href, children }: RailCardProps) {
  const statusColors = {
    danger: 'border-l-red-500 bg-red-50/50',
    warning: 'border-l-amber-500 bg-amber-50/50',
    success: 'border-l-emerald-500 bg-emerald-50/50',
    neutral: 'border-l-slate-300 bg-slate-50/50',
  };

  const valueColors = {
    danger: 'text-red-600',
    warning: 'text-amber-600',
    success: 'text-emerald-600',
    neutral: 'text-slate-500',
  };

  const content = (
    <div className={`border-l-4 rounded-r-lg p-3 ${statusColors[status]} ${href ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">{icon}</span>
          <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-lg font-bold tabular-nums ${valueColors[status]}`}>{value}</span>
          {href && <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>
      </div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

// Hızlı işlem linki
interface QuickLinkProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function QuickLink({ href, icon, children }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
    >
      <span className="flex items-center gap-2">
        {icon}
        {children}
      </span>
      <ChevronRight className="w-3.5 h-3.5" />
    </Link>
  );
}

export function RightRail({
  kritikSayisi = 0,
  yuksekSayisi = 0,
  eksikBelgeSayisi = 0,
  oneriler = [],
  kanitPaketiDurumu = 'bekliyor',
  kanitPaketiYuzde = 0,
  tamamlananBelgeler = [],
}: RightRailProps) {
  // Toplam acil iş sayısı
  const acilToplam = kritikSayisi + yuksekSayisi;

  // Kanıt paketi status
  const getKanitStatus = () => {
    switch (kanitPaketiDurumu) {
      case 'hazir': return { label: 'Hazır', status: 'success' as const };
      case 'eksik': return { label: `%${kanitPaketiYuzde}`, status: 'warning' as const };
      default: return { label: 'Bekliyor', status: 'neutral' as const };
    }
  };
  const kanitStatus = getKanitStatus();

  // Default öneriler (Feed'den gelen veya varsayılan)
  const displayOneriler = oneriler.length > 0 ? oneriler : [
    'Kritik riskleri inceleyin',
    'Eksik belgeleri tamamlayın',
    'KDV mutabakatı yapın',
  ];

  // Varsayılan tamamlanan belgeler
  const belgeler = tamamlananBelgeler.length > 0
    ? tamamlananBelgeler
    : ['Mizan', 'KDV', 'GV'];

  return (
    <div className="sticky top-4 space-y-3">
      {/* Header - Kompakt */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">Dönem Durumu</h3>
            <p className="text-[10px] text-slate-300 mt-0.5">Komutan Paneli</p>
          </div>
          {acilToplam > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
              {acilToplam} Acil
            </span>
          )}
        </div>
      </div>

      {/* Açık Kritikler - Feed'den */}
      <RailCard
        title="Açık Kritikler"
        icon={<AlertTriangle className="w-4 h-4" />}
        value={kritikSayisi}
        status={kritikSayisi > 0 ? 'danger' : 'success'}
        href={kritikSayisi > 0 ? '/v2/risk' : undefined}
      >
        {kritikSayisi > 0 && (
          <p className="text-[10px] text-slate-500">
            VDK incelemesinde risk oluşturabilir
          </p>
        )}
      </RailCard>

      {/* Yüksek Öncelikli - Feed'den */}
      {yuksekSayisi > 0 && (
        <RailCard
          title="Yüksek Öncelik"
          icon={<Zap className="w-4 h-4" />}
          value={yuksekSayisi}
          status="warning"
          href="/v2/risk"
        >
          <p className="text-[10px] text-slate-500">
            Bu hafta tamamlanmalı
          </p>
        </RailCard>
      )}

      {/* Eksik Belgeler */}
      <RailCard
        title="Eksik Belgeler"
        icon={<FileX className="w-4 h-4" />}
        value={eksikBelgeSayisi}
        status={eksikBelgeSayisi > 0 ? 'warning' : 'success'}
        href={eksikBelgeSayisi > 0 ? '/v2/upload' : undefined}
      >
        {eksikBelgeSayisi > 0 && (
          <p className="text-[10px] text-slate-500">
            Analiz tamamlanamıyor
          </p>
        )}
      </RailCard>

      {/* Önerilen Aksiyonlar - Kompakt */}
      <div className="border border-slate-200 rounded-lg p-3 bg-white">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
            Öneriler
          </span>
        </div>
        <ul className="space-y-1.5">
          {displayOneriler.slice(0, 3).map((oneri, idx) => (
            <li key={idx} className="flex items-start gap-2 text-[11px] text-slate-600">
              <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[9px] text-slate-500 flex-shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span className="line-clamp-2">{oneri}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Kanıt Paketi Durumu */}
      <RailCard
        title="Kanıt Paketi"
        icon={<FileCheck className="w-4 h-4" />}
        value={kanitStatus.label}
        status={kanitStatus.status}
        href="/v2/reports/evidence"
      >
        <div className="flex flex-wrap gap-1 mt-1">
          {belgeler.map((belge, idx) => (
            <span
              key={idx}
              className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700"
            >
              {belge}
            </span>
          ))}
          {kanitPaketiDurumu !== 'hazir' && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">
              +{4 - belgeler.length} eksik
            </span>
          )}
        </div>
      </RailCard>

      {/* Hızlı İşlemler - Gerçek Link'ler */}
      <div className="border border-slate-200 rounded-lg p-3 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
        <h4 className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide mb-2">
          Hızlı İşlemler
        </h4>
        <div className="space-y-1">
          <QuickLink href="/v2/reports" icon={<BarChart3 className="w-3.5 h-3.5" />}>
            Dönem Raporu
          </QuickLink>
          <QuickLink href="/v2/vdk" icon={<ShieldAlert className="w-3.5 h-3.5" />}>
            VDK Risk Özeti
          </QuickLink>
          <QuickLink href="/v2/reports/evidence" icon={<FolderArchive className="w-3.5 h-3.5" />}>
            Kanıt Paketi
          </QuickLink>
        </div>
      </div>
    </div>
  );
}
