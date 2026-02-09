'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Banknote, CheckCircle2, Wallet, Building2, Loader2 } from 'lucide-react';
import { formatNumber } from '../../_lib/format';
import { useTaxParams, paramValue, paramMeta } from '../_hooks/useTaxParams';

export default function HadlerPage() {
  const { data: asgariParams, isLoading: asgariLoading } = useTaxParams('asgari_ucret');
  const { data: hadlerParams } = useTaxParams('hadler');
  const { data: gundelikParams } = useTaxParams('gundelikler');

  // 2 decimals wrapper using central formatNumber
  const formatTL = (value: number) => formatNumber(value, 2);

  // Asgari ücret meta verisi
  const asgariParam = asgariParams[0];
  const asgariMeta = asgariParam
    ? paramMeta<{
        donem: string;
        brut: number;
        sgk_isci: number;
        issizlik_isci: number;
        gelir_vergisi: number;
        damga_vergisi: number;
        net: number;
        isveren_sgk: number;
        isveren_issizlik: number;
        toplam_maliyet: number;
      }>(asgariParam)
    : null;

  const isLoading = asgariLoading;

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
          <h1 className="text-2xl font-bold text-[#2E2E2E]">Hadler ve Tutarlar</h1>
          <p className="text-[#5A5A5A]">2026 yılı yasal hadler, limitler ve tutarlar</p>
        </div>
      </div>

      {/* Guncellik Bildirimi */}
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
          {/* Asgari Ucret Detay */}
          {asgariMeta && (
            <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
              <div className="p-4 bg-[#E6F9FF] border-b border-[#ABEBFF]">
                <h2 className="font-semibold text-[#00287F] flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-[#0049AA]" />
                  Asgari Ücret - {asgariMeta.donem}
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-[#E6F9FF] rounded-lg p-4 text-center">
                    <p className="text-sm text-[#0049AA] mb-1">Brut</p>
                    <p className="text-2xl font-bold text-[#0049AA]">{formatTL(asgariMeta.brut)} TL</p>
                  </div>
                  <div className="bg-[#ECFDF5] rounded-lg p-4 text-center">
                    <p className="text-sm text-[#00804D] mb-1">Net</p>
                    <p className="text-2xl font-bold text-[#00804D]">{formatTL(asgariMeta.net)} TL</p>
                  </div>
                  <div className="bg-[#FFFBEB] rounded-lg p-4 text-center">
                    <p className="text-sm text-[#FA841E] mb-1">İşveren Maliyeti</p>
                    <p className="text-2xl font-bold text-[#FA841E]">{formatTL(asgariMeta.toplam_maliyet)} TL</p>
                  </div>
                  <div className="bg-[#E6F9FF] rounded-lg p-4 text-center">
                    <p className="text-sm text-[#0049AA] mb-1">Damga Vergisi</p>
                    <p className="text-2xl font-bold text-[#0049AA]">{formatTL(asgariMeta.damga_vergisi)} TL</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#F5F6F8]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#969696] uppercase">Kalem</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#969696] uppercase">Tutar (TL)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5E5]">
                      <tr><td className="px-4 py-2 text-sm">Brüt Ücret</td><td className="px-4 py-2 text-sm text-right font-medium">{formatTL(asgariMeta.brut)}</td></tr>
                      <tr><td className="px-4 py-2 text-sm text-[#BF192B]">(-) SGK İşçi Payı (%14)</td><td className="px-4 py-2 text-sm text-right text-[#BF192B]">{formatTL(asgariMeta.sgk_isci)}</td></tr>
                      <tr><td className="px-4 py-2 text-sm text-[#BF192B]">(-) İşsizlik İşçi (%1)</td><td className="px-4 py-2 text-sm text-right text-[#BF192B]">{formatTL(asgariMeta.issizlik_isci)}</td></tr>
                      <tr><td className="px-4 py-2 text-sm text-[#BF192B]">(-) Gelir Vergisi</td><td className="px-4 py-2 text-sm text-right text-[#BF192B]">{formatTL(asgariMeta.gelir_vergisi)}</td></tr>
                      <tr><td className="px-4 py-2 text-sm text-[#BF192B]">(-) Damga Vergisi</td><td className="px-4 py-2 text-sm text-right text-[#BF192B]">{formatTL(asgariMeta.damga_vergisi)}</td></tr>
                      <tr className="bg-[#ECFDF5]"><td className="px-4 py-2 text-sm font-semibold">Net Ücret</td><td className="px-4 py-2 text-sm text-right font-bold text-[#00804D]">{formatTL(asgariMeta.net)}</td></tr>
                      <tr><td className="px-4 py-2 text-sm text-[#FA841E]">(+) İşveren SGK (%15.5)</td><td className="px-4 py-2 text-sm text-right text-[#FA841E]">{formatTL(asgariMeta.isveren_sgk)}</td></tr>
                      <tr><td className="px-4 py-2 text-sm text-[#FA841E]">(+) İşveren İşsizlik (%2)</td><td className="px-4 py-2 text-sm text-right text-[#FA841E]">{formatTL(asgariMeta.isveren_issizlik)}</td></tr>
                      <tr className="bg-[#FFFBEB]"><td className="px-4 py-2 text-sm font-semibold">Toplam İşveren Maliyeti</td><td className="px-4 py-2 text-sm text-right font-bold text-[#FA841E]">{formatTL(asgariMeta.toplam_maliyet)}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Yasal Hadler */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
            <div className="p-4 bg-[#F5F6F8] border-b border-[#E5E5E5]">
              <h2 className="font-semibold text-[#2E2E2E] flex items-center gap-2">
                <Banknote className="w-5 h-5 text-[#5A5A5A]" />
                Yasal Hadler ve Tutarlar
              </h2>
            </div>
            <div className="divide-y divide-[#E5E5E5]">
              {hadlerParams.map(p => (
                <div key={p.id} className="flex justify-between items-center p-4 hover:bg-[#F5F6F8]">
                  <div>
                    <p className="font-medium text-[#2E2E2E]">{p.description}</p>
                    {p.legal_reference && <p className="text-xs text-[#969696] mt-0.5">{p.legal_reference}</p>}
                  </div>
                  <span className="text-lg font-bold text-[#5A5A5A]">
                    {formatTL(paramValue(p))} {p.param_unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Yurtici Gundelikler */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
            <div className="p-4 bg-[#F5F6F8] border-b border-[#E5E5E5]">
              <h2 className="font-semibold text-[#2E2E2E] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#5A5A5A]" />
                Yurtiçi Harcırah Gündelikleri
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F5F6F8]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#969696] uppercase">Derece / Kadro</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#969696] uppercase">Gundelik (TL)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {gundelikParams.map(p => (
                    <tr key={p.id} className="hover:bg-[#F5F6F8]">
                      <td className="px-4 py-3 text-sm text-[#5A5A5A]">{p.description}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-[#2E2E2E]">
                        {formatTL(paramValue(p))} TL
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
