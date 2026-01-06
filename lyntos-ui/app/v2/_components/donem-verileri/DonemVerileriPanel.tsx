'use client';
import React from 'react';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { BelgeKarti } from './BelgeKarti';
import type { BelgeTipi } from './types';
import { BELGE_TANIMLARI } from './types';
import { useDonemVerileri } from './useDonemVerileri';

interface DonemVerileriPanelProps {
  onUploadClick?: (tip: BelgeTipi) => void;
}

export function DonemVerileriPanel({ onUploadClick }: DonemVerileriPanelProps) {
  const { data, isLoading, markAsUploaded } = useDonemVerileri();

  const handleUploadClick = (tip: BelgeTipi) => {
    if (onUploadClick) {
      onUploadClick(tip);
    } else {
      // Fallback: scroll to upload section
      const uploadSection = document.getElementById('upload-section');
      if (uploadSection) {
        uploadSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Separate required and optional documents
  const gerekliTipler = Object.values(BELGE_TANIMLARI).filter(t => t.gerekliMi).map(t => t.tip);
  const gerekliBelgeler = data.belgeler.filter(b => gerekliTipler.includes(b.tip));
  const opsiyonelBelgeler = data.belgeler.filter(b => !gerekliTipler.includes(b.tip));

  if (isLoading) {
    return (
      <Card title="Donem Verileri">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Donem Verileri"
      subtitle={`%${data.tamamlanmaYuzdesi} tamamlandi`}
      headerAction={
        data.eksikSayisi > 0 && (
          <Badge variant="warning">{data.eksikSayisi} eksik</Badge>
        )
      }
    >
      {data.tamamlanmaYuzdesi >= 100 && data.eksikSayisi === 0 ? (
        <div className="text-center py-6">
          <span className="text-3xl">✓</span>
          <p className="text-sm text-green-600 mt-2">Tum gerekli belgeler yuklendi!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${data.tamamlanmaYuzdesi}%` }}
            />
          </div>

          {/* Required Documents */}
          <div>
            <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Gerekli Belgeler
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {gerekliBelgeler.map((belge) => (
                <BelgeKarti
                  key={belge.tip}
                  belge={belge}
                  onUploadClick={handleUploadClick}
                />
              ))}
            </div>
          </div>

          {/* Optional Documents (collapsed by default) */}
          {opsiyonelBelgeler.length > 0 && (
            <details className="group">
              <summary className="text-xs font-medium text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700">
                Opsiyonel Belgeler ({opsiyonelBelgeler.filter(b => b.durum === 'VAR').length}/{opsiyonelBelgeler.length})
              </summary>
              <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                {opsiyonelBelgeler.map((belge) => (
                  <BelgeKarti
                    key={belge.tip}
                    belge={belge}
                    onUploadClick={handleUploadClick}
                  />
                ))}
              </div>
            </details>
          )}

          {/* Stats Row */}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <div className="flex-1 text-center">
              <span className="text-lg font-bold text-green-600">{data.varSayisi}</span>
              <p className="text-xs text-slate-500">Yuklendi</p>
            </div>
            <div className="flex-1 text-center">
              <span className="text-lg font-bold text-red-600">{data.eksikSayisi}</span>
              <p className="text-xs text-slate-500">Eksik</p>
            </div>
            <div className="flex-1 text-center">
              <span className="text-lg font-bold text-amber-600">{data.bekleyenSayisi}</span>
              <p className="text-xs text-slate-500">Bekliyor</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
