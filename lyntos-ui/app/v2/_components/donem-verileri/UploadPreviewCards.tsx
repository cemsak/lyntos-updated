'use client';

import React from 'react';
import { Target, PieChart, Coins, FileSpreadsheet, FileText, Receipt, Building2 } from 'lucide-react';
import type { BelgeTipi } from './types';

interface UploadPreviewCardsProps {
  onUploadClick?: (tip: BelgeTipi) => void;
}

interface PreviewCardData {
  id: string;
  title: string;
  icon: React.ReactNode;
  rows: Array<{ label: string; value: string }>;
  activationHint: string;
}

const PREVIEW_CARDS: PreviewCardData[] = [
  {
    id: 'vdk-risk',
    title: 'VDK Risk Analizi',
    icon: <Target className="w-5 h-5" />,
    rows: [
      { label: 'Risk Skoru', value: '---/100' },
      { label: 'Kritik Kriter', value: '---' },
      { label: 'Öneri Sayısı', value: '---' },
    ],
    activationHint: 'Mizan yüklendiğinde aktif olur',
  },
  {
    id: 'mizan-analizi',
    title: 'Mizan Analizi',
    icon: <PieChart className="w-5 h-5" />,
    rows: [
      { label: 'Denge Kontrolü', value: '---' },
      { label: 'Kritik Hesaplar', value: '---' },
      { label: 'Oran Analizleri', value: '---' },
    ],
    activationHint: 'Mizan yüklendiğinde aktif olur',
  },
  {
    id: 'vergi-hesaplamalari',
    title: 'Vergi Hesaplamaları',
    icon: <Coins className="w-5 h-5" />,
    rows: [
      { label: 'Kurumlar Vergisi', value: '₺---' },
      { label: 'Geçici Vergi', value: '₺---' },
      { label: 'Enflasyon Düzeltmesi', value: '₺---' },
    ],
    activationHint: 'Mizan + Beyanname yüklendiğinde aktif olur',
  },
];

interface RequiredDocItem {
  id: number;
  label: string;
  status: 'required' | 'recommended' | 'optional';
  belgeTip?: BelgeTipi;
}

const REQUIRED_DOCS: RequiredDocItem[] = [
  { id: 1, label: 'Dönem Sonu Mizan (Excel/CSV)', status: 'required', belgeTip: 'mizan_ayrintili' },
  { id: 2, label: 'E-Defter Beratları (XML/ZIP)', status: 'recommended', belgeTip: 'e_defter_yevmiye' },
  { id: 3, label: 'KDV Beyannameleri', status: 'recommended', belgeTip: 'beyan_kdv' },
  { id: 4, label: 'Banka Ekstreleri', status: 'optional', belgeTip: 'banka_ekstresi' },
];

const STATUS_STYLES: Record<RequiredDocItem['status'], { text: string; className: string }> = {
  required: { text: 'Zorunlu', className: 'text-red-500' },
  recommended: { text: 'Önerilen', className: 'text-amber-500' },
  optional: { text: 'Opsiyonel', className: 'text-slate-400' },
};

export function UploadPreviewCards({ onUploadClick }: UploadPreviewCardsProps) {
  return (
    <div className="space-y-4">
      {/* Analysis Preview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PREVIEW_CARDS.map((card) => (
          <div
            key={card.id}
            className="bg-slate-50 border border-slate-200 rounded-lg p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-slate-500">{card.icon}</span>
              <h4 className="font-medium text-slate-700 text-sm">{card.title}</h4>
            </div>
            <div className="space-y-1.5 text-xs">
              {card.rows.map((row, idx) => (
                <div
                  key={idx}
                  className="flex justify-between py-1 border-b border-slate-100 last:border-0"
                >
                  <span className="text-slate-500">{row.label}</span>
                  <span className="text-slate-300 font-medium">{row.value}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-blue-600 mt-2 flex items-center gap-1">
              <span>📤</span> {card.activationHint}
            </p>
          </div>
        ))}
      </div>

      {/* Required Documents Checklist */}
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <h4 className="font-medium text-slate-800 text-sm mb-2">
          Tam Analiz İçin Gerekli Belgeler
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs">
          {REQUIRED_DOCS.map((doc) => {
            const statusStyle = STATUS_STYLES[doc.status];
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => doc.belgeTip && onUploadClick?.(doc.belgeTip)}
                disabled={!doc.belgeTip || !onUploadClick}
                className="flex items-center gap-2 p-2 bg-slate-50 rounded hover:bg-slate-100
                         transition-colors text-left disabled:cursor-default disabled:hover:bg-slate-50"
              >
                <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-500 flex-shrink-0">
                  {doc.id}
                </span>
                <span className="text-slate-600 flex-1 truncate">{doc.label}</span>
                <span className={`ml-auto text-[10px] ${statusStyle.className} flex-shrink-0`}>
                  {statusStyle.text}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
