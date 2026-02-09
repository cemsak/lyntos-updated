'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Calculator, CheckCircle2, TrendingDown, AlertTriangle } from 'lucide-react';
import { formatNumber } from '../../_lib/format';
import { useTaxParams, paramValue } from '../_hooks/useTaxParams';

export default function GecikmePage() {
  const { data: params, isLoading, error } = useTaxParams('gecikme_oranlari');

  // Guncel oranlar: valid_until is null (aktif)
  const gecikmeOranlari = useMemo(() =>
    params.filter(p => p.valid_until === null),
    [params]
  );

  // Tarihce: valid_until is NOT null (gecmis donemler)
  const gecikmeZammiTarihce = useMemo(() => {
    const historicalItems = params.filter(p => p.valid_until !== null);
    // Her param_key + valid_from kombinasyonundan yil cikar
    const byYear = new Map<number, number>();
    for (const p of historicalItems) {
      const yil = new Date(p.valid_from).getFullYear();
      // gecikme-zammi/gecikme_zammi key'li olani tarihce icin kullan
      if (p.param_key.includes('zamm') || p.param_key.includes('gecikme')) {
        byYear.set(yil, paramValue(p));
      }
    }
    return Array.from(byYear.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([yil, oran]) => ({ yil, oran }));
  }, [params]);

  // Guncel gecikme zammi oranini hesaplama icin bul
  const guncelAylikOran = useMemo(() => {
    const zammiParam = gecikmeOranlari.find(p =>
      p.param_key.includes('zamm') || p.param_key === 'gecikme-zammi'
    );
    return zammiParam ? paramValue(zammiParam) : 3.5;
  }, [gecikmeOranlari]);

  // Hesaplama state'leri
  const [anaParaStr, setAnaPara] = useState('');
  const [gunStr, setGun] = useState('');
  const [sonuc, setSonuc] = useState<{faiz: number; zammi: number; toplam: number} | null>(null);

  const anaPara = parseFloat(anaParaStr.replace(/\./g, '').replace(',', '.')) || 0;
  const gun = parseInt(gunStr) || 0;

  // 2 decimals wrapper using central formatNumber
  const formatTL = (value: number) => formatNumber(value, 2);

  const hesapla = () => {
    if (anaPara <= 0 || gun <= 0) return;

    // Gecikme zammi: API'den gelen aylik oran
    const aylikOran = guncelAylikOran / 100;
    const gunlukOran = aylikOran / 30;

    const gecikmeZammi = anaPara * gunlukOran * gun;
    const gecikmeFaizi = anaPara * gunlukOran * gun; // Ayni oran

    setSonuc({
      faiz: gecikmeFaizi,
      zammi: gecikmeZammi,
      toplam: anaPara + gecikmeZammi
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/v2/pratik-bilgiler"
          className="flex items-center gap-2 px-3 py-2 text-sm text-[#5A5A5A] hover:text-[#2E2E2E] hover:bg-[#F5F6F8] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Geri
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#2E2E2E]">Gecikme Faizi ve Zammı</h1>
          <p className="text-[#5A5A5A]">Vergi borçlarında gecikme faizi/zammı hesaplaması</p>
        </div>
      </div>

      {/* Guncellik Bildirimi */}
      <div className="bg-[#ECFDF5] border border-[#AAE8B8] rounded-lg p-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-[#00804D] mt-0.5" />
        <div>
          <p className="font-medium text-[#005A46]">2026 Yılı Güncel Oranlar</p>
          <p className="text-sm text-[#00804D]">Kaynak: 6183 sayılı Kanun — Güncel mevzuata göre düzenli güncellenmektedir.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0049AA]"></div>
        </div>
      ) : error ? (
        <div className="bg-[#FEF2F2] border border-[#FFC7C9] rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#BF192B] mt-0.5" />
          <div>
            <p className="font-medium text-[#980F30]">Veri yüklenemedi</p>
            <p className="text-sm text-[#BF192B]">{error}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Guncel Oranlar */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#FA841E]" />
              Güncel Oranlar (2026)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {gecikmeOranlari.map(oran => (
                <div key={oran.id} className="bg-[#FFFBEB] rounded-lg p-4 text-center">
                  <p className="text-sm text-[#FA841E] mb-1">{oran.description ?? oran.param_key}</p>
                  <p className="text-3xl font-bold text-[#FA841E]">{oran.param_unit}{paramValue(oran)}</p>
                  <p className="text-xs text-[#FFB114] mt-1">{oran.legal_reference ?? ''}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hesaplama Araci */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#0049AA]" />
              Gecikme Zammı Hesaplama
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-[#5A5A5A] mb-1">
                  Ana Para (TL)
                </label>
                <input
                  type="text"
                  value={anaParaStr}
                  onChange={(e) => setAnaPara(e.target.value)}
                  placeholder="100.000"
                  className="w-full px-4 py-2 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#0078D0] focus:border-[#0078D0]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5A5A5A] mb-1">
                  Geciken Gün Sayısı
                </label>
                <input
                  type="number"
                  value={gunStr}
                  onChange={(e) => setGun(e.target.value)}
                  placeholder="30"
                  className="w-full px-4 py-2 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#0078D0] focus:border-[#0078D0]"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={hesapla}
                  disabled={anaPara <= 0 || gun <= 0}
                  className="w-full px-4 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#0049AA] disabled:bg-[#B4B4B4] disabled:cursor-not-allowed transition-colors"
                >
                  Hesapla
                </button>
              </div>
            </div>

            {sonuc && (
              <div className="mt-6 bg-[#E6F9FF] rounded-lg p-4">
                <h3 className="font-medium text-[#00287F] mb-3">Hesaplama Sonucu</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-sm text-[#5A5A5A]">Ana Para</p>
                    <p className="text-xl font-bold text-[#2E2E2E]">{formatTL(anaPara)} TL</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-sm text-[#5A5A5A]">Gecikme Zammi ({gun} gun)</p>
                    <p className="text-xl font-bold text-[#BF192B]">{formatTL(sonuc.zammi)} TL</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center border-2 border-[#5ED6FF]">
                    <p className="text-sm text-[#5A5A5A]">Toplam Odeme</p>
                    <p className="text-xl font-bold text-[#0049AA]">{formatTL(sonuc.toplam)} TL</p>
                  </div>
                </div>
                <p className="text-xs text-[#0049AA] mt-3">
                  * Hesaplama aylık %{guncelAylikOran} oranına göre yapılmıştır. Kesin tutar için vergi dairesine başvurunuz.
                </p>
              </div>
            )}
          </div>

          {/* Tarihce */}
          {gecikmeZammiTarihce.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
              <div className="p-4 bg-[#F5F6F8] border-b border-[#E5E5E5]">
                <h2 className="font-semibold text-[#2E2E2E] flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-[#5A5A5A]" />
                  Gecikme Zammı Tarihçesi
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F5F6F8]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#969696] uppercase">Yil</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-[#969696] uppercase">Aylik Oran</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-[#969696] uppercase">Yillik Oran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5]">
                    {gecikmeZammiTarihce.map((item, i) => (
                      <tr key={i} className={i === 0 ? "bg-[#FFFBEB]" : "hover:bg-[#F5F6F8]"}>
                        <td className="px-4 py-3 text-sm font-medium text-[#2E2E2E]">
                          {item.yil} {i === 0 && <span className="text-[#FA841E]">(Güncel)</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-lg font-semibold ${i === 0 ? 'bg-[#FFFBEB] text-[#FA841E]' : 'bg-[#F5F6F8] text-[#5A5A5A]'}`}>
                            %{item.oran}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-[#5A5A5A]">
                          %{(item.oran * 12).toFixed(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Mevzuat Referansi */}
      <div className="bg-[#F5F6F8] rounded-xl border border-[#E5E5E5] p-6">
        <h2 className="font-semibold text-[#2E2E2E] mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-[#5A5A5A]" />
          Önemli Bilgiler
        </h2>
        <ul className="space-y-2 text-sm text-[#5A5A5A]">
          <li className="flex items-start gap-2">
            <span className="text-[#969696] mt-1">-</span>
            <span><strong>Gecikme Zammi:</strong> Vadesinde odenmeyen amme alacaklarina 6183 sayili Kanun Md. 51 uyarinca uygulanir.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#969696] mt-1">-</span>
            <span><strong>Gecikme Faizi:</strong> VUK Md. 112 uyarinca, duzeltme fisi veya ikmalen/re&apos;sen/idarece tarhiyatlarda uygulanir.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#969696] mt-1">-</span>
            <span><strong>Pismanlik Zammi:</strong> VUK Md. 371 kapsaminda pismanlik ile beyannamelerde uygulanir.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#969696] mt-1">-</span>
            <span><strong>Tecil Faizi:</strong> 6183 sayili Kanun Md. 48 uyarinca tecil edilen borclar icin uygulanir.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
