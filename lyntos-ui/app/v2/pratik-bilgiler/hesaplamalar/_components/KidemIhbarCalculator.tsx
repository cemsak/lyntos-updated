'use client';

import React, { useState } from 'react';
import { Briefcase, Loader2 } from 'lucide-react';
import { formatNumber } from '../../../_lib/format';
import { API_ENDPOINTS } from '../../../_lib/config/api';
import { getAuthToken } from '../../../_lib/auth';

interface KidemResult {
  brut_ucret: number;
  ise_giris: string;
  cikis_tarihi: string;
  calisma_suresi: {
    yil: number;
    ay: number;
    gun: number;
    toplam_gun: number;
    toplam_yil_kesir: number;
  };
  kidem_tavani: number;
  tavan_uygulanadi: boolean;
  gunluk_ucret: number;
  tazminat_tutari: number;
  damga_vergisi: number;
  net_tazminat: number;
}

interface IhbarResult {
  brut_ucret: number;
  calisma_suresi_ay: number;
  ihbar_suresi_hafta: number;
  ihbar_suresi_gun: number;
  sure_aciklama: string;
  gunluk_ucret: number;
  tazminat_tutari: number;
  gelir_vergisi: number;
  damga_vergisi: number;
  sgk_isci: number;
  net_tazminat: number;
}

const formatTL = (value: number) => formatNumber(value, 2);

