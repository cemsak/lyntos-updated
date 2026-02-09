'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, AlertTriangle, Scale, FileWarning, CheckCircle2, Loader2 } from 'lucide-react';
import { formatNumber } from '../../_lib/format';
import { useTaxParams, paramValue, paramMeta } from '../_hooks/useTaxParams';

export default function CezalarPage() {
  const { data: usulsuzlukParams, isLoading } = useTaxParams('cezalar_usulsuzluk');
  const { data: ozelUsulsuzlukParams } = useTaxParams('cezalar_ozel_usulsuzluk');
  const { data: vergiZiyaiParams } = useTaxParams('cezalar_vergi_ziyai');

  const formatTL = (value: number) => formatNumber(value, 2);

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
          <h1 className="text-2xl font-bold text-[#2E2E2E]">VUK Cezaları</h1>
          <p className="text-[#5A5A5A]">Vergi ziyaı ve usulsüzlük cezaları (2026)</p>
        </div>
      </div>

      {/* Guncellik Bildirimi */}
      <div className="bg-[#ECFDF5] border border-[#AAE8B8] rounded-lg p-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-[#00804D] mt-0.5" />
        <div>
          <p className="font-medium text-[#005A46]">2026 Yılı Güncel Ceza Tutarları</p>
          <p className="text-sm text-[#00804D]">Veriler güncel mevzuata göre düzenli güncellenmektedir.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#0049AA] animate-spin" />
        </div>
      ) : (
        <>
          {/* Vergi Ziyai Cezasi */}
          <div className="bg-white rounded-xl border border-[#FFC7C9] overflow-hidden">
            <div className="p-4 bg-[#FEF2F2] border-b border-[#FFC7C9]">
              <h2 className="font-semibold text-[#980F30] flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#BF192B]" />
                Vergi Ziyai Cezasi (VUK Md. 344)
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {vergiZiyaiParams.map(p => {
                  const meta = paramMeta<{ kat?: number }>(p);
                  const isKacakcilik = (meta.kat ?? 0) >= 3;
                  return (
                    <div key={p.id} className={`${isKacakcilik ? 'bg-[#FFC7C9]' : 'bg-[#FEF2F2]'} rounded-lg p-4 text-center`}>
                      <p className="text-sm text-[#BF192B] mb-1">{p.description?.split(' - ')[0] || p.description}</p>
                      <p className="text-3xl font-bold text-[#980F30]">
                        {isKacakcilik ? `${(meta.kat ?? 3)} Kat` : `%${paramValue(p)}`}
                      </p>
                      <p className="text-xs text-[#BF192B] mt-1">{p.legal_reference}</p>
                    </div>
                  );
                })}
              </div>
              <div className="bg-[#F5F6F8] rounded-lg p-4 text-sm text-[#5A5A5A]">
                <p><strong>Not:</strong> Vergi ziyaı cezası, ziyaa uğratılan verginin kendisi üzerinden hesaplanır.
                Ceza ile birlikte gecikme faizi de tahakkuk ettirilir.</p>
              </div>
            </div>
          </div>

          {/* Usulsuzluk Cezalari */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
            <div className="p-4 bg-[#F5F6F8] border-b border-[#E5E5E5]">
              <h2 className="font-semibold text-[#2E2E2E] flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#FA841E]" />
                Usulsüzlük Cezaları (VUK Md. 352)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F5F6F8]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#969696] uppercase">Ceza Turu</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#969696] uppercase">Tutar</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#969696] uppercase">Grup</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {usulsuzlukParams.map((p) => {
                    const meta = paramMeta<{ grup?: string }>(p);
                    return (
                      <tr key={p.id} className="hover:bg-[#F5F6F8]">
                        <td className="px-4 py-3 text-sm font-medium text-[#2E2E2E]">{p.description}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-[#FFFBEB] text-[#FA841E] rounded-lg font-semibold text-sm">
                            {formatTL(paramValue(p))} TL
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#5A5A5A]">{meta.grup ?? ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-[#FFFBEB] border-t border-[#FFF08C]">
              <p className="text-sm text-[#FA841E]">
                <strong>1. Derece Usulsüzlük Fiilleri:</strong> Beyanname vermeme, defter tutmama, defter/kayıtları
                ibraz etmeme gibi ağır fiiller.
              </p>
              <p className="text-sm text-[#FA841E] mt-1">
                <strong>2. Derece Usulsüzlük Fiilleri:</strong> Beyannameleri süresi içinde vermeme, defter kayıtlarını
                eksik/hatalı tutma gibi hafif fiiller.
              </p>
            </div>
          </div>

          {/* Ozel Usulsuzluk Cezalari */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
            <div className="p-4 bg-[#FFFBEB] border-b border-[#FFF08C]">
              <h2 className="font-semibold text-[#E67324] flex items-center gap-2">
                <FileWarning className="w-5 h-5 text-[#FA841E]" />
                Özel Usulsüzlük Cezaları (VUK Md. 353)
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {ozelUsulsuzlukParams.map((p) => (
                  <div key={p.id} className="bg-[#FFFBEB] rounded-lg p-4 text-center">
                    <p className="text-sm text-[#FA841E] mb-1">{p.description}</p>
                    <p className="text-2xl font-bold text-[#FA841E]">{formatTL(paramValue(p))} TL</p>
                    <p className="text-xs text-[#FFB114] mt-1">{p.legal_reference}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 bg-[#F5F6F8] border-t border-[#E5E5E5]">
              <p className="text-sm text-[#5A5A5A]">
                <strong>Dikkat:</strong> Özel usulsüzlük cezaları her belge/işlem için ayrı ayrı uygulanır.
                e-Fatura/e-Defter yükümlülüklerini yerine getirmeyenlere ağır cezalar uygulanmaktadır.
              </p>
            </div>
          </div>

          {/* Diger Cezalar */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#5A5A5A]" />
              Diğer Önemli Cezalar
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#F5F6F8] rounded-lg p-4">
                <h3 className="font-medium text-[#5A5A5A] mb-2">Bilgi Vermeme Cezasi</h3>
                <p className="text-2xl font-bold text-[#2E2E2E] mb-1">6.900 - 1.700.000 TL</p>
                <p className="text-sm text-[#5A5A5A]">VUK Md. 355 - Mükellef grubuna göre</p>
              </div>
              <div className="bg-[#F5F6F8] rounded-lg p-4">
                <h3 className="font-medium text-[#5A5A5A] mb-2">Ba-Bs Bildirimleri</h3>
                <p className="text-2xl font-bold text-[#2E2E2E] mb-1">4.600 TL</p>
                <p className="text-sm text-[#5A5A5A]">Süresi geçen/hatalı bildirim başı</p>
              </div>
              <div className="bg-[#F5F6F8] rounded-lg p-4">
                <h3 className="font-medium text-[#5A5A5A] mb-2">Defter Tasdik Ettirmeme</h3>
                <p className="text-2xl font-bold text-[#2E2E2E] mb-1">1. Derece Usulsuzluk</p>
                <p className="text-sm text-[#5A5A5A]">VUK Md. 352/1</p>
              </div>
              <div className="bg-[#F5F6F8] rounded-lg p-4">
                <h3 className="font-medium text-[#5A5A5A] mb-2">Muhasebe Hileleri</h3>
                <p className="text-2xl font-bold text-[#2E2E2E] mb-1">18 ay - 5 yil hapis</p>
                <p className="text-sm text-[#5A5A5A]">VUK 359 - Vergi kaçakçılığı suçu</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bilgilendirme */}
      <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#0078D0] mt-0.5" />
        <div>
          <p className="font-medium text-[#00287F]">Önemli Uyarı</p>
          <p className="text-sm text-[#0049AA]">
            Ceza tutarları her yıl yeniden değerleme oranında güncellenir.
            Güncel tutarlar için GİB web sitesini kontrol ediniz.
            Bu sayfadaki bilgiler bilgilendirme amaçlıdır.
          </p>
        </div>
      </div>
    </div>
  );
}
