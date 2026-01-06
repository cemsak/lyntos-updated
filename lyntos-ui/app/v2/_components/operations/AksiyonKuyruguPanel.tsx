'use client';
import React, { useState, useMemo } from 'react';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { AksiyonKarti } from './AksiyonKarti';
import type { AksiyonItem, AksiyonStats, AksiyonOncelik } from './types';
import { ONCELIK_CONFIG } from './types';

interface AksiyonKuyruguPanelProps {
  aksiyonlar: AksiyonItem[];
  stats?: AksiyonStats;
  onProblemCozmeClick?: (aksiyon: AksiyonItem) => void;
  maxGosterim?: number;
}

// Toplam sure formati
function formatToplamSure(dakika: number): string {
  if (dakika < 60) return `${dakika} dk`;
  const saat = Math.floor(dakika / 60);
  const dk = dakika % 60;
  if (saat < 1) return `${dakika} dk`;
  return dk > 0 ? `${saat} saat ${dk} dk` : `${saat} saat`;
}

export function AksiyonKuyruguPanel({
  aksiyonlar,
  stats,
  onProblemCozmeClick,
  maxGosterim = 10,
}: AksiyonKuyruguPanelProps) {
  const [acilAcik, setAcilAcik] = useState(true);
  const [normalAcik, setNormalAcik] = useState(true);
  const [bilgiAcik, setBilgiAcik] = useState(false);
  const [tumunuGoster, setTumunuGoster] = useState(false);

  // Gruplama
  const grupluAksiyonlar = useMemo(() => {
    const acil = aksiyonlar.filter(a => a.oncelik === 'acil');
    const normal = aksiyonlar.filter(a => a.oncelik === 'normal');
    const bilgi = aksiyonlar.filter(a => a.oncelik === 'bilgi');
    return { acil, normal, bilgi };
  }, [aksiyonlar]);

  // Istatistikleri hesapla (props'tan gelmezse)
  const hesaplananStats: AksiyonStats = useMemo(() => {
    if (stats) return stats;
    return {
      toplam: aksiyonlar.length,
      acil: grupluAksiyonlar.acil.length,
      normal: grupluAksiyonlar.normal.length,
      bilgi: grupluAksiyonlar.bilgi.length,
      tahminiToplamDakika: aksiyonlar.reduce((t, a) => t + a.tahminiDakika, 0),
      bugunTamamlanan: 0,
      buHaftaTamamlanan: 0,
      buHaftaHedef: 0,
    };
  }, [aksiyonlar, grupluAksiyonlar, stats]);

  // Grup render helper
  const renderGrup = (
    oncelik: AksiyonOncelik,
    aksiyonListesi: AksiyonItem[],
    acik: boolean,
    setAcik: (v: boolean) => void
  ) => {
    if (aksiyonListesi.length === 0) return null;

    const config = ONCELIK_CONFIG[oncelik];
    const gosterilecek = tumunuGoster
      ? aksiyonListesi
      : aksiyonListesi.slice(0, maxGosterim);

    return (
      <div className="space-y-2">
        {/* Grup Basligi */}
        <button
          onClick={() => setAcik(!acik)}
          className={`flex items-center justify-between w-full py-2 px-3 rounded-md transition-colors ${config.bgColor} hover:opacity-80`}
        >
          <div className="flex items-center gap-2">
            <span>{config.icon}</span>
            <span className={`font-semibold ${config.color}`}>
              {config.label} ({aksiyonListesi.length})
            </span>
            <span className="text-sm text-slate-500">
              — {config.labelTr}
            </span>
          </div>
          <span className="text-slate-400">
            {acik ? '▲' : '▼'}
          </span>
        </button>

        {/* Aksiyon Kartlari */}
        {acik && (
          <div className="space-y-2 pl-2">
            {gosterilecek.map((aksiyon) => (
              <AksiyonKarti
                key={aksiyon.id}
                aksiyon={aksiyon}
                onProblemCozmeClick={onProblemCozmeClick}
              />
            ))}

            {/* Daha fazla goster */}
            {!tumunuGoster && aksiyonListesi.length > maxGosterim && (
              <button
                onClick={() => setTumunuGoster(true)}
                className="w-full py-2 text-sm text-slate-500 hover:text-slate-700"
              >
                +{aksiyonListesi.length - maxGosterim} daha fazla goster
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card
      title="Bugunku Islerim"
      subtitle={`${hesaplananStats.toplam} is | ${formatToplamSure(hesaplananStats.tahminiToplamDakika)}`}
      headerAction={
        hesaplananStats.acil > 0 && (
          <Badge variant="error">{hesaplananStats.acil} acil</Badge>
        )
      }
    >
      {/* Acil uyari */}
      {hesaplananStats.acil > 0 && (
        <div className="flex items-center gap-2 mb-4 p-2 bg-red-50 border border-red-200 rounded-md">
          <span className="text-red-600 font-medium">
            🔴 {hesaplananStats.acil} acil is bekliyor!
          </span>
        </div>
      )}

      {/* Bos Durum */}
      {aksiyonlar.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <span className="text-4xl mb-2">✅</span>
          <p className="text-green-700 font-medium">Tum isler tamamlandi!</p>
          <p className="text-sm text-slate-500">
            Bugun icin bekleyen is yok
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ACIL */}
          {renderGrup('acil', grupluAksiyonlar.acil, acilAcik, setAcilAcik)}

          {/* NORMAL */}
          {renderGrup('normal', grupluAksiyonlar.normal, normalAcik, setNormalAcik)}

          {/* BILGI */}
          {renderGrup('bilgi', grupluAksiyonlar.bilgi, bilgiAcik, setBilgiAcik)}
        </div>
      )}

      {/* Alt Ozet */}
      {(hesaplananStats.bugunTamamlanan > 0 || hesaplananStats.buHaftaTamamlanan > 0) && (
        <div className="pt-3 mt-4 border-t border-slate-100 text-sm text-slate-500 flex items-center justify-between">
          <span>
            ✅ Bugun tamamlanan: {hesaplananStats.bugunTamamlanan} is
          </span>
          {hesaplananStats.buHaftaHedef > 0 && (
            <span className="flex items-center gap-1">
              📈 Bu hafta: {hesaplananStats.buHaftaTamamlanan}/{hesaplananStats.buHaftaHedef}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
