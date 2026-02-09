'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, CheckCircle2, Users, Calendar, Clock, Loader2 } from 'lucide-react';
import { formatNumber } from '../../_lib/format';
import { useTaxParams, paramValue, paramMeta } from '../_hooks/useTaxParams';

export default function SgkPage() {
  const { data: sgkPrimParams, isLoading } = useTaxParams('sgk_prim');
  const { data: sgkTabanTavanParams } = useTaxParams('sgk_taban_tavan');
  const { data: ihbarParams } = useTaxParams('ihbar_sureleri');
  const { data: izinParams } = useTaxParams('yillik_izin');

  // Taban/Tavan değerlerini bul
  const tabanParam = sgkTabanTavanParams.find(p => p.param_key === 'sgk_taban');
  const tavanParam = sgkTabanTavanParams.find(p => p.param_key === 'sgk_tavan');
  const taban = tabanParam ? paramValue(tabanParam) : 0;
  const tavan = tavanParam ? paramValue(tavanParam) : 0;

  // SGK toplam hesapla
  const sgkToplamIsci = sgkPrimParams.reduce((sum, p) => {
    const meta = paramMeta<{ isci?: number }>(p);
    return sum + (meta.isci ?? 0);
  }, 0);
  const sgkToplamIsveren = sgkPrimParams.reduce((sum, p) => {
    const meta = paramMeta<{ isveren?: number }>(p);
    return sum + (meta.isveren ?? 0);
  }, 0);
  const sgkToplamGenel = sgkToplamIsci + sgkToplamIsveren;

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
          <h1 className="text-2xl font-bold text-[#2E2E2E]">SGK Bilgileri</h1>
          <p className="text-[#5A5A5A]">2026 yılı SGK prim oranları, taban ve tavan ücretler</p>
        </div>
      </div>

      {/* Güncellik Bildirimi */}
      <div className="bg-[#ECFDF5] border border-[#AAE8B8] rounded-lg p-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-[#00804D] mt-0.5" />
        <div>
          <p className="font-medium text-[#005A46]">2026 Yılı Güncel Veriler</p>
          <p className="text-sm text-[#00804D]">Veriler güncel mevzuata göre düzenli güncellenmektedir.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#0049AA] animate-spin" />
        </div>
      ) : (
        <>
          {/* SGK Taban/Tavan */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#0078D0]" />
              SGK Taban ve Tavan Ücretler (2026)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#E6F9FF] rounded-lg p-5 text-center">
                <p className="text-sm text-[#0078D0] mb-2">SGK Taban (Asgari Ücret)</p>
                <p className="text-3xl font-bold text-[#0049AA]">{formatNumber(taban)} TL</p>
                <p className="text-xs text-[#0078D0] mt-2">Prim matrahı alt sınırı</p>
              </div>
              <div className="bg-[#E6F9FF] rounded-lg p-5 text-center">
                <p className="text-sm text-[#0049AA] mb-2">SGK Tavan</p>
                <p className="text-3xl font-bold text-[#0049AA]">{formatNumber(tavan)} TL</p>
                <p className="text-xs text-[#0078D0] mt-2">Prim matrahı üst sınırı (7.5 x Asgari Ücret)</p>
              </div>
            </div>
          </div>

          {/* SGK Prim Oranları */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
            <div className="p-4 bg-[#F5F6F8] border-b border-[#E5E5E5]">
              <h2 className="font-semibold text-[#2E2E2E] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#0049AA]" />
                SGK Prim Oranları
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F5F6F8]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#969696] uppercase">Sigorta Türü</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-[#969696] uppercase">İşçi Payı (%)</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-[#969696] uppercase">İşveren Payı (%)</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-[#969696] uppercase">Toplam (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {sgkPrimParams.map((p) => {
                    const meta = paramMeta<{ isci?: number; isveren?: number }>(p);
                    return (
                      <tr key={p.id} className="hover:bg-[#F5F6F8]">
                        <td className="px-4 py-3 text-sm font-medium text-[#2E2E2E]">{p.description}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-[#ECFDF5] text-[#00804D] rounded font-semibold text-sm">
                            {meta.isci !== undefined ? `%${meta.isci}` : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-[#E6F9FF] text-[#0049AA] rounded font-semibold text-sm">
                            {meta.isveren !== undefined ? `%${meta.isveren}` : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-[#E6F9FF] text-[#0049AA] rounded font-semibold text-sm">
                            %{paramValue(p)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Toplam Satırı */}
                  <tr className="bg-[#F5F6F8] font-semibold">
                    <td className="px-4 py-3 text-sm text-[#2E2E2E]">TOPLAM</td>
                    <td className="px-4 py-3 text-center text-[#2E2E2E]">%{sgkToplamIsci}</td>
                    <td className="px-4 py-3 text-center text-[#2E2E2E]">%{sgkToplamIsveren}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-3 py-1 bg-[#5A5A5A] text-white rounded font-bold">%{sgkToplamGenel}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* İhbar Süreleri */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#FA841E]" />
              İhbar Süreleri (4857 SK Md. 17)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {ihbarParams.map((p) => (
                <div key={p.id} className="bg-[#FFFBEB] rounded-lg p-4 text-center">
                  <p className="text-sm text-[#FA841E] mb-2">{p.description}</p>
                  <p className="text-2xl font-bold text-[#FA841E]">{paramValue(p)} {p.param_unit}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#969696] mt-4">
              * İhbar öneli verilmemesi halinde bu sürelere ait ücret ihbar tazminatı olarak ödenir.
            </p>
          </div>

          {/* Yıllık İzin Süreleri */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#00804D]" />
              Yıllık Ücretli İzin Süreleri (4857 SK Md. 53)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {izinParams.map((p) => (
                <div key={p.id} className="bg-[#ECFDF5] rounded-lg p-4 text-center">
                  <p className="text-sm text-[#00804D] mb-2">{p.description}</p>
                  <p className="text-2xl font-bold text-[#00804D]">{paramValue(p)} {p.param_unit}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#969696] mt-4">
              * Yıllık izin süreleri iş günü olarak hesaplanır. Ulusal bayram, genel tatil ve hafta tatilleri izin süresine dahil değildir.
            </p>
          </div>

          {/* Bilgi Notu */}
          <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-4">
            <h3 className="font-medium text-[#00287F] mb-2">Önemli Notlar</h3>
            <ul className="text-sm text-[#0049AA] space-y-1">
              <li>• 5510 sayılı Kanun kapsamında işçi ve işveren SGK prim oranları belirlenmiştir.</li>
              <li>• Kısa vadeli sigorta primi (iş kazası ve meslek hastalığı) sadece işveren tarafından ödenir.</li>
              <li>• İşsizlik sigortası primi 4447 sayılı Kanun'a göre hesaplanır.</li>
              <li>• Teşvik kapsamındaki işverenlerde prim oranları farklılık gösterebilir.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
