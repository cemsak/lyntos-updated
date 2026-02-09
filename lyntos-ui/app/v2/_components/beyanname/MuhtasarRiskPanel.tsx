'use client';

/**
 * Muhtasar Risk Kontrol Panel (Embeddable)
 *
 * Props-driven panel for Muhtasar risk analysis.
 * Used standalone at /v2/beyanname/muhtasar and as a tab in Q1 Özet.
 */

import { useState, useEffect } from 'react';
import {
  RefreshCw,
  FileText,
  Users,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { ScopeGuide } from '../shared/ScopeGuide';
import { API_BASE_URL } from '../../_lib/config/api';
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

interface MuhtasarBeyanname {
  id: number;
  period_id: string;
  donem_yil?: number;
  donem_ay?: number;
  matrah_toplam: number;
  hesaplanan_vergi: number;
  odenecek_vergi: number;
  source_file: string | null;
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

interface DonemKarsilastirma {
  ay: number;
  odenecek: number;
  onceki_ay_odenecek?: number;
  degisim_yuzde?: number;
  aciklama: string;
}

interface MuhtasarOzet {
  toplam_vergi: number;
  toplam_odenecek: number;
  donem_sayisi: number;
  aylik_ortalama: number;
}

interface MuhtasarRiskResponse {
  beyannameler: MuhtasarBeyanname[];
  ozet: MuhtasarOzet;
  risk_sinyalleri: RiskSignal[];
  capraz_kontroller: CaprazKontrol[];
  donem_karsilastirma: DonemKarsilastirma[];
}

// ─── Props ────────────────────────────────────────────────────────

interface MuhtasarRiskPanelProps {
  clientId: string;
  periodId: string;
}

// ─── Component ────────────────────────────────────────────────────

export function MuhtasarRiskPanel({ clientId, periodId }: MuhtasarRiskPanelProps) {
  const [data, setData] = useState<MuhtasarRiskResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!clientId || !periodId) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        client_id: clientId,
        period_id: periodId,
      });

      const response = await fetch(`${API_BASE_URL}/api/v2/beyanname/muhtasar?${params}`);

      if (!response.ok) {
        throw new Error(`API hatası: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setError(msg);
      console.error('Muhtasar risk kontrol fetch error:', err);
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
      <ScopeGuide variant="banner" description="Muhtasar beyanname analizi için üstteki menülerden bir mükellef ve dönem seçin." />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#2E2E2E]">Muhtasar Risk Kontrol</h2>
          <p className="text-sm text-[#969696] mt-0.5">
            {formatPeriod(periodId)} - Stopaj &amp; SGK Çapraz Kontrol
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
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-[#E5E5E5]">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-[#BF192B]" />
                <p className="text-sm text-[#969696]">Toplam Ödenecek</p>
              </div>
              <p className="text-2xl font-bold text-[#BF192B]">{formatCurrency(data.ozet.toplam_odenecek)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-[#E5E5E5]">
              <p className="text-sm text-[#969696] mb-1">Aylık Ortalama</p>
              <p className="text-xl font-bold text-[#2E2E2E]">{formatCurrency(data.ozet.aylik_ortalama)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-[#E5E5E5]">
              <p className="text-sm text-[#969696] mb-1">Hesaplanan Vergi</p>
              <p className="text-xl font-bold text-[#0049AA]">{formatCurrency(data.ozet.toplam_vergi)}</p>
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
                <h2 className="font-semibold text-[#2E2E2E]">Mizan-Muhtasar Çapraz Kontrol</h2>
              </div>
              <table className="w-full">
                <thead className="bg-[#F5F6F8] border-b border-[#E5E5E5]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#5A5A5A] uppercase">Kontrol</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#5A5A5A] uppercase">Mizan Hesap</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">Mizan</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">Beyanname</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">Oran / Fark</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[#5A5A5A] uppercase">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {data.capraz_kontroller.map((kontrol, idx) => (
                    <tr key={idx} className="hover:bg-[#F5F6F8]">
                      <td className="px-4 py-3">
                        <p className="text-sm text-[#2E2E2E]">{kontrol.kontrol_adi}</p>
                        <p className="text-xs text-[#969696] mt-0.5">{kontrol.mevzuat_ref}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#5A5A5A] font-mono">{kontrol.mizan_hesap}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(kontrol.mizan_degeri)}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(kontrol.beyanname_degeri)}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono">
                        {kontrol.fark_yuzde !== null && kontrol.fark_yuzde !== undefined ? (
                          <span className="text-[#0049AA]">%{kontrol.fark_yuzde.toFixed(1)}</span>
                        ) : (
                          <span className="text-[#E67324]">{formatCurrency(kontrol.fark)}</span>
                        )}
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

          {/* Dönem Karşılaştırma */}
          {data.donem_karsilastirma.length > 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-[#E5E5E5] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E5E5E5] bg-[#F5F6F8] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#0049AA]" />
                <h2 className="font-semibold text-[#2E2E2E]">Dönemler Arası Karşılaştırma</h2>
              </div>
              <div className="grid grid-cols-3 gap-4 p-6">
                {data.donem_karsilastirma.map((dk, idx) => (
                  <div key={idx} className="bg-[#F5F6F8] rounded-xl p-4">
                    <p className="text-sm font-medium text-[#2E2E2E] mb-2">{getMonthName(dk.ay)}</p>
                    <p className="text-lg font-bold text-[#2E2E2E]">{formatCurrency(dk.odenecek)}</p>
                    {dk.degisim_yuzde !== undefined && dk.degisim_yuzde !== null && (
                      <div className="flex items-center gap-1 mt-2">
                        {dk.degisim_yuzde > 0 ? (
                          <TrendingUp className="w-4 h-4 text-[#BF192B]" />
                        ) : dk.degisim_yuzde < 0 ? (
                          <TrendingDown className="w-4 h-4 text-[#00804D]" />
                        ) : null}
                        <span className={`text-sm font-medium ${
                          Math.abs(dk.degisim_yuzde) > 50
                            ? 'text-[#BF192B]'
                            : 'text-[#5A5A5A]'
                        }`}>
                          %{dk.degisim_yuzde > 0 ? '+' : ''}{dk.degisim_yuzde.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Beyanname Tablosu */}
          <div className="bg-white rounded-xl shadow-sm border border-[#E5E5E5] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E5E5] bg-[#F5F6F8]">
              <h2 className="font-semibold text-[#2E2E2E]">Aylık Muhtasar Beyannameleri</h2>
            </div>

            {data.beyannameler.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 text-[#B4B4B4] mx-auto mb-4" />
                <p className="text-[#969696]">
                  Bu dönem için muhtasar beyanname verisi bulunamadı.
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-[#F5F6F8] border-b border-[#E5E5E5]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#5A5A5A] uppercase">Dönem</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">Matrah</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">Hesaplanan Vergi</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">Ödenecek Vergi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {data.beyannameler.map((b) => (
                    <tr key={b.id} className="hover:bg-[#F5F6F8]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#FFFBEB] rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-[#FA841E]" />
                          </div>
                          <div>
                            <p className="font-medium text-[#2E2E2E]">
                              {b.donem_ay ? `${getMonthName(b.donem_ay)} ${b.donem_yil || ''}` : formatPeriod(b.period_id)}
                            </p>
                            <p className="text-xs text-[#969696]">{b.source_file || 'Kaynak dosya yok'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm text-[#5A5A5A]">
                        {b.matrah_toplam > 0 ? formatCurrency(b.matrah_toplam) : (
                          <span className="text-[#E67324]">Parse edilemedi</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm text-[#2E2E2E]">
                        {formatCurrency(b.hesaplanan_vergi)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm font-semibold text-[#BF192B]">
                        {formatCurrency(b.odenecek_vergi)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
