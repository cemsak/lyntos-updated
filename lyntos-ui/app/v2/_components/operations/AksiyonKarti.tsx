'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '../shared/Badge';
import type { AksiyonItem } from './types';
import { ONCELIK_CONFIG, PROBLEM_DURUMU_CONFIG, KAYNAK_ICONS } from './types';

interface AksiyonKartiProps {
  aksiyon: AksiyonItem;
  onProblemCozmeClick?: (aksiyon: AksiyonItem) => void;
  compact?: boolean;
}

// Kalan gun formati
function formatKalanGun(gun?: number): string {
  if (gun === undefined) return '';
  if (gun < 0) return `${Math.abs(gun)} gun gecikti!`;
  if (gun === 0) return 'BUGUN!';
  if (gun === 1) return 'Yarin';
  return `${gun} gun`;
}

// Sure formati
function formatSure(dakika: number): string {
  if (dakika < 60) return `~${dakika} dk`;
  const saat = Math.floor(dakika / 60);
  const dk = dakika % 60;
  return dk > 0 ? `~${saat}s ${dk}dk` : `~${saat} saat`;
}

export function AksiyonKarti({
  aksiyon,
  onProblemCozmeClick,
  compact = false,
}: AksiyonKartiProps) {
  const router = useRouter();
  const oncelikConfig = ONCELIK_CONFIG[aksiyon.oncelik];
  const problemConfig = aksiyon.problemDurumu
    ? PROBLEM_DURUMU_CONFIG[aksiyon.problemDurumu]
    : null;

  const handleAksiyonClick = () => {
    if (aksiyon.aksiyonUrl) {
      router.push(aksiyon.aksiyonUrl);
    }
  };

  return (
    <div
      className={`rounded-lg border transition-all hover:shadow-md ${oncelikConfig.bgColor} ${oncelikConfig.borderColor} ${compact ? 'p-3' : 'p-4'}`}
    >
      {/* Ust Satir: Baslik + 8D Badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{KAYNAK_ICONS[aksiyon.kaynak]}</span>
          <h4 className={`font-semibold ${compact ? 'text-sm' : 'text-base'} ${oncelikConfig.color}`}>
            {aksiyon.baslik}
          </h4>
        </div>

        {/* 8D Problem Durumu Badge */}
        {problemConfig && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono ${problemConfig.bgColor} ${problemConfig.color}`}>
            {problemConfig.label}
          </span>
        )}
      </div>

      {/* Meta Bilgiler */}
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 ${compact ? 'mb-2' : 'mb-3'}`}>
        {/* Mukellef */}
        {aksiyon.mukellef && (
          <div className="flex items-center gap-1">
            <span>📍</span>
            <span>{aksiyon.mukellef.ad}</span>
          </div>
        )}

        {/* Kalan Sure */}
        {aksiyon.kalanGun !== undefined && (
          <div className={`flex items-center gap-1 ${aksiyon.kalanGun <= 3 ? 'text-red-600 font-medium' : ''}`}>
            <span>⏰</span>
            <span>{formatKalanGun(aksiyon.kalanGun)}</span>
            {aksiyon.sonTarih && (
              <span className="text-xs">
                ({aksiyon.sonTarih.toLocaleDateString('tr-TR')})
              </span>
            )}
          </div>
        )}

        {/* Tahmini Sure */}
        <div className="flex items-center gap-1">
          <span>🕐</span>
          <span>{formatSure(aksiyon.tahminiDakika)}</span>
        </div>

        {/* Tekrar Sayisi (Kaizen metrigi) */}
        {aksiyon.tekrarSayisi && aksiyon.tekrarSayisi > 1 && (
          <div className="flex items-center gap-1 text-amber-600">
            <span>📈</span>
            <span>{aksiyon.tekrarSayisi}. kez</span>
          </div>
        )}
      </div>

      {/* Aciklama */}
      {!compact && aksiyon.aciklama && (
        <p className="text-sm text-slate-600 mb-3">
          💡 {aksiyon.aciklama}
        </p>
      )}

      {/* Detay (varsa) */}
      {!compact && aksiyon.detay && (
        <p className="text-sm text-slate-600 mb-3 flex items-start gap-1">
          <span className="text-amber-500 flex-shrink-0">⚠️</span>
          {aksiyon.detay}
        </p>
      )}

      {/* Aksiyon Butonlari */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          {/* 5 Why butonu (VDK risk icin) */}
          {aksiyon.kaynak === 'vdk_risk' && onProblemCozmeClick && (
            <button
              onClick={() => onProblemCozmeClick(aksiyon)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              5 Why Baslat
            </button>
          )}
        </div>

        {/* Ana Aksiyon Butonu */}
        <button
          onClick={handleAksiyonClick}
          className={`px-4 py-1.5 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-1 ${
            aksiyon.oncelik === 'acil' ? 'bg-red-600 hover:bg-red-700' :
            aksiyon.oncelik === 'normal' ? 'bg-amber-600 hover:bg-amber-700' :
            'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {aksiyon.aksiyonLabel}
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