export default function KidemIhbarCalculator() {
  const [brutUcret, setBrutUcret] = useState('');
  const [iseGiris, setIseGiris] = useState('');
  const [cikisTarihi, setCikisTarihi] = useState('');
  const [loading, setLoading] = useState(false);
  const [kidemResult, setKidemResult] = useState<KidemResult | null>(null);
  const [ihbarResult, setIhbarResult] = useState<IhbarResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hesapla = async () => {
    const ucret = parseFloat(brutUcret);
    if (!ucret || !iseGiris || !cikisTarihi) return;

    setLoading(true);
    setError(null);
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    try {
      const [kidemRes, ihbarRes] = await Promise.all([
        fetch(API_ENDPOINTS.taxParams.calculateKidem, {
          method: 'POST',
          headers,
          body: JSON.stringify({ brut_ucret: ucret, ise_giris: iseGiris, cikis_tarihi: cikisTarihi }),
        }),
        fetch(API_ENDPOINTS.taxParams.calculateIhbar, {
          method: 'POST',
          headers,
          body: JSON.stringify({ brut_ucret: ucret, ise_giris: iseGiris, cikis_tarihi: cikisTarihi }),
        }),
      ]);

      const kidemJson = await kidemRes.json();
      const ihbarJson = await ihbarRes.json();

      if (kidemJson.success) setKidemResult(kidemJson.data);
      else setError(kidemJson.detail || 'Kıdem hesaplanamadı');

      if (ihbarJson.success) setIhbarResult(ihbarJson.data);
    } catch {
      setError('Hesaplama sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
      <h2 className="font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
        <Briefcase className="w-5 h-5 text-[#FA841E]" />
        Kıdem ve İhbar Tazminatı Hesaplama
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-[#5A5A5A] mb-1">
            Aylık Brüt Ücret (TL)
          </label>
          <input
            type="number"
            value={brutUcret}
            onChange={(e) => setBrutUcret(e.target.value)}
            placeholder="Örn: 45000"
            className="w-full px-4 py-2.5 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#FA841E] focus:border-[#FA841E]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#5A5A5A] mb-1">
            İşe Giriş Tarihi
          </label>
          <input
            type="date"
            value={iseGiris}
            onChange={(e) => setIseGiris(e.target.value)}
            className="w-full px-4 py-2.5 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#FA841E] focus:border-[#FA841E]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#5A5A5A] mb-1">
            İşten Çıkış Tarihi
          </label>
          <input
            type="date"
            value={cikisTarihi}
            onChange={(e) => setCikisTarihi(e.target.value)}
            className="w-full px-4 py-2.5 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#FA841E] focus:border-[#FA841E]"
          />
        </div>
      </div>

      <button
        onClick={hesapla}
        disabled={!brutUcret || !iseGiris || !cikisTarihi || loading}
        className="px-6 py-2.5 bg-[#FA841E] text-white rounded-lg hover:bg-[#E67324] disabled:bg-[#B4B4B4] disabled:cursor-not-allowed transition-colors flex items-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Hesapla
      </button>

      {error && (
        <div className="mt-4 bg-[#FEF2F2] border border-[#FFC7C9] rounded-lg p-3 text-sm text-[#BF192B]">
          {error}
        </div>
      )}

      {(kidemResult || ihbarResult) && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kıdem Tazminatı */}
          {kidemResult && (
            <div className="bg-[#FFFBEB] rounded-lg p-5">
              <h3 className="font-semibold text-[#E67324] mb-3">
                Kıdem Tazminatı (1475 SK Md. 14)
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#5A5A5A]">Çalışma Süresi</span>
                  <span className="font-medium">
                    {kidemResult.calisma_suresi.yil} yıl {kidemResult.calisma_suresi.ay} ay {kidemResult.calisma_suresi.gun} gün
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5A5A5A]">Kıdem Tavanı</span>
                  <span className="font-medium">{formatTL(kidemResult.kidem_tavani)} TL</span>
                </div>
                {kidemResult.tavan_uygulanadi && (
                  <div className="bg-[#FEF2F2] rounded px-2 py-1 text-[#BF192B] text-xs">
                    Tavan uygulandı — ücretiniz tavandan yüksek
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#5A5A5A]">Brüt Tazminat</span>
                  <span className="font-semibold text-[#FA841E]">{formatTL(kidemResult.tazminat_tutari)} TL</span>
                </div>
                <div className="flex justify-between text-[#BF192B]">
                  <span>(-) Damga Vergisi</span>
                  <span>{formatTL(kidemResult.damga_vergisi)} TL</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#FFF08C] font-bold">
                  <span className="text-[#E67324]">Net Tazminat</span>
                  <span className="text-[#FA841E] text-lg">{formatTL(kidemResult.net_tazminat)} TL</span>
                </div>
              </div>
            </div>
          )}

          {/* İhbar Tazminatı */}
          {ihbarResult && (
            <div className="bg-[#E6F9FF] rounded-lg p-5">
              <h3 className="font-semibold text-[#00287F] mb-3">
                İhbar Tazminatı (4857 SK Md. 17)
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#5A5A5A]">Çalışma Süresi</span>
                  <span className="font-medium">{ihbarResult.sure_aciklama}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5A5A5A]">İhbar Süresi</span>
                  <span className="font-medium">{ihbarResult.ihbar_suresi_hafta} hafta ({ihbarResult.ihbar_suresi_gun} gün)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5A5A5A]">Brüt Tazminat</span>
                  <span className="font-semibold text-[#0049AA]">{formatTL(ihbarResult.tazminat_tutari)} TL</span>
                </div>
                <div className="flex justify-between text-[#BF192B]">
                  <span>(-) Gelir Vergisi (%15)</span>
                  <span>{formatTL(ihbarResult.gelir_vergisi)} TL</span>
                </div>
                <div className="flex justify-between text-[#BF192B]">
                  <span>(-) SGK İşçi (%14)</span>
                  <span>{formatTL(ihbarResult.sgk_isci)} TL</span>
                </div>
                <div className="flex justify-between text-[#BF192B]">
                  <span>(-) Damga Vergisi</span>
                  <span>{formatTL(ihbarResult.damga_vergisi)} TL</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#ABEBFF] font-bold">
                  <span className="text-[#00287F]">Net Tazminat</span>
                  <span className="text-[#0049AA] text-lg">{formatTL(ihbarResult.net_tazminat)} TL</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-[#969696] mt-4">
        * Kıdem tazminatı gelir vergisinden istisnadır, yalnızca damga vergisi kesilir.
        İhbar tazminatı ise ücret gibi vergilendirilir (GV + SGK + DV).
      </p>
    </div>
  );
}
