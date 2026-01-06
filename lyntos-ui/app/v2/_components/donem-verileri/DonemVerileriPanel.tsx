'use client';
import React from 'react';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { PanelState } from '../shared/PanelState';
import { useFailSoftFetch } from '../hooks/useFailSoftFetch';
import { ENDPOINTS } from '../contracts/endpoints';
import { normalizeToEnvelope } from '../contracts/map';
import type { PanelEnvelope } from '../contracts/envelope';
import { BelgeKarti } from './BelgeKarti';
import type { BelgeDurumData, BelgeTipi, DonemVerileriResult } from './types';
import { BELGE_TANIMLARI } from './types';

function normalizeDonemVerileri(raw: unknown): PanelEnvelope<DonemVerileriResult> {
  return normalizeToEnvelope<DonemVerileriResult>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;

    // Extract belgeler from response
    const belgelerRaw = data?.documents || data?.belgeler || data?.items || [];
    const belgeler: BelgeDurumData[] = Array.isArray(belgelerRaw)
      ? belgelerRaw.map((item: Record<string, unknown>) => {
          const tip = (item.type || item.tip || 'MIZAN') as BelgeTipi;
          const status = item.status || item.durum || 'EKSIK';
          let durum: BelgeDurumData['durum'] = 'EKSIK';
          if (status === 'VAR' || status === 'uploaded' || status === 'complete') {
            durum = 'VAR';
          } else if (status === 'BEKLIYOR' || status === 'pending' || status === 'processing') {
            durum = 'BEKLIYOR';
          }
          return {
            tip,
            durum,
            yuklemeTarihi: item.uploaded_at ? String(item.uploaded_at) : item.yuklemeTarihi ? String(item.yuklemeTarihi) : undefined,
            dosyaAdi: item.filename ? String(item.filename) : item.dosyaAdi ? String(item.dosyaAdi) : undefined,
            fileId: item.file_id ? String(item.file_id) : item.fileId ? String(item.fileId) : undefined,
            hatalar: Array.isArray(item.errors) ? item.errors.map(String) : undefined,
            uyarilar: Array.isArray(item.warnings) ? item.warnings.map(String) : undefined,
          };
        })
      : [];

    // If no documents returned, create default list with all EKSIK
    if (belgeler.length === 0) {
      Object.keys(BELGE_TANIMLARI).forEach((tip) => {
        belgeler.push({
          tip: tip as BelgeTipi,
          durum: 'EKSIK',
        });
      });
    }

    // Calculate stats
    const varSayisi = belgeler.filter(b => b.durum === 'VAR').length;
    const eksikSayisi = belgeler.filter(b => b.durum === 'EKSIK').length;
    const bekleyenSayisi = belgeler.filter(b => b.durum === 'BEKLIYOR').length;

    // Calculate completion percentage based on required docs
    const gerekliTipler = Object.values(BELGE_TANIMLARI).filter(t => t.gerekliMi).map(t => t.tip);
    const gerekliVar = belgeler.filter(b => gerekliTipler.includes(b.tip) && b.durum === 'VAR').length;
    const tamamlanmaYuzdesi = gerekliTipler.length > 0
      ? Math.round((gerekliVar / gerekliTipler.length) * 100)
      : 0;

    return {
      belgeler,
      tamamlanmaYuzdesi,
      eksikSayisi,
      varSayisi,
      bekleyenSayisi,
    };
  });
}

export function DonemVerileriPanel() {
  const envelope = useFailSoftFetch<DonemVerileriResult>(
    ENDPOINTS.PERIOD_COMPLETENESS,
    normalizeDonemVerileri
  );
  const { status, reason_tr, data } = envelope;

  const handleUploadClick = (tip: BelgeTipi) => {
    // Scroll to upload section or open upload modal
    const uploadSection = document.getElementById('upload-section');
    if (uploadSection) {
      uploadSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // TODO: Pre-select document type in upload zone
    console.log('Upload requested for:', tip);
  };

  // Separate required and optional documents
  const gerekliTipler = Object.values(BELGE_TANIMLARI).filter(t => t.gerekliMi).map(t => t.tip);
  const gerekliBelgeler = data?.belgeler.filter(b => gerekliTipler.includes(b.tip)) || [];
  const opsiyonelBelgeler = data?.belgeler.filter(b => !gerekliTipler.includes(b.tip)) || [];

  return (
    <Card
      title="Donem Verileri"
      subtitle={data ? `%${data.tamamlanmaYuzdesi} tamamlandi` : undefined}
      headerAction={
        data && data.eksikSayisi > 0 && (
          <Badge variant="warning">{data.eksikSayisi} eksik</Badge>
        )
      }
    >
      <PanelState status={status} reason_tr={reason_tr}>
        {data && data.tamamlanmaYuzdesi >= 100 && data.eksikSayisi === 0 ? (
          <div className="text-center py-6">
            <span className="text-3xl">P</span>
            <p className="text-sm text-green-600 mt-2">Tum gerekli belgeler yuklendi!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress Bar */}
            {data && (
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${data.tamamlanmaYuzdesi}%` }}
                />
              </div>
            )}

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
            {data && (
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
            )}
          </div>
        )}
      </PanelState>
    </Card>
  );
}
