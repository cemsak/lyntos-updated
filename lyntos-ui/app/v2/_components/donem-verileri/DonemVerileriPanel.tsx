'use client';
import React, { useState, useMemo } from 'react';
import {
  Table, BookOpen, FileSpreadsheet, FileText, Building2, Receipt, PieChart,
  ChevronDown, ChevronRight, Upload
} from 'lucide-react';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { BelgeKarti } from './BelgeKarti';
import type { BelgeTipi, BelgeKategorisiUI, BelgeDurumData } from './types';
import {
  BELGE_KATEGORILERI_UI,
  getKategoriFromBelgeTipi,
  getZorunluKategoriler,
  getOpsiyonelKategoriler,
} from './types';
import { useDonemVerileri } from './useDonemVerileri';

interface DonemVerileriPanelProps {
  onUploadClick?: (tip: BelgeTipi) => void;
}

// Icon mapping
const ICON_MAP: Record<string, React.ElementType> = {
  Table,
  BookOpen,
  FileSpreadsheet,
  FileText,
  Building2,
  Receipt,
  PieChart,
};

export function DonemVerileriPanel({ onUploadClick }: DonemVerileriPanelProps) {
  const { data, isLoading } = useDonemVerileri();
  const [expandedKategori, setExpandedKategori] = useState<BelgeKategorisiUI | null>(null);

  // Group belgeler by category
  const kategoriDurumu = useMemo(() => {
    const result: Record<BelgeKategorisiUI, {
      yuklenen: number;
      toplam: number;
      belgeler: BelgeDurumData[];
    }> = {} as Record<BelgeKategorisiUI, { yuklenen: number; toplam: number; belgeler: BelgeDurumData[] }>;

    // Initialize all categories
    for (const kategori of Object.keys(BELGE_KATEGORILERI_UI) as BelgeKategorisiUI[]) {
      result[kategori] = { yuklenen: 0, toplam: 0, belgeler: [] };
    }

    // Group belgeler
    for (const belge of data.belgeler) {
      const kategori = getKategoriFromBelgeTipi(belge.tip);
      if (kategori && result[kategori]) {
        result[kategori].belgeler.push(belge);
        result[kategori].toplam++;
        if (belge.durum === 'VAR') {
          result[kategori].yuklenen++;
        }
      }
    }

    return result;
  }, [data.belgeler]);

  const handleUploadClick = (tip: BelgeTipi) => {
    if (onUploadClick) {
      onUploadClick(tip);
    }
  };

  const handleKategoriClick = (kategori: BelgeKategorisiUI) => {
    const durum = kategoriDurumu[kategori];
    const tanim = BELGE_KATEGORILERI_UI[kategori];

    // If has uploaded documents, toggle expand
    if (durum.belgeler.some(b => b.durum === 'VAR')) {
      setExpandedKategori(prev => prev === kategori ? null : kategori);
    } else {
      // Otherwise trigger upload
      if (tanim.spikyTip && onUploadClick) {
        onUploadClick(tanim.spikyTip);
      }
    }
  };

  if (isLoading) {
    return (
      <Card title="Dönem Verileri" accent>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-lyntos-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  const zorunluKategoriler = getZorunluKategoriler();
  const opsiyonelKategoriler = getOpsiyonelKategoriler();

  return (
    <Card
      title="Dönem Verileri"
      subtitle={`%${data.tamamlanmaYuzdesi} tamamlandı`}
      headerAction={
        data.eksikSayisi > 0 && (
          <Badge variant="warning">{data.eksikSayisi} eksik</Badge>
        )
      }
      accent
    >
      <div className="space-y-4">
        {/* Progress Bar */}
        <div className="w-full bg-lyntos-bg-elevated rounded-full h-2 overflow-hidden">
          <div
            className="bg-lyntos-accent h-2 rounded-full transition-all duration-500"
            style={{ width: `${data.tamamlanmaYuzdesi}%` }}
          />
        </div>

        {/* Required Categories */}
        <div>
          <h4 className="text-xs font-medium text-lyntos-text-muted uppercase tracking-wide mb-2">
            GEREKLİ BELGELER
          </h4>
          <div className="space-y-2">
            {zorunluKategoriler.map(kategori => {
              const tanim = BELGE_KATEGORILERI_UI[kategori];
              const durum = kategoriDurumu[kategori];
              const IconComponent = ICON_MAP[tanim.icon] || FileText;
              const isExpanded = expandedKategori === kategori;
              const hasUploadedDocs = durum.belgeler.some(b => b.durum === 'VAR');
              const isComplete = durum.yuklenen > 0;

              return (
                <div key={kategori}>
                  {/* Category Row */}
                  <button
                    onClick={() => handleKategoriClick(kategori)}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 text-left
                      ${isComplete
                        ? 'bg-lyntos-success-bg/30 border-lyntos-success-muted hover:bg-lyntos-success-bg/40'
                        : 'bg-lyntos-risk-bg/30 border-lyntos-risk-muted hover:bg-lyntos-risk-bg/40'
                      }
                    `}
                  >
                    {/* Icon */}
                    <div className={`p-2 rounded-lg ${isComplete ? 'bg-lyntos-success-bg' : 'bg-lyntos-risk-bg'}`}>
                      <IconComponent className={`w-4 h-4 ${isComplete ? 'text-lyntos-success' : 'text-lyntos-risk'}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-lyntos-text-primary">{tanim.ad}</span>
                        <span className="text-lyntos-risk text-xs">*</span>
                      </div>
                      <p className="text-xs text-lyntos-text-muted truncate">{tanim.aciklama}</p>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      {isComplete ? (
                        <Badge variant="success">Yüklendi</Badge>
                      ) : (
                        <Badge variant="error">Eksik</Badge>
                      )}
                      {hasUploadedDocs && (
                        isExpanded
                          ? <ChevronDown className="w-4 h-4 text-lyntos-text-muted" />
                          : <ChevronRight className="w-4 h-4 text-lyntos-text-muted" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Document List */}
                  {isExpanded && hasUploadedDocs && (
                    <div className="ml-4 mt-2 pl-4 border-l-2 border-lyntos-border space-y-1 animate-fade-in">
                      {durum.belgeler.map(belge => (
                        <BelgeKarti
                          key={belge.tip}
                          belge={belge}
                          onUploadClick={handleUploadClick}
                          compact
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Optional Categories */}
        {opsiyonelKategoriler.length > 0 && (
          <details className="group">
            <summary className="text-xs font-medium text-lyntos-text-muted uppercase tracking-wide cursor-pointer hover:text-lyntos-text-secondary flex items-center gap-1">
              <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
              OPSİYONEL BELGELER (
              {opsiyonelKategoriler.reduce((acc, k) => acc + kategoriDurumu[k].yuklenen, 0)}/
              {opsiyonelKategoriler.reduce((acc, k) => acc + kategoriDurumu[k].toplam, 0)})
            </summary>
            <div className="mt-2 space-y-2">
              {opsiyonelKategoriler.map(kategori => {
                const tanim = BELGE_KATEGORILERI_UI[kategori];
                const durum = kategoriDurumu[kategori];
                const IconComponent = ICON_MAP[tanim.icon] || FileText;

                return (
                  <button
                    key={kategori}
                    onClick={() => handleKategoriClick(kategori)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg border border-lyntos-border
                               bg-lyntos-bg-elevated/50 hover:bg-lyntos-bg-elevated transition-colors text-left"
                  >
                    <IconComponent className="w-4 h-4 text-lyntos-text-muted" />
                    <span className="flex-1 text-sm text-lyntos-text-secondary">{tanim.ad}</span>
                    {durum.yuklenen > 0 && (
                      <Badge variant="success" size="sm">{durum.yuklenen}</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </details>
        )}

        {/* Stats Row */}
        <div className="flex gap-4 pt-3 border-t border-lyntos-border">
          <div className="flex-1 text-center">
            <span className="text-xl font-bold text-lyntos-success">{data.varSayisi}</span>
            <p className="text-xs text-lyntos-text-muted">Yüklendi</p>
          </div>
          <div className="flex-1 text-center">
            <span className="text-xl font-bold text-lyntos-risk">{data.eksikSayisi}</span>
            <p className="text-xs text-lyntos-text-muted">Eksik</p>
          </div>
          <div className="flex-1 text-center">
            <span className="text-xl font-bold text-lyntos-warning">{data.bekleyenSayisi}</span>
            <p className="text-xs text-lyntos-text-muted">Bekliyor</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
