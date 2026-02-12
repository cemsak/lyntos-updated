'use client';
import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Shield,
  BookOpen,
  FileText,
  TrendingUp,
  TrendingDown,
  Loader2,
} from 'lucide-react';
import { Badge } from '../shared/Badge';
import { useDashboardScope } from '../scope/useDashboardScope';
import { ENDPOINTS_V2 } from '../contracts/endpoints';
import { api } from '../../_lib/api/client';
import { formatNumber } from '../../_lib/format';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface AltHesap {
  hesap_kodu: string;
  hesap_adi: string;
  borc: number;
  alacak: number;
  net_bakiye: number;
}

interface VdkRisk {
  kod: string;
  durum: 'kritik' | 'uyari';
  aciklama: string;
  mevzuat: string;
}

interface MevzuatRef {
  id: string;
  title_tr: string;
}

interface Davranis {
  bakiye_tutari: number;
  ciro_orani: number;
  durum: 'normal' | 'uyari' | 'kritik';
  yorum: string;
  ekstra?: Record<string, number>;
}

interface HesapKartiData {
  ok: boolean;
  client_id: string;
  period: string;
  hesap_kodu: string;
  hesap_adi: string;
  hesap_grubu: string;
  hesap_tipi: string;
  bakiye: number;
  oran_ciro: number;
  beklenen_bakiye_yonu: 'B' | 'A';
  yanlis_yon: boolean;
  yanlis_yon_aciklama: string | null;
  alt_hesaplar: AltHesap[];
  alt_hesap_sayisi: number;
  davranis: Davranis;
  vdk_risk: VdkRisk | null;
  mevzuat_refs: MevzuatRef[];
}

interface HesapKartiModalProps {
  isOpen: boolean;
  onClose: () => void;
  hesapKodu: string;
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function HesapKartiModal({ isOpen, onClose, hesapKodu }: HesapKartiModalProps) {
  const { scope } = useDashboardScope();
  const [data, setData] = useState<HesapKartiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAltHesaplar, setShowAltHesaplar] = useState(false);

