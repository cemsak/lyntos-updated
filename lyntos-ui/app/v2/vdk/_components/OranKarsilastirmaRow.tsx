import React from 'react';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import type { OranTanimi } from './sektorTypes';
import { hesaplaSapma, formatDeger } from './sektorTypes';

interface OranKarsilastirmaRowProps {
  oranKey: string;
  tanim: OranTanimi;
  mukellef?: number;
  sektor?: number;
  onInfoClick: () => void;
}

export function OranKarsilastirmaRow({
  oranKey,
  tanim,
  mukellef,
  sektor,
  onInfoClick,
}: OranKarsilastirmaRowProps) {
  const sapma = hesaplaSapma(mukellef, sektor, tanim.ideal);

  return (
    <div className="px-5 py-4 hover:bg-[#F5F6F8] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[#5A5A5A]">{tanim.ad}</span>
          <button
            onClick={onInfoClick}
            className="p-1 text-[#969696] hover:text-[#0049AA] hover:bg-[#E6F9FF] rounded-full transition-colors"
            title="Detay ve açıklama için tıklayın"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        {/* Sapma Göstergesi */}
        {sapma.durum !== 'veri_yok' && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            sapma.durum === 'iyi' ? 'text-[#00804D]' :
            sapma.durum === 'kotu' ? 'text-[#BF192B]' :
            'text-[#969696]'
          }`}>
            {sapma.durum === 'iyi' && <TrendingUp className="w-4 h-4" />}
            {sapma.durum === 'kotu' && <TrendingDown className="w-4 h-4" />}
            {sapma.durum === 'normal' && <Minus className="w-4 h-4" />}
            <span>{sapma.sapmaYuzde >= 0 ? '+' : ''}{sapma.sapmaYuzde.toFixed(1)}%</span>
          </div>
        )}
      </div>

      {/* Bar Chart Karşılaştırma */}
      <div className="grid grid-cols-2 gap-4">
        {/* Mükellef */}
        <div>
          <div className="flex items-center justify-between text-xs text-[#969696] mb-1">
            <span>Mükellef</span>
            <span className="font-mono font-semibold text-[#5A5A5A]">
              {formatDeger(mukellef, tanim.birim)}
            </span>
          </div>
          <div className="h-3 bg-[#F5F6F8] rounded-full overflow-hidden">
            {mukellef !== undefined && (
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  sapma.durum === 'iyi' ? 'bg-[#00A651]' :
                  sapma.durum === 'kotu' ? 'bg-[#F0282D]' :
                  'bg-[#0078D0]'
                }`}
                style={{
                  width: `${Math.min(100, Math.max(5, (mukellef * 100) / (Math.max(mukellef, sektor || 1) * 1.5)))}%`
                }}
              />
            )}
          </div>
        </div>

        {/* Sektör */}
        <div>
          <div className="flex items-center justify-between text-xs text-[#969696] mb-1">
            <span>Sektör Ort.</span>
            <span className="font-mono font-semibold text-[#969696]">
              {formatDeger(sektor, tanim.birim)}
            </span>
          </div>
          <div className="h-3 bg-[#F5F6F8] rounded-full overflow-hidden">
            {sektor !== undefined && (
              <div
                className="h-full rounded-full bg-[#969696]"
                style={{
                  width: `${Math.min(100, Math.max(5, (sektor * 100) / (Math.max(mukellef || 1, sektor) * 1.5)))}%`
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mevzuat referansı */}
      {tanim.mevzuat && sapma.durum === 'kotu' && (
        <div className="mt-2 text-xs text-[#FA841E] bg-[#FFFBEB] px-2 py-1 rounded">
          ⚠️ Dikkat: {tanim.mevzuat}
        </div>
      )}
    </div>
  );
}
