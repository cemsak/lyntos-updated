'use client';

import React, { useState } from 'react';
import { Clock, Loader2, AlertTriangle } from 'lucide-react';
import { formatNumber } from '../../../_lib/format';
import { API_ENDPOINTS } from '../../../_lib/config/api';
import { api } from '../../../_lib/api/client';

interface DonemDetay {
  donem_baslangic: string;
  donem_bitis: string;
  oran_aylik: number;
  gun_sayisi: number;
  faiz_tutari: number;
}

interface GecikmeResult {
  ana_para: number;
  baslangic: string;
  bitis: string;
  gun_sayisi: number;
  donem_detaylari: DonemDetay[];
  toplam_faiz: number;
  toplam_odeme: number;
}

const formatTL = (value: number) => formatNumber(value, 2);

const formatDateTR = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function DetayliGecikmeCalculator() {
  const [anaPara, setAnaPara] = useState('');
  const [vadeTarihi, setVadeTarihi] = useState('');
  const [odemeTarihi, setOdemeTarihi] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GecikmeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hesapla = async () => {
    const para = parseFloat(anaPara);
    if (!para || !vadeTarihi || !odemeTarihi) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.post<GecikmeResult>(API_ENDPOINTS.taxParams.calculateGecikme, {
        ana_para: para,
        baslangic_tarihi: vadeTarihi,
        bitis_tarihi: odemeTarihi,
      });
      if (res.data) {
        setResult(res.data);
      } else {
        setError(res.error || 'Hesaplama başarısız');
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
        <Clock className="w-5 h-5 text-[#BF192B]" />
        Detaylı Gecikme Faizi / Zammı Hesaplama
      </h2>
      <p className="text-sm text-[#5A5A5A] mb-4">
        6183 SK Md. 51 (Gecikme Zammı) &amp; VUK Md. 112 (Gecikme Faizi) — Dönem bazlı farklı oranlarla hesaplama
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-[#5A5A5A] mb-1">
            Ana Para / Vergi Borcu (TL)
          </label>
          <input
            type="number"
            value={anaPara}
            onChange={(e) => setAnaPara(e.target.value)}
            placeholder="Örn: 100000"
            className="w-full px-4 py-2.5 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#BF192B] focus:border-[#BF192B]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#5A5A5A] mb-1">
            Vade Tarihi (Başlangıç)
          </label>
          <input
            type="date"
            value={vadeTarihi}
            onChange={(e) => setVadeTarihi(e.target.value)}
            className="w-full px-4 py-2.5 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#BF192B] focus:border-[#BF192B]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#5A5A5A] mb-1">
            Ödeme Tarihi (Bitiş)
          </label>
          <input
            type="date"
            value={odemeTarihi}
            onChange={(e) => setOdemeTarihi(e.target.value)}
            className="w-full px-4 py-2.5 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#BF192B] focus:border-[#BF192B]"
          />
        </div>
      </div>

      <button
        onClick={hesapla}
        disabled={!anaPara || !vadeTarihi || !odemeTarihi || loading}
        className="px-6 py-2.5 bg-[#BF192B] text-white rounded-lg hover:bg-[#980F30] disabled:bg-[#B4B4B4] disabled:cursor-not-allowed transition-colors flex items-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Hesapla
      </button>

      {error && (
        <div className="mt-4 bg-[#FEF2F2] border border-[#FFC7C9] rounded-lg p-3 text-sm text-[#BF192B] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6">
          {/* Özet Kartlar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#F5F6F8] rounded-lg p-4 text-center">
              <p className="text-sm text-[#5A5A5A]">Ana Para</p>
              <p className="text-xl font-bold text-[#2E2E2E]">{formatTL(result.ana_para)} TL</p>
            </div>
            <div className="bg-[#F5F6F8] rounded-lg p-4 text-center">
              <p className="text-sm text-[#5A5A5A]">Geciken Gün</p>
              <p className="text-xl font-bold text-[#2E2E2E]">{result.gun_sayisi} gün</p>
            </div>
            <div className="bg-[#FEF2F2] rounded-lg p-4 text-center">
              <p className="text-sm text-[#BF192B]">Toplam Faiz/Zam</p>
              <p className="text-xl font-bold text-[#BF192B]">{formatTL(result.toplam_faiz)} TL</p>
            </div>
            <div className="bg-[#E6F9FF] rounded-lg p-4 text-center border-2 border-[#5ED6FF]">
              <p className="text-sm text-[#0049AA]">Toplam Ödeme</p>
              <p className="text-xl font-bold text-[#0049AA]">{formatTL(result.toplam_odeme)} TL</p>
            </div>
          </div>

          {/* Dönem Kırılım Tablosu */}
          {result.donem_detaylari.length > 0 && (
            <div className="overflow-x-auto">
              <h3 className="font-medium text-[#2E2E2E] mb-2">Dönem Bazlı Kırılım</h3>
              <table className="w-full text-sm">
                <thead className="bg-[#F5F6F8]">
                  <tr>
                    <th className="px-3 py-2 text-left">Dönem</th>
                    <th className="px-3 py-2 text-center">Aylık Oran</th>
                    <th className="px-3 py-2 text-center">Gün</th>
                    <th className="px-3 py-2 text-right">Faiz Tutarı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {result.donem_detaylari.map((d, i) => (
                    <tr key={i} className="hover:bg-[#F5F6F8]">
                      <td className="px-3 py-2">
                        {formatDateTR(d.donem_baslangic)} — {formatDateTR(d.donem_bitis)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="px-2 py-0.5 bg-[#FFFBEB] text-[#FA841E] rounded font-medium">
                          %{d.oran_aylik}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">{d.gun_sayisi}</td>
                      <td className="px-3 py-2 text-right font-medium text-[#BF192B]">
                        {formatTL(d.faiz_tutari)} TL
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#FEF2F2] font-semibold">
                    <td className="px-3 py-2">TOPLAM</td>
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2 text-center">{result.gun_sayisi}</td>
                    <td className="px-3 py-2 text-right text-[#BF192B]">{formatTL(result.toplam_faiz)} TL</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-[#969696] mt-4">
            * Hesaplama dönem bazlı farklı oranlar uygulanarak yapılmıştır.
            Kesin tutar için vergi dairesine başvurunuz.
          </p>
        </div>
      )}
    </div>
  );
}
