'use client';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Table, BookOpen, FileSpreadsheet, FileText, Building2, Receipt, PieChart,
  ChevronDown, ChevronRight, Upload, Trash2, AlertCircle, X, ArrowRightLeft
} from 'lucide-react';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { BelgeKarti } from './BelgeKarti';
import { UploadPreviewCards } from './UploadPreviewCards';
import { DeleteDonemModal } from '../modals/DeleteDonemModal';
import type { BelgeTipi, BelgeKategorisiUI, BelgeDurumData } from './types';
import {
  BELGE_KATEGORILERI_UI,
  BELGE_TANIMLARI,
  getKategoriFromBelgeTipi,
  getZorunluKategoriler,
  getOpsiyonelKategoriler,
} from './types';
import { useDonemVerileriV2 } from './useDonemVerileriV2';
import { useDashboardScope } from '../scope/useDashboardScope';

interface DonemVerileriPanelProps {
  onUploadClick?: (tip: BelgeTipi) => void;
  onDeleteSuccess?: () => void;
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
  ArrowRightLeft,
};

export function DonemVerileriPanel({ onUploadClick, onDeleteSuccess }: DonemVerileriPanelProps) {
  // V2: Backend-only hook - localStorage kullanmaz
  const { data, isLoading, error, refetch } = useDonemVerileriV2();
  const [expandedKategori, setExpandedKategori] = useState<BelgeKategorisiUI | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEksikPopover, setShowEksikPopover] = useState(false);
  const eksikPopoverRef = useRef<HTMLDivElement>(null);

  // Dönem bilgisi için scope (backend-driven)
  const { scope } = useDashboardScope();

  // Eksik belgelerin detaylı listesi
  const eksikBelgeler = useMemo(() => {
    const eksikler: Array<{
      tip: BelgeTipi;
      ad: string;
      zorunlu: boolean;
      kategori: string;
    }> = [];

    for (const belge of data.belgeler) {
      if (belge.durum === 'EKSIK') {
        const tanim = BELGE_TANIMLARI[belge.tip];
        if (tanim) {
          eksikler.push({
            tip: belge.tip,
            ad: tanim.ad,
            zorunlu: tanim.zorunlu || tanim.gerekliMi || false,
            kategori: tanim.kategori,
          });
        }
      }
    }

    // Zorunlu olanlar önce
    return eksikler.sort((a, b) => {
      if (a.zorunlu && !b.zorunlu) return -1;
      if (!a.zorunlu && b.zorunlu) return 1;
      return 0;
    });
  }, [data.belgeler]);

  // Click outside to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (eksikPopoverRef.current && !eksikPopoverRef.current.contains(event.target as Node)) {
        setShowEksikPopover(false);
      }
    }
    if (showEksikPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEksikPopover]);

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
          <div className="w-6 h-6 border-2 border-[#0078D0] border-t-transparent rounded-full animate-spin" />
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
        <div className="flex items-center gap-2">
          {/* Eksik belgeler - tıklanabilir popover */}
          {data.eksikSayisi > 0 && (
            <div className="relative" ref={eksikPopoverRef}>
              <button
                onClick={() => setShowEksikPopover(!showEksikPopover)}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#FA841E] bg-[#FFFBEB] hover:bg-[#FFF08C] rounded-full transition-colors"
                title="Eksik belgeleri görüntüle"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                {data.eksikSayisi} eksik
              </button>

              {/* Eksik belgeler popover */}
              {showEksikPopover && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-[#E5E5E5] z-50 animate-fade-in">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5]">
                    <h4 className="text-sm font-semibold text-[#2E2E2E]">
                      Eksik Belgeler ({data.eksikSayisi})
                    </h4>
                    <button
                      onClick={() => setShowEksikPopover(false)}
                      className="p-1 hover:bg-[#F5F6F8] rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-[#969696]" />
                    </button>
                  </div>

                  {/* Eksik belge listesi */}
                  <div className="max-h-64 overflow-y-auto">
                    {eksikBelgeler.map((belge, idx) => (
                      <div
                        key={belge.tip}
                        className={`flex items-center gap-3 px-4 py-2.5 hover:bg-[#F5F6F8] ${
                          idx !== eksikBelgeler.length - 1 ? 'border-b border-[#F5F6F8]' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-[#5A5A5A] truncate">{belge.ad}</span>
                            {belge.zorunlu && (
                              <span className="flex-shrink-0 text-[10px] font-medium text-[#BF192B] bg-[#FEF2F2] px-1.5 py-0.5 rounded">
                                ZORUNLU
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-[#969696]">{belge.kategori}</span>
                        </div>
                        {onUploadClick && (
                          <button
                            onClick={() => {
                              onUploadClick(belge.tip);
                              setShowEksikPopover(false);
                            }}
                            className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#0049AA] hover:text-[#00287F] hover:bg-[#E6F9FF] rounded transition-colors"
                          >
                            <Upload className="w-3 h-3" />
                            Yükle
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Footer - zorunlu belge uyarısı */}
                  {eksikBelgeler.some(b => b.zorunlu) && (
                    <div className="px-4 py-2.5 bg-[#FEF2F2] border-t border-[#FEF2F2] rounded-b-lg">
                      <p className="text-xs text-[#BF192B]">
                        <strong>Uyarı:</strong> Zorunlu belgeler yüklenmeden tam analiz yapılamaz.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* Veri varsa silme butonu göster */}
          {data.varSayisi > 0 && scope.period && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#F0282D] hover:text-[#BF192B] hover:bg-[#FEF2F2] rounded transition-colors"
              title="Dönem verisini sil"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      }
      accent
    >
      <div className="space-y-4">
        {/* Upload Preview Cards - Analysis hints */}
        <UploadPreviewCards onUploadClick={onUploadClick} />

        {/* Progress Bar */}
        <div className="w-full bg-[#F5F6F8]-elevated rounded-full h-2 overflow-hidden">
          <div
            className="bg-[#0078D0] h-2 rounded-full transition-all duration-500"
            style={{ width: `${data.tamamlanmaYuzdesi}%` }}
          />
        </div>

        {/* Required Categories */}
        <div>
          <h4 className="text-xs font-medium text-[#969696] uppercase tracking-wide mb-2">
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
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleKategoriClick(kategori)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleKategoriClick(kategori); } }}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 text-left cursor-pointer
                      ${isComplete
                        ? 'bg-[#ECFDF5]/30 border-[#AAE8B8] hover:bg-[#ECFDF5]/40'
                        : 'bg-[#FEF2F2]/30 border-[#FFC7C9] hover:bg-[#FEF2F2]/40'
                      }
                    `}
                  >
                    {/* Icon */}
                    <div className={`p-2 rounded-lg ${isComplete ? 'bg-[#ECFDF5]' : 'bg-[#FEF2F2]'}`}>
                      <IconComponent className={`w-4 h-4 ${isComplete ? 'text-[#00804D]' : 'text-[#BF192B]'}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#2E2E2E]">{tanim.ad}</span>
                        <span className="text-[#BF192B] text-xs">*</span>
                      </div>
                      <p className="text-xs text-[#969696] truncate">{tanim.aciklama}</p>
                    </div>

                    {/* Status + Action Buttons */}
                    <div className="flex items-center gap-2">
                      {isComplete ? (
                        <>
                          <Badge variant="success">Yüklendi</Badge>
                          {tanim.spikyTip && onUploadClick && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUploadClick(tanim.spikyTip!);
                              }}
                              className="px-2 py-1 text-xs font-medium text-[#0049AA] hover:text-[#00287F] hover:bg-[#E6F9FF] rounded transition-colors"
                            >
                              Güncelle
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <Badge variant="error">Eksik</Badge>
                          {tanim.spikyTip && onUploadClick && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUploadClick(tanim.spikyTip!);
                              }}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-[#0049AA] hover:bg-[#0049AA] rounded transition-colors"
                            >
                              <Upload className="w-3 h-3" />
                              Yükle
                            </button>
                          )}
                        </>
                      )}
                      {hasUploadedDocs && (
                        isExpanded
                          ? <ChevronDown className="w-4 h-4 text-[#969696]" />
                          : <ChevronRight className="w-4 h-4 text-[#969696]" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Document List */}
                  {isExpanded && hasUploadedDocs && (
                    <div className="ml-4 mt-2 pl-4 border-l-2 border-[#E5E5E5] space-y-1 animate-fade-in">
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
            <summary className="text-xs font-medium text-[#969696] uppercase tracking-wide cursor-pointer hover:text-[#5A5A5A] flex items-center gap-1">
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
                const hasUploaded = durum.yuklenen > 0;

                return (
                  <div
                    key={kategori}
                    className="w-full flex items-center gap-3 p-2 rounded-lg border border-[#E5E5E5]
                               bg-[#F5F6F8]-elevated/50 hover:bg-[#F5F6F8]-elevated transition-colors"
                  >
                    <IconComponent className="w-4 h-4 text-[#969696]" />
                    <span className="flex-1 text-sm text-[#5A5A5A]">{tanim.ad}</span>
                    <div className="flex items-center gap-2">
                      {hasUploaded ? (
                        <>
                          <Badge variant="success" size="sm">{durum.yuklenen}</Badge>
                          {tanim.spikyTip && onUploadClick && (
                            <button
                              onClick={() => onUploadClick(tanim.spikyTip!)}
                              className="px-2 py-1 text-xs font-medium text-[#0049AA] hover:text-[#00287F] hover:bg-[#E6F9FF] rounded transition-colors"
                            >
                              Güncelle
                            </button>
                          )}
                        </>
                      ) : (
                        tanim.spikyTip && onUploadClick && (
                          <button
                            onClick={() => onUploadClick(tanim.spikyTip!)}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#5A5A5A] hover:text-[#0049AA] hover:bg-[#E6F9FF] rounded transition-colors"
                          >
                            <Upload className="w-3 h-3" />
                            Yükle
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        )}

        {/* Stats Row */}
        <div className="flex gap-4 pt-3 border-t border-[#E5E5E5]">
          <div className="flex-1 text-center">
            <span className="text-xl font-bold text-[#00804D]">{data.varSayisi}</span>
            <p className="text-xs text-[#969696]">Yüklendi</p>
          </div>
          <div className="flex-1 text-center">
            <span className="text-xl font-bold text-[#BF192B]">{data.eksikSayisi}</span>
            <p className="text-xs text-[#969696]">Eksik</p>
          </div>
          <div className="flex-1 text-center">
            <span className="text-xl font-bold text-[#FA841E]">{data.bekleyenSayisi}</span>
            <p className="text-xs text-[#969696]">Bekliyor</p>
          </div>
        </div>
      </div>

      {/* Delete Dönem Modal */}
      <DeleteDonemModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        period={scope.period || null}
        clientName={scope.client_id}
        onSuccess={() => {
          setShowDeleteModal(false);
          // Backend'den veriyi yeniden çek
          refetch();
          if (onDeleteSuccess) {
            onDeleteSuccess();
          }
        }}
      />
    </Card>
  );
}
