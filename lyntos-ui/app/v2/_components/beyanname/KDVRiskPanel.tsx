'use client';

/**
 * KDV Risk Kontrol Panel (Embeddable)
 *
 * Props-driven panel for KDV risk analysis.
 * Used standalone at /v2/beyanname/kdv and as a tab in Q1 Özet.
 */

import { useState, useEffect } from 'react';
import {
  RefreshCw,
  FileText,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { ScopeGuide } from '../shared/ScopeGuide';
import { api } from '../../_lib/api/client';
import { formatCurrency as formatCurrencyCentral, formatPeriod as formatPeriodCentral } from '../../_lib/format';

// ─── Types ────────────────────────────────────────────────────────

interface RiskSignal {
  kod: string;
  baslik: string;
  aciklama: string;
  severity: 'bilgi' | 'uyari' | 'kritik';
  mevzuat_ref?: string;
  mizan_degeri?: number;
  beyanname_degeri?: number;
  fark?: number;
  fark_yuzde?: number;
}

interface KDVBeyanname {
  id: number;
  donem_yil?: number;
  donem_ay?: number;
  period_id: string;
  matrah: number;
  hesaplanan_kdv: number;
  indirilecek_kdv: number;
  odenecek_kdv: number;
  devreden_kdv: number;
  source_file: string | null;
  beyanname_tarihi: string | null;
}

interface FormulDogrulama {
  ay: number;
  hesaplanan: number;
  indirilecek: number;
  beklenen_odenecek: number;
  gercek_odenecek: number;
  beklenen_devreden: number;
  gercek_devreden: number;
  formul_tutarli: boolean;
  aciklama: string;
}

interface CaprazKontrol {
  kontrol_adi: string;
  mizan_hesap: string;
  mizan_degeri: number;
  beyanname_degeri: number;
  fark: number;
  fark_yuzde?: number;
  tolerans_icinde: boolean;
  aciklama: string;
  mevzuat_ref: string;
}

interface KDVOzet {
  toplam_matrah: number;
  toplam_hesaplanan_kdv: number;
  toplam_indirilecek_kdv: number;
  son_devreden_kdv: number;
  donem_sayisi: number;
}

interface KDVRiskResponse {
  beyannameler: KDVBeyanname[];
  ozet: KDVOzet;
  risk_sinyalleri: RiskSignal[];
  formul_dogrulama: FormulDogrulama[];
  capraz_kontroller: CaprazKontrol[];
}

// ─── Props ────────────────────────────────────────────────────────

interface KDVRiskPanelProps {
  clientId: string;
  periodId: string;
}

// ─── Component ────────────────────────────────────────────────────

export function KDVRiskPanel({ clientId, periodId }: KDVRiskPanelProps) {
  const [data, setData] = useState<KDVRiskResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!clientId || !periodId) return;

    setLoading(true);
    setError(null);
    try {
      const { data: result, error: apiError } = await api.get<KDVRiskResponse>(
        '/api/v2/beyanname/kdv',
        { params: { client_id: clientId, period_id: periodId } }
      );

      if (apiError || !result) {
        throw new Error(apiError || 'KDV verisi alınamadı');
      }

      setData(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setError(msg);
      console.error('KDV risk kontrol fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId && periodId) {
      fetchData();
    } else {
      setData(null);
    }
  }, [clientId, periodId]);

  const formatCurrency = (val: number) => formatCurrencyCentral(val || 0);

  const formatPeriod = (period: string) => {
    if (!period) return '';
    const match = period.match(/(\d{4})-Q(\d)/);
    if (match) return `Q${match[2]} ${match[1]}`;
    return formatPeriodCentral(period);
  };

  const getMonthName = (ay: number) => {
    const months = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return months[ay] || `Ay ${ay}`;
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'kritik': return <XCircle className="w-5 h-5 text-[#BF192B]" />;
      case 'uyari': return <AlertTriangle className="w-5 h-5 text-[#E67324]" />;
      default: return <CheckCircle2 className="w-5 h-5 text-[#00804D]" />;
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'kritik': return 'bg-[#FEF2F2] border-[#FECACA]';
      case 'uyari': return 'bg-[#FFFBEB] border-[#FDE68A]';
      default: return 'bg-[#ECFDF5] border-[#A7F3D0]';
    }
  };

  // No scope selected
  if (!clientId || !periodId) {
    return (
      <ScopeGuide variant="banner" description="KDV beyanname analizi için üstteki menülerden bir mükellef ve dönem seçin." />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#2E2E2E]">KDV Risk Kontrol</h2>
          <p className="text-sm text-[#969696] mt-0.5">
            {formatPeriod(periodId)} - Mizan-Beyanname Çapraz Kontrol &amp; Formül Doğrulama
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm text-[#5A5A5A] hover:text-[#2E2E2E] border border-[#B4B4B4] rounded-lg hover:bg-[#F5F6F8] disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-[#BF192B]" />
            <p className="text-[#BF192B] font-medium">Hata: {error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="p-12 text-center">
          <RefreshCw className="w-8 h-8 text-[#0078D0] animate-spin mx-auto mb-4" />
          <p className="text-[#969696]">Risk kontrol analizi yapılıyor...</p>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Özet Kartları */}
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-white rounded-xl p-4 border border-[#E5E5E5]">
              <p className="text-sm text-[#969696] mb-1">Toplam Matrah</p>
              <p className="text-xl font-bold text-[#2E2E2E]">{formatCurrency(data.ozet.toplam_matrah)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-[#E5E5E5]">
              <p className="text-sm text-[#969696] mb-1">Hesaplanan KDV</p>
              <p className="text-xl font-bold text-[#0049AA]">{formatCurrency(data.ozet.toplam_hesaplanan_kdv)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-[#E5E5E5]">
              <p className="text-sm text-[#969696] mb-1">İndirilecek KDV</p>
              <p className="text-xl font-bold text-[#00804D]">{formatCurrency(data.ozet.toplam_indirilecek_kdv)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-[#E5E5E5]">
              <p className="text-sm text-[#969696] mb-1">Son Devreden KDV</p>
              <p className="text-xl font-bold text-[#0049AA]">{formatCurrency(data.ozet.son_devreden_kdv)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-[#E5E5E5]">
              <p className="text-sm text-[#969696] mb-1">Beyanname Sayısı</p>
              <p className="text-xl font-bold text-[#2E2E2E]">{data.ozet.donem_sayisi}</p>
            </div>
          </div>

          {/* Risk Sinyalleri */}
          {data.risk_sinyalleri.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-[#E5E5E5] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E5E5E5] bg-[#F5F6F8] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#0049AA]" />
                <h2 className="font-semibold text-[#2E2E2E]">Risk Sinyalleri</h2>
                <span className="ml-auto text-sm text-[#969696]">
                  {data.risk_sinyalleri.filter(s => s.severity === 'kritik').length} kritik,{' '}
                  {data.risk_sinyalleri.filter(s => s.severity === 'uyari').length} uyarı
                </span>
              </div>
              <div className="divide-y divide-[#E5E5E5]">
                {data.risk_sinyalleri.map((sinyal, idx) => (
                  <div key={idx} className={`p-4 border-l-4 ${getSeverityBg(sinyal.severity)}`}>
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(sinyal.severity)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-[#2E2E2E]">{sinyal.baslik}</span>
                          <span className="text-xs text-[#969696] font-mono">[{sinyal.kod}]</span>
                        </div>
                        <p className="text-sm text-[#5A5A5A]">{sinyal.aciklama}</p>
                        {sinyal.mevzuat_ref && (
                          <p className="text-xs text-[#0049AA] mt-1">{sinyal.mevzuat_ref}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Çapraz Kontrol Tablosu */}
          {data.capraz_kontroller.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-[#E5E5E5] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E5E5E5] bg-[#F5F6F8] flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-[#0049AA]" />
                <h2 className="font-semibold text-[#2E2E2E]">Mizan-Beyanname Çapraz Kontrol</h2>
              </div>
              <table className="w-full">
                <thead className="bg-[#F5F6F8] border-b border-[#E5E5E5]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#5A5A5A] uppercase">Kontrol</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#5A5A5A] uppercase">Mizan Hesap</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">Mizan</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">Beyanname</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">Fark</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[#5A5A5A] uppercase">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {data.capraz_kontroller.map((kontrol, idx) => (
                    <tr key={idx} className="hover:bg-[#F5F6F8]">
                      <td className="px-4 py-3 text-sm text-[#2E2E2E]">{kontrol.kontrol_adi}</td>
                      <td className="px-4 py-3 text-sm text-[#5A5A5A] font-mono">{kontrol.mizan_hesap}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(kontrol.mizan_degeri)}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(kontrol.beyanname_degeri)}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono">
                        <span className={kontrol.fark === 0 ? 'text-[#969696]' : 'text-[#E67324]'}>
                          {formatCurrency(kontrol.fark)}
                          {kontrol.fark_yuzde !== null && kontrol.fark_yuzde !== undefined && (
                            <span className="text-xs ml-1">(%{Math.abs(kontrol.fark_yuzde).toFixed(1)})</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {kontrol.tolerans_icinde ? (
                          <CheckCircle2 className="w-5 h-5 text-[#00804D] mx-auto" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-[#E67324] mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Formül Doğrulama */}
          {data.formul_dogrulama.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-[#E5E5E5] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E5E5E5] bg-[#F5F6F8] flex items-center gap-2">
                <Info className="w-5 h-5 text-[#0049AA]" />
                <h2 className="font-semibold text-[#2E2E2E]">KDV Formül Doğrulama (KDVK Md. 29)</h2>
                <span className="ml-auto text-xs text-[#969696]">Ödenecek = Hesaplanan - İndirilecek</span>
              </div>
              <table className="w-full">
                <thead className="bg-[#F5F6F8] border-b border-[#E5E5E5]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#5A5A5A] uppercase">Dönem</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">Hesaplanan</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">İndirilecek</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">Beklenen Ödenecek</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">Gerçek Ödenecek</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">Devreden</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[#5A5A5A] uppercase">Tutarlı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {data.formul_dogrulama.map((f, idx) => (
                    <tr key={idx} className={`hover:bg-[#F5F6F8] ${!f.formul_tutarli ? 'bg-[#FFFBEB]' : ''}`}>
                      <td className="px-4 py-3 text-sm font-medium text-[#2E2E2E]">{getMonthName(f.ay)}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(f.hesaplanan)}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(f.indirilecek)}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(f.beklenen_odenecek)}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(f.gercek_odenecek)}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(f.gercek_devreden)}</td>
                      <td className="px-4 py-3 text-center">
                        {f.formul_tutarli ? (
                          <CheckCircle2 className="w-5 h-5 text-[#00804D] mx-auto" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-[#E67324] mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Aylık Beyanname Listesi */}
          {data.beyannameler.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-[#E5E5E5] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E5E5E5] bg-[#F5F6F8]">
                <h2 className="font-semibold text-[#2E2E2E]">Aylık KDV Beyannameleri</h2>
              </div>
              <div className="divide-y divide-[#E5E5E5]">
                {data.beyannameler.map((b) => (
                  <div key={b.id} className="p-6 hover:bg-[#F5F6F8]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#E6F9FF] rounded-xl flex items-center justify-center">
                          <FileText className="w-6 h-6 text-[#0049AA]" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-[#2E2E2E]">
                            {b.donem_ay ? `${getMonthName(b.donem_ay)} ${b.donem_yil || ''}` : formatPeriod(b.period_id)}
                          </h3>
                          <p className="text-sm text-[#969696]">{b.source_file || 'Kaynak dosya yok'}</p>
                        </div>
                      </div>
                      {b.odenecek_kdv > 0 ? (
                        <span className="px-3 py-1 text-sm font-medium text-[#BF192B] bg-[#FEF2F2] rounded-full">
                          Ödenecek
                        </span>
                      ) : (
                        <span className="px-3 py-1 text-sm font-medium text-[#00804D] bg-[#ECFDF5] rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          Devreden
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-5 gap-4">
                      <div className="bg-[#F5F6F8] rounded-lg p-3">
                        <p className="text-xs text-[#969696] mb-1">Matrah</p>
                        <p className="text-sm font-semibold text-[#2E2E2E]">{formatCurrency(b.matrah)}</p>
                      </div>
                      <div className="bg-[#E6F9FF] rounded-lg p-3">
                        <div className="flex items-center gap-1 mb-1">
                          <TrendingUp className="w-3 h-3 text-[#0078D0]" />
                          <p className="text-xs text-[#0049AA]">Hesaplanan</p>
                        </div>
                        <p className="text-sm font-semibold text-[#0049AA]">{formatCurrency(b.hesaplanan_kdv)}</p>
                      </div>
                      <div className="bg-[#ECFDF5] rounded-lg p-3">
                        <div className="flex items-center gap-1 mb-1">
                          <TrendingDown className="w-3 h-3 text-[#00A651]" />
                          <p className="text-xs text-[#00804D]">İndirilecek</p>
                        </div>
                        <p className="text-sm font-semibold text-[#00804D]">{formatCurrency(b.indirilecek_kdv)}</p>
                      </div>
                      <div className="flex items-center justify-center">
                        <ArrowRight className="w-5 h-5 text-[#969696]" />
                      </div>
                      <div className={`rounded-lg p-3 ${b.odenecek_kdv > 0 ? 'bg-[#FEF2F2]' : 'bg-[#E6F9FF]'}`}>
                        <p className="text-xs mb-1" style={{ color: b.odenecek_kdv > 0 ? '#BF192B' : '#00287F' }}>
                          {b.odenecek_kdv > 0 ? 'Ödenecek' : 'Devreden'}
                        </p>
                        <p className="text-sm font-semibold" style={{ color: b.odenecek_kdv > 0 ? '#BF192B' : '#00287F' }}>
                          {formatCurrency(b.odenecek_kdv > 0 ? b.odenecek_kdv : b.devreden_kdv)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Veri yoksa */}
          {data.beyannameler.length === 0 && !loading && (
            <div className="bg-white rounded-xl shadow-sm border border-[#E5E5E5] p-12 text-center">
              <FileText className="w-12 h-12 text-[#B4B4B4] mx-auto mb-4" />
              <p className="text-[#969696]">
                Bu dönem için KDV beyanname verisi bulunamadı. Beyanname PDF&apos;leri yüklenmediyse
                Veri Yükleme sayfasından yükleyebilirsiniz.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
