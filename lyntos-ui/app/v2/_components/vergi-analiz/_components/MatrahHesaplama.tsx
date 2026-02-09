'use client';

import React from 'react';
import { Calculator, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCurrency as formatCurrencyBase } from '../../../_lib/format';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface MatrahVerileri {
  ticariBilancoKari: number;
  kkegToplam: number;
  vergiyeTabiOlmayanGelirler: number;
  istisnalar: number;
  gecmisYilZararlari: number;
  indirimler: number;
  ihracatKazanci?: number;
  geciciVergiMahsup?: number;
  kesilenStopajlar?: number;
}

interface MatrahHesaplamaProps {
  veriler: MatrahVerileri;
  yil: number;
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function formatCurrency(value: number): string {
  return formatCurrencyBase(value, { decimals: 0, showSymbol: false }) + ' TL';
}

// ════════════════════════════════════════════════════════════════════════════
// MATRAH HESAPLAMA COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function MatrahHesaplama({ veriler, yil }: MatrahHesaplamaProps) {
  // Hesaplamalar
  const kkegEklenen = veriler.ticariBilancoKari + veriler.kkegToplam;
  const matrah = kkegEklenen
    - veriler.vergiyeTabiOlmayanGelirler
    - veriler.istisnalar
    - veriler.gecmisYilZararlari
    - veriler.indirimler;

  const ihracatKazanci = veriler.ihracatKazanci || 0;
  const normalOranliMatrah = matrah - ihracatKazanci;

  const hesaplananKV = (normalOranliMatrah * 0.25) + (ihracatKazanci * 0.20);

  // AKV Kontrolü (2025'ten itibaren)
  const akvMatrah = veriler.ticariBilancoKari + veriler.kkegToplam;
  const asgariKV = akvMatrah * 0.10;
  const akvUyari = yil >= 2025 && hesaplananKV < asgariKV;
  const nihaiBelgeKV = yil >= 2025 ? Math.max(hesaplananKV, asgariKV) : hesaplananKV;

  // Odenecek
  const geciciMahsup = veriler.geciciVergiMahsup || 0;
  const stopajMahsup = veriler.kesilenStopajlar || 0;
  const odenecekKV = nihaiBelgeKV - geciciMahsup - stopajMahsup;

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0049AA] to-[#0049AA] px-4 py-3">
        <div className="flex items-center gap-2 text-white">
          <Calculator className="w-5 h-5" />
          <span className="font-semibold">Matrah Hesaplama Özeti</span>
        </div>
        <div className="text-[#E6F9FF] text-xs mt-1">{yil} Hesap Dönemi</div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2 text-sm">
        {/* Ticari Bilanco Kari */}
        <div className="flex justify-between">
          <span className="text-[#5A5A5A]">Ticari Bilanco Kari</span>
          <span className="font-medium text-[#2E2E2E]">{formatCurrency(veriler.ticariBilancoKari)}</span>
        </div>

        {/* KKEG */}
        <div className="flex justify-between">
          <span className="text-[#5A5A5A]">+ KKEG</span>
          <span className="font-medium text-[#BF192B]">+{formatCurrency(veriler.kkegToplam)}</span>
        </div>

        <div className="border-t border-[#E5E5E5] pt-2">
          <div className="flex justify-between">
            <span className="text-[#5A5A5A] font-medium">= KKEG Eklenen</span>
            <span className="font-semibold text-[#2E2E2E]">{formatCurrency(kkegEklenen)}</span>
          </div>
        </div>

        {/* Cikarimlar */}
        <div className="flex justify-between text-[#969696]">
          <span>- Vergiye Tabi Olmayan Gelirler</span>
          <span>({formatCurrency(veriler.vergiyeTabiOlmayanGelirler)})</span>
        </div>

        <div className="flex justify-between text-[#969696]">
          <span>- Istisnalar</span>
          <span>({formatCurrency(veriler.istisnalar)})</span>
        </div>

        <div className="flex justify-between text-[#969696]">
          <span>- Gecmis Yil Zararlari</span>
          <span>({formatCurrency(veriler.gecmisYilZararlari)})</span>
        </div>

        <div className="flex justify-between text-[#969696]">
          <span>- Indirimler</span>
          <span>({formatCurrency(veriler.indirimler)})</span>
        </div>

        {/* Matrah */}
        <div className="border-t border-[#E5E5E5] pt-2 mt-2">
          <div className="flex justify-between bg-[#E6F9FF] -mx-4 px-4 py-2">
            <span className="text-[#00287F] font-semibold">KURUMLAR VERGISI MATRAHI</span>
            <span className="font-bold text-[#00287F]">{formatCurrency(matrah)}</span>
          </div>
        </div>

        {/* Vergi Hesabi */}
        <div className="pt-2 space-y-1">
          {ihracatKazanci > 0 && (
            <>
              <div className="flex justify-between text-xs text-[#969696]">
                <span>Normal Matrah x %25</span>
                <span>{formatCurrency(normalOranliMatrah * 0.25)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#00804D]">
                <span>Ihracat Matrahi x %20 (5 puan indirim)</span>
                <span>{formatCurrency(ihracatKazanci * 0.20)}</span>
              </div>
            </>
          )}

          <div className="flex justify-between">
            <span className="text-[#5A5A5A]">Hesaplanan KV</span>
            <span className="font-medium">{formatCurrency(hesaplananKV)}</span>
          </div>
        </div>

        {/* AKV Kontrolu */}
        {yil >= 2025 && (
          <div className={`border rounded-lg p-3 mt-3 ${akvUyari ? 'border-[#FFE045] bg-[#FFFBEB]' : 'border-[#6BDB83] bg-[#ECFDF5]'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {akvUyari ? (
                  <AlertCircle className="w-4 h-4 text-[#FA841E]" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-[#00804D]" />
                )}
                <span className={`text-sm font-medium ${akvUyari ? 'text-[#FA841E]' : 'text-[#00804D]'}`}>
                  Asgari KV Kontrolü
                </span>
              </div>
              <span className={`text-sm ${akvUyari ? 'text-[#FA841E]' : 'text-[#00804D]'}`}>
                AKV: {formatCurrency(asgariKV)}
              </span>
            </div>
            {akvUyari && (
              <p className="text-xs text-[#FA841E] mt-2">
                Hesaplanan KV asgari KV'nin altında! Asgari KV uygulanacak.
              </p>
            )}
          </div>
        )}

        {/* Mahsuplar */}
        <div className="border-t border-[#E5E5E5] pt-2 mt-2 space-y-1">
          <div className="flex justify-between text-[#969696]">
            <span>- Gecici Vergi Mahsubu</span>
            <span>({formatCurrency(geciciMahsup)})</span>
          </div>
          <div className="flex justify-between text-[#969696]">
            <span>- Kesilen Stopajlar</span>
            <span>({formatCurrency(stopajMahsup)})</span>
          </div>
        </div>

        {/* Odenecek */}
        <div className="border-t border-[#E5E5E5] pt-3 mt-2">
          <div className={`flex justify-between -mx-4 px-4 py-3 ${odenecekKV >= 0 ? 'bg-[#2E2E2E]' : 'bg-[#00804D]'}`}>
            <span className="text-white font-semibold">ODENECEK KURUMLAR VERGISI</span>
            <span className="font-bold text-white text-lg">
              {formatCurrency(Math.max(0, odenecekKV))}
            </span>
          </div>
          {odenecekKV < 0 && (
            <div className="text-center text-[#00804D] text-sm mt-2 font-medium">
              {formatCurrency(Math.abs(odenecekKV))} iade hakkiniz var
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