  useEffect(() => {
    if (!isOpen || !hesapKodu) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setData(null);

      try {
        const url = ENDPOINTS_V2.MIZAN_HESAP_KARTI(scope.client_id, scope.period, hesapKodu);
        const { data: json, error: apiError, status: respStatus } = await api.get<HesapKartiData>(url);

        if (apiError || !json) {
          if (respStatus === 404) {
            setError('Bu hesap kodu için veri bulunamadı.');
          } else {
            setError(apiError || 'Hesap kartı verisi alınamadı');
          }
          setLoading(false);
          return;
        }

        setData(json);
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
          setError('Hesap detayları yüklenemedi. Lütfen tekrar deneyin.');
        } else {
          setError(`Veri yüklenemedi: ${msg}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, hesapKodu, scope.client_id, scope.period]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const durumRenk = (durum: string) => {
    switch (durum) {
      case 'kritik': return 'text-[#BF192B]';
      case 'uyari': return 'text-[#FA841E]';
      default: return 'text-[#00A651]';
    }
  };

  const durumBg = (durum: string) => {
    switch (durum) {
      case 'kritik': return 'bg-[#FEF2F2] border-[#FFC7C9]';
      case 'uyari': return 'bg-[#FFFBEB] border-[#FFF08C]';
      default: return 'bg-[#ECFDF5] border-[#AAE8B8]';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hesap-karti-modal-title"
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden max-h-[85vh] flex flex-col"
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between bg-[#F5F6F8] border-b border-[#E5E5E5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white border border-[#E5E5E5]">
              <FileText className="w-5 h-5 text-[#0049AA]" />
            </div>
            <div>
              <h2 id="hesap-karti-modal-title" className="text-lg font-bold text-[#2E2E2E]">
                Hesap Kartı: <span className="font-mono">{hesapKodu}</span>
              </h2>
              <p className="text-sm text-[#969696]">
                {data?.hesap_adi || 'Yükleniyor...'} | {scope.period}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#969696] hover:text-[#5A5A5A] p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#0049AA] animate-spin" />
              <span className="ml-3 text-sm text-[#969696]">Hesap kartı yükleniyor...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-[#FEF2F2] border border-[#FFC7C9] rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#BF192B]" />
                <p className="text-sm text-[#BF192B]">{error}</p>
              </div>
            </div>
          )}

          {data && (
            <>
              {/* Bakiye ve Durum */}
              <div className={`p-4 rounded-lg border-2 ${durumBg(data.davranis.durum)}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#969696] mb-1">Net Bakiye</p>
                    <p className={`text-2xl font-bold ${data.bakiye >= 0 ? 'text-[#2E2E2E]' : 'text-[#BF192B]'}`}>
                      {formatNumber(data.bakiye)} TL
                    </p>
                    <p className="text-xs text-[#5A5A5A] mt-1">
                      Ciro Oranı: <span className="font-mono font-semibold">%{data.oran_ciro.toFixed(1)}</span>
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant={data.davranis.durum === 'kritik' ? 'error' : data.davranis.durum === 'uyari' ? 'warning' : 'success'}>
                      {data.davranis.durum === 'kritik' ? 'Kritik' : data.davranis.durum === 'uyari' ? 'Uyarı' : 'Normal'}
                    </Badge>
                    <p className="text-xs text-[#969696]">
                      Beklenen: {data.beklenen_bakiye_yonu === 'B' ? 'Borç' : 'Alacak'} Bakiye
                    </p>
                  </div>
                </div>

                {/* Yanlış bakiye yönü uyarısı */}
                {data.yanlis_yon && data.yanlis_yon_aciklama && (
                  <div className="mt-3 p-2 bg-[#FEF2F2] border border-[#FF9196] rounded flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#BF192B] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[#BF192B]">{data.yanlis_yon_aciklama}</p>
                  </div>
                )}
              </div>

              {/* Grup Bilgisi */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-[#F5F6F8] rounded-lg">
                  <p className="text-[10px] text-[#969696] uppercase">Hesap Grubu</p>
                  <p className="text-sm font-medium text-[#2E2E2E]">{data.hesap_grubu}</p>
                </div>
                <div className="p-3 bg-[#F5F6F8] rounded-lg">
                  <p className="text-[10px] text-[#969696] uppercase">Alt Tip</p>
                  <p className="text-sm font-medium text-[#2E2E2E]">{data.hesap_tipi}</p>
                </div>
                <div className="p-3 bg-[#F5F6F8] rounded-lg">
                  <p className="text-[10px] text-[#969696] uppercase">Dönem</p>
                  <p className="text-sm font-medium text-[#2E2E2E]">{data.period}</p>
                </div>
              </div>

              {/* Davranış Analizi */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[#5A5A5A] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#0049AA]" />
                  Davranış Analizi
                </h3>
                <div className="p-3 bg-[#F5F6F8] rounded-lg">
                  <p className={`text-sm ${durumRenk(data.davranis.durum)}`}>{data.davranis.yorum}</p>
                  {data.davranis.ekstra && (
                    <div className="mt-2 flex gap-3 flex-wrap">
                      {Object.entries(data.davranis.ekstra).map(([key, value]) => (
                        <span key={key} className="text-xs bg-white px-2 py-1 rounded border border-[#E5E5E5]">
                          <span className="text-[#969696]">{key.replace(/_/g, ' ')}:</span>{' '}
                          <span className="font-mono font-semibold text-[#2E2E2E]">{typeof value === 'number' ? value.toFixed(2) : value}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* VDK Risk */}
              {data.vdk_risk && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-[#5A5A5A] flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#BF192B]" />
                    VDK Risk Bulgusu
                  </h3>
                  <div className={`p-3 rounded-lg border ${
                    data.vdk_risk.durum === 'kritik'
                      ? 'bg-[#FEF2F2] border-[#FFC7C9]'
                      : 'bg-[#FFFBEB] border-[#FFF08C]'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono bg-[#FEF2F2] text-[#BF192B] px-1.5 py-0.5 rounded">
                        {data.vdk_risk.kod}
                      </span>
                      <Badge variant={data.vdk_risk.durum === 'kritik' ? 'error' : 'warning'}>
                        {data.vdk_risk.durum === 'kritik' ? 'Kritik' : 'Uyarı'}
                      </Badge>
                    </div>
                    <p className="text-sm text-[#2E2E2E]">{data.vdk_risk.aciklama}</p>
                    <p className="text-xs text-[#5A5A5A] mt-1">Mevzuat: {data.vdk_risk.mevzuat}</p>
                  </div>
                </div>
              )}

              {/* Mevzuat Referansları */}
              {data.mevzuat_refs.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-[#5A5A5A] flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#00804D]" />
                    Mevzuat Referansları
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {data.mevzuat_refs.map((ref, i) => (
                      <span
                        key={i}
                        className="text-xs bg-[#E6F9FF] text-[#0049AA] px-2 py-1 rounded border border-[#ABEBFF]"
                      >
                        {ref.title_tr}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Alt Hesaplar */}
              {data.alt_hesap_sayisi > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowAltHesaplar(!showAltHesaplar)}
                    className="flex items-center gap-2 text-sm font-semibold text-[#5A5A5A] hover:text-[#2E2E2E]"
                  >
                    {showAltHesaplar ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    Alt Hesaplar ({data.alt_hesap_sayisi})
                  </button>

                  {showAltHesaplar && (
                    <div className="overflow-x-auto border border-[#E5E5E5] rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-[#F5F6F8]">
                          <tr>
                            <th className="text-left p-2 font-medium text-[#5A5A5A] text-xs">Hesap</th>
                            <th className="text-right p-2 font-medium text-[#5A5A5A] text-xs">Borç</th>
                            <th className="text-right p-2 font-medium text-[#5A5A5A] text-xs">Alacak</th>
                            <th className="text-right p-2 font-medium text-[#5A5A5A] text-xs">Net Bakiye</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E5E5]">
                          {data.alt_hesaplar.map((alt, i) => (
                            <tr key={i} className="hover:bg-[#F5F6F8]">
                              <td className="p-2">
                                <p className="font-mono text-xs text-[#969696]">{alt.hesap_kodu}</p>
                                <p className="text-xs text-[#2E2E2E]">{alt.hesap_adi}</p>
                              </td>
                              <td className="p-2 text-right font-mono text-xs text-[#5A5A5A]">
                                {formatNumber(alt.borc)}
                              </td>
                              <td className="p-2 text-right font-mono text-xs text-[#5A5A5A]">
                                {formatNumber(alt.alacak)}
                              </td>
                              <td className="p-2 text-right">
                                <span className={`font-mono text-xs font-medium ${
                                  alt.net_bakiye >= 0 ? 'text-[#2E2E2E]' : 'text-[#BF192B]'
                                }`}>
                                  {formatNumber(alt.net_bakiye)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E5E5E5] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#2E2E2E] text-white rounded-lg hover:bg-[#5A5A5A] transition-colors text-sm"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
