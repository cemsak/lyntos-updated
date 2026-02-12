'use client';

import React, { useState } from 'react';
import { Stamp, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatNumber } from '../../../_lib/format';
import { API_ENDPOINTS } from '../../../_lib/config/api';
import { api } from '../../../_lib/api/client';

interface DamgaResult {
  tutar: number;
  belge_tipi: string;
  oran_binde: number;
  hesaplanan_vergi: number;
  tavan: number;
  tavan_asildi: boolean;
  odenecek_vergi: number;
}

const formatTL = (value: number) => formatNumber(value, 2);

const BELGE_TIPLERI = [
  { value: 'sozlesme', label: 'Sözleşme / Mukavele', aciklama: 'Binde 9,48' },
  { value: 'karar', label: 'Yönetim Kurulu / Genel Kurul Kararı', aciklama: 'Binde 9,48' },
  { value: 'kira_kontrati', label: 'Kira Kontratı', aciklama: 'Binde 9,48' },
  { value: 'maas_bordrosu', label: 'Maaş Bordrosu', aciklama: 'Binde 7,59' },
  { value: 'ihale', label: 'İhale Kararı', aciklama: 'Binde 9,48' },
  { value: 'taahhutname', label: 'Taahhütname', aciklama: 'Binde 9,48' },
];

export default function DamgaVergisiCalculator() {
  const [tutar, setTutar] = useState('');
  const [belgeTipi, setBelgeTipi] = useState('sozlesme');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DamgaResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hesapla = async () => {
    const tutarNum = parseFloat(tutar);
    if (!tutarNum) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const result = await api.post<DamgaResult>(API_ENDPOINTS.taxParams.calculateDamga, {
        tutar: tutarNum,
        belge_tipi: belgeTipi,
      });
      if (result.data) {
        setResult(result.data);
      } else {
        setError(result.error || 'Hesaplama başarısız');
      }
    } catch {
      setError('Hesaplama sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
      <h2 className="font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
        <Stamp className="w-5 h-5 text-[#0049AA]" />
        Damga Vergisi Hesaplama (488 SK)
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-[#5A5A5A] mb-1">
            Belge Tutarı (TL)
          </label>
          <input
            type="number"
            value={tutar}
            onChange={(e) => setTutar(e.target.value)}
            placeholder="Örn: 1000000"
            className="w-full px-4 py-2.5 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#0049AA] focus:border-[#0049AA]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#5A5A5A] mb-1">
            Belge Tipi
          </label>
          <select
            value={belgeTipi}
            onChange={(e) => setBelgeTipi(e.target.value)}
            className="w-full px-4 py-2.5 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#0049AA] focus:border-[#0049AA]"
          >
            {BELGE_TIPLERI.map((bt) => (
              <option key={bt.value} value={bt.value}>
                {bt.label} ({bt.aciklama})
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={hesapla}
            disabled={!tutar || loading}
            className="w-full px-6 py-2.5 bg-[#0049AA] text-white rounded-lg hover:bg-[#00287F] disabled:bg-[#B4B4B4] disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Hesapla
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-[#FEF2F2] border border-[#FFC7C9] rounded-lg p-3 text-sm text-[#BF192B] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#F5F6F8] rounded-lg p-4 text-center">
              <p className="text-sm text-[#5A5A5A] mb-1">Belge Tutarı</p>
              <p className="text-xl font-bold text-[#2E2E2E]">{formatTL(result.tutar)} TL</p>
              <p className="text-xs text-[#969696] mt-1">
                {BELGE_TIPLERI.find(b => b.value === result.belge_tipi)?.label || result.belge_tipi}
              </p>
            </div>

            <div className="bg-[#F5F6F8] rounded-lg p-4 text-center">
              <p className="text-sm text-[#5A5A5A] mb-1">Hesaplanan DV</p>
              <p className={`text-xl font-bold ${result.tavan_asildi ? 'text-[#BF192B] line-through' : 'text-[#2E2E2E]'}`}>
                {formatTL(result.hesaplanan_vergi)} TL
              </p>
              <p className="text-xs text-[#969696] mt-1">Binde {result.oran_binde}</p>
            </div>

            <div className={`rounded-lg p-4 text-center border-2 ${result.tavan_asildi ? 'bg-[#FFFBEB] border-[#FFF08C]' : 'bg-[#E6F9FF] border-[#5ED6FF]'}`}>
              <p className="text-sm text-[#5A5A5A] mb-1">Ödenecek DV</p>
              <p className="text-xl font-bold text-[#0049AA]">{formatTL(result.odenecek_vergi)} TL</p>
              {result.tavan_asildi && (
                <p className="text-xs text-[#FA841E] mt-1 flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Tavan uygulandı
                </p>
              )}
              {!result.tavan_asildi && (
                <p className="text-xs text-[#00804D] mt-1 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Tavan altında
                </p>
              )}
            </div>
          </div>

          {result.tavan_asildi && (
            <div className="mt-4 bg-[#FFFBEB] border border-[#FFF08C] rounded-lg p-3 text-sm text-[#FA841E]">
              <strong>Tavan Bilgisi:</strong> 2026 yılı damga vergisi üst sınırı {formatTL(result.tavan)} TL&apos;dir.
              Hesaplanan vergi tavanı aştığı için tavan tutarı uygulanmıştır.
            </div>
          )}

          <p className="text-xs text-[#969696] mt-4">
            * Bazı belgeler damga vergisinden istisna olabilir (teşvik belgeli yatırımlar, ihracat sözleşmeleri vb.).
            Detay için 488 sayılı DVK ve ekli listeleri inceleyiniz.
          </p>
        </div>
      )}
    </div>
  );
}
