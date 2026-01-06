'use client';

import React, { useState, useMemo } from 'react';
import { CheckCircle2, AlertTriangle, Clock, XCircle, Minus, ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import type { GeciciVergiKontrol, KontrolDurumu, RiskSeviyesi } from './types';
import { GECICI_VERGI_KONTROLLER } from './types';

interface GeciciVergiPanelProps {
  donem?: string;
  kontrolDurumlari?: Record<string, KontrolDurumu>;
  onKontrolClick?: (kontrolId: string) => void;
}

const DURUM_ICONS: Record<KontrolDurumu, React.ReactNode> = {
  tamamlandi: <CheckCircle2 className="w-5 h-5 text-green-600" />,
  bekliyor: <Clock className="w-5 h-5 text-slate-400" />,
  uyari: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  hata: <XCircle className="w-5 h-5 text-red-500" />,
  uygulanamaz: <Minus className="w-5 h-5 text-slate-300" />,
};

const RISK_COLORS: Record<RiskSeviyesi, string> = {
  dusuk: 'bg-green-50 text-green-700 border-green-200',
  orta: 'bg-amber-50 text-amber-700 border-amber-200',
  yuksek: 'bg-orange-50 text-orange-700 border-orange-200',
  kritik: 'bg-red-50 text-red-700 border-red-200',
};

export function GeciciVergiPanel({
  donem = '2025-Q4',
  kontrolDurumlari = {},
  onKontrolClick,
}: GeciciVergiPanelProps) {
  const [expandedKontrol, setExpandedKontrol] = useState<string | null>(null);

  const kontrollerWithDurum = useMemo(() => {
    return GECICI_VERGI_KONTROLLER.map(kontrol => ({
      ...kontrol,
      durum: kontrolDurumlari[kontrol.id] || 'bekliyor' as KontrolDurumu,
    }));
  }, [kontrolDurumlari]);

  const stats = useMemo(() => {
    const tamamlanan = kontrollerWithDurum.filter(k => k.durum === 'tamamlandi').length;
    const uyari = kontrollerWithDurum.filter(k => k.durum === 'uyari').length;
    const hata = kontrollerWithDurum.filter(k => k.durum === 'hata').length;
    const oran = Math.round((tamamlanan / kontrollerWithDurum.length) * 100);
    return { tamamlanan, uyari, hata, oran, toplam: kontrollerWithDurum.length };
  }, [kontrollerWithDurum]);

  const donemBilgisi = useMemo(() => {
    const match = donem.match(/(\d{4})-Q(\d)/);
    if (!match) return { yil: 2025, ceyrek: 4 };
    return { yil: parseInt(match[1]), ceyrek: parseInt(match[2]) };
  }, [donem]);

  const toggleExpand = (kontrolId: string) => {
    setExpandedKontrol(prev => prev === kontrolId ? null : kontrolId);
  };

  return (
    <Card
      title="Gecici Vergi 12 Kritik Kontrol"
      subtitle={`${donemBilgisi.yil} - ${donemBilgisi.ceyrek}. Ceyrek`}
      headerAction={
        <div className="flex items-center gap-2">
          <Badge variant={stats.oran === 100 ? 'success' : 'warning'}>
            {stats.tamamlanan}/{stats.toplam}
          </Badge>
        </div>
      }
    >
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${stats.oran}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-slate-500">
          <span>%{stats.oran} tamamlandi</span>
          <span>
            {stats.uyari > 0 && `${stats.uyari} uyari`}
            {stats.uyari > 0 && stats.hata > 0 && ' / '}
            {stats.hata > 0 && `${stats.hata} hata`}
          </span>
        </div>
      </div>

      {/* Kontrol Listesi */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {kontrollerWithDurum.map((kontrol) => (
          <div key={kontrol.id} className="border border-slate-200 rounded-lg overflow-hidden">
            {/* Kontrol Satiri */}
            <div
              className="px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggleExpand(kontrol.id)}
            >
              <div className="flex items-center gap-3">
                {DURUM_ICONS[kontrol.durum]}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">
                      {kontrol.id}
                    </span>
                    <h4 className="font-medium text-slate-800 text-sm truncate">
                      {kontrol.baslik}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {kontrol.aciklama}
                  </p>
                </div>

                <span className={`px-2 py-0.5 text-xs font-medium rounded border ${RISK_COLORS[kontrol.riskSeviyesi]}`}>
                  {kontrol.riskSeviyesi.toUpperCase()}
                </span>

                {expandedKontrol === kontrol.id ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            {/* Detay Paneli */}
            {expandedKontrol === kontrol.id && (
              <div className="px-4 pb-4 pt-0 border-t border-slate-100">
                <div className="bg-slate-50 rounded-lg p-4 mt-3 space-y-3">
                  <div>
                    <h5 className="text-xs font-medium text-slate-700 mb-1">Aciklama</h5>
                    <p className="text-sm text-slate-600">{kontrol.detayliAciklama}</p>
                  </div>

                  <div>
                    <h5 className="text-xs font-medium text-slate-700 mb-1">Kontrol Noktalari</h5>
                    <ul className="space-y-1">
                      {kontrol.kontrolNoktasi.map((nokta, idx) => (
                        <li key={idx} className="text-xs text-slate-600 flex items-start gap-1">
                          <span className="text-slate-400">-</span>
                          {nokta}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {kontrol.hesaplamaFormulu && (
                    <div>
                      <h5 className="text-xs font-medium text-slate-700 mb-1">Hesaplama</h5>
                      <code className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-700 block">
                        {kontrol.hesaplamaFormulu}
                      </code>
                    </div>
                  )}

                  <div>
                    <h5 className="text-xs font-medium text-slate-700 mb-1">Yasal Dayanak</h5>
                    <div className="flex flex-wrap gap-1">
                      {kontrol.yasalDayanak.map((dayanak, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
                        >
                          {dayanak.kanun} Md.{dayanak.madde}
                        </span>
                      ))}
                    </div>
                  </div>

                  {kontrol.oneriler.length > 0 && (
                    <div>
                      <h5 className="text-xs font-medium text-green-700 mb-1">Oneriler</h5>
                      <ul className="space-y-1">
                        {kontrol.oneriler.map((oneri, idx) => (
                          <li key={idx} className="text-xs text-slate-600">- {oneri}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {kontrol.uyarilar.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-2">
                      <h5 className="text-xs font-medium text-amber-700 mb-1">Dikkat</h5>
                      <ul className="space-y-1">
                        {kontrol.uyarilar.map((uyari, idx) => (
                          <li key={idx} className="text-xs text-amber-700">- {uyari}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onKontrolClick?.(kontrol.id);
                      }}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Kontrolu Baslat
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-sm">
        <div className="flex gap-4">
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle2 className="w-4 h-4" />
            {stats.tamamlanan}
          </span>
          <span className="flex items-center gap-1 text-amber-500">
            <AlertTriangle className="w-4 h-4" />
            {stats.uyari}
          </span>
          <span className="flex items-center gap-1 text-red-500">
            <XCircle className="w-4 h-4" />
            {stats.hata}
          </span>
        </div>
        <button className="text-xs text-slate-500 hover:text-slate-700">
          Rapor Indir
        </button>
      </div>
    </Card>
  );
}

export default GeciciVergiPanel;
