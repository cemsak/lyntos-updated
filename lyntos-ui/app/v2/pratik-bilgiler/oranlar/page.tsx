'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Percent, CheckCircle2, Loader2 } from 'lucide-react';
import { formatNumber } from '../../_lib/format';
import { useTaxParams, paramValue, paramMeta, paramsToMap } from '../_hooks/useTaxParams';

export default function OranlarPage() {
  const { data: gvDilimleri, isLoading: gvLoading } = useTaxParams('gelir_vergisi_dilimleri');
  const { data: kvParams } = useTaxParams('kurumlar_vergisi');
  const { data: kdvParams } = useTaxParams('kdv_oranlari');
  const { data: tevkifatParams } = useTaxParams('kdv_tevkifat');
  const { data: stopajParams } = useTaxParams('stopaj_oranlari');
  const { data: damgaParams } = useTaxParams('damga_vergisi');
  const { data: geciciParams } = useTaxParams('gecici_vergi');
  const { data: reeskontParams } = useTaxParams('reeskont_avans');

  const kvMap = paramsToMap(kvParams);
  const kdvMap = paramsToMap(kdvParams);

  const isLoading = gvLoading;

  // GV dilimleri - metadata'dan min/max/oran
  const dilimler = gvDilimleri
    .map(p => ({
      min: (paramMeta<{ min: number }>(p)).min ?? 0,
      max: (paramMeta<{ max: number | null }>(p)).max,
      oran: paramValue(p),
    }))
    .sort((a, b) => a.min - b.min);

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
          <h1 className="text-2xl font-bold text-[#2E2E2E]">Vergi Oranları</h1>
          <p className="text-[#5A5A5A]">2026 yılı güncel vergi oranları ve dilimleri</p>
        </div>
      </div>

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
          {/* Gelir Vergisi Dilimleri */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
            <div className="p-4 bg-[#F5F6F8] border-b border-[#E5E5E5]">
              <h2 className="font-semibold text-[#2E2E2E] flex items-center gap-2">
                <Percent className="w-5 h-5 text-[#0049AA]" />
                Gelir Vergisi Dilimleri (GVK Md. 103)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F5F6F8]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#969696] uppercase">Dilim</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#969696] uppercase">Alt Sınır</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#969696] uppercase">Üst Sınır</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-[#969696] uppercase">Oran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {dilimler.map((dilim, i) => (
                    <tr key={i} className="hover:bg-[#F5F6F8]">
                      <td className="px-4 py-3 text-sm text-[#5A5A5A]">{i + 1}. Dilim</td>
                      <td className="px-4 py-3 text-sm text-[#2E2E2E] font-medium">
                        {formatNumber(dilim.min)} TL
                      </td>
                      <td className="px-4 py-3 text-sm text-[#2E2E2E] font-medium">
                        {dilim.max ? `${formatNumber(dilim.max)} TL` : 'Sınırsız'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 bg-[#E6F9FF] text-[#0049AA] rounded-lg font-semibold">
                          %{dilim.oran}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Kurumlar Vergisi */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
              <Percent className="w-5 h-5 text-[#0049AA]" />
              Kurumlar Vergisi Oranları
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#E6F9FF] rounded-lg p-4 text-center">
                <p className="text-sm text-[#0049AA] mb-1">Genel Oran</p>
                <p className="text-3xl font-bold text-[#0049AA]">%{kvMap.kv_genel ? paramValue(kvMap.kv_genel) : 25}</p>
                <p className="text-xs text-[#0078D0] mt-1">KVK Md. 32</p>
              </div>
              <div className="bg-[#E6F9FF] rounded-lg p-4 text-center">
                <p className="text-sm text-[#0049AA] mb-1">Geçici Vergi</p>
                <p className="text-3xl font-bold text-[#0049AA]">%{kvMap.kv_gecici ? paramValue(kvMap.kv_gecici) : 25}</p>
                <p className="text-xs text-[#0078D0] mt-1">Dönem kâr üzerinden</p>
              </div>
              <div className="bg-[#E6F9FF] rounded-lg p-4 text-center">
                <p className="text-sm text-[#0078D0] mb-1">İhracat Teşviki</p>
                <p className="text-3xl font-bold text-[#0049AA]">%{kvMap.kv_ihracat ? paramValue(kvMap.kv_ihracat) : 20}</p>
                <p className="text-xs text-[#0078D0] mt-1">İndirimli oran</p>
              </div>
            </div>
          </div>

          {/* KDV Oranları */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
              <Percent className="w-5 h-5 text-[#00804D]" />
              KDV Oranları
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-[#ECFDF5] rounded-lg p-4 text-center">
                <p className="text-sm text-[#00804D] mb-1">Genel Oran</p>
                <p className="text-3xl font-bold text-[#00804D]">%{kdvMap.kdv_genel ? paramValue(kdvMap.kdv_genel) : 20}</p>
              </div>
              <div className="bg-[#ECFDF5] rounded-lg p-4 text-center">
                <p className="text-sm text-[#00804D] mb-1">İndirimli I</p>
                <p className="text-3xl font-bold text-[#00804D]">%{kdvMap.kdv_indirimli_1 ? paramValue(kdvMap.kdv_indirimli_1) : 10}</p>
                <p className="text-xs text-[#00A651] mt-1">Temel gıda, tekstil</p>
              </div>
              <div className="bg-[#ECFDF5] rounded-lg p-4 text-center">
                <p className="text-sm text-[#00A651] mb-1">İndirimli II</p>
                <p className="text-3xl font-bold text-[#00804D]">%{kdvMap.kdv_indirimli_2 ? paramValue(kdvMap.kdv_indirimli_2) : 1}</p>
                <p className="text-xs text-[#00A651] mt-1">Tarımsal ürünler</p>
              </div>
            </div>

            <h3 className="font-medium text-[#5A5A5A] mb-3">KDV Tevkifat Oranları</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tevkifatParams.map(p => (
                <div key={p.id} className="bg-[#F5F6F8] rounded-lg p-3 flex justify-between items-center">
                  <span className="text-sm text-[#5A5A5A]">{p.description}</span>
                  <span className="font-semibold text-[#2E2E2E]">
                    {(paramMeta<{ pay?: number; payda?: number }>(p)).pay}/{(paramMeta<{ pay?: number; payda?: number }>(p)).payda}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stopaj Oranları */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
              <Percent className="w-5 h-5 text-[#FA841E]" />
              Stopaj Oranları
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stopajParams.map(p => (
                <div key={p.id} className="flex justify-between items-center py-2 border-b border-[#E5E5E5] last:border-0">
                  <span className="text-sm text-[#5A5A5A]">{p.description}</span>
                  <span className="font-semibold text-[#FA841E]">%{paramValue(p)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Damga Vergisi */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
              <Percent className="w-5 h-5 text-[#BF192B]" />
              Damga Vergisi
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {damgaParams.map(p => (
                <div key={p.id} className="bg-[#FEF2F2] rounded-lg p-4">
                  <p className="text-sm text-[#BF192B] mb-1">{p.description}</p>
                  <p className="text-2xl font-bold text-[#BF192B]">
                    {p.param_unit === '‰' ? `${paramValue(p)} ‰` : `${formatNumber(paramValue(p))} ${p.param_unit}`}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Reeskont/Avans */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
              <Percent className="w-5 h-5 text-[#FA841E]" />
              Reeskont ve Avans Oranları
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reeskontParams.map(p => (
                <div key={p.id} className="bg-[#FFFBEB] rounded-lg p-4">
                  <p className="text-sm text-[#FA841E] mb-1">{p.description}</p>
                  <p className="text-2xl font-bold text-[#FA841E]">%{paramValue(p)}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
