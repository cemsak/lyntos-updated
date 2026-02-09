'use client';

/**
 * MevzuatReferansCard
 * Renders a single legal reference card within the MevzuatReferansModal
 */

import React from 'react';
import {
  Scale,
  FileText,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import type { YasalDayanak } from './mevzuatData';
import { MEVZUAT_COLORS } from './mevzuatData';

interface MevzuatReferansCardProps {
  reference: YasalDayanak;
}

export function MevzuatReferansCard({ reference: ref }: MevzuatReferansCardProps) {
  const colors = MEVZUAT_COLORS[ref.kanun] || MEVZUAT_COLORS.VUK;

  return (
    <div className={`border ${colors.border} rounded-xl overflow-hidden`}>
      {/* Mevzuat Header */}
      <div className={`${colors.bg} px-4 py-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 text-[10px] font-bold rounded ${colors.text} bg-white`}
            >
              {ref.kanun}
            </span>
            <span className="text-[14px] font-semibold text-[#2E2E2E]">
              Madde {ref.maddeNo}
            </span>
          </div>
          {ref.guncellemeTarihi && (
            <span className="text-[10px] text-[#969696] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Güncelleme: {ref.guncellemeTarihi}
            </span>
          )}
        </div>
        <h3 className="text-[13px] font-medium text-[#5A5A5A] mt-1">
          {ref.baslik}
        </h3>
      </div>

      {/* Mevzuat Body */}
      <div className="p-4 space-y-4">
        {/* Özet */}
        <div>
          <p className="text-[12px] text-[#5A5A5A] leading-relaxed">
            {ref.ozet}
          </p>
        </div>

        {/* Önemli Notlar */}
        {ref.onemliNotlar && ref.onemliNotlar.length > 0 && (
          <div className="bg-[#FFFBEB] border border-[#FFF08C] rounded-lg p-3">
            <h4 className="text-[11px] font-semibold text-[#E67324] mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Önemli Notlar
            </h4>
            <ul className="space-y-1">
              {ref.onemliNotlar.map((not, idx) => (
                <li
                  key={idx}
                  className="text-[11px] text-[#FA841E] flex items-start gap-2"
                >
                  <span className="text-[#FFB114] mt-0.5">•</span>
                  {not}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Uygulama Örnekleri */}
        {ref.uygulamaOrnekleri && ref.uygulamaOrnekleri.length > 0 && (
          <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-3">
            <h4 className="text-[11px] font-semibold text-[#00287F] mb-2 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Uygulama Örnekleri
            </h4>
            <ul className="space-y-1">
              {ref.uygulamaOrnekleri.map((ornek, idx) => (
                <li
                  key={idx}
                  className="text-[11px] text-[#0049AA] flex items-start gap-2 font-mono"
                >
                  <span className="text-[#0078D0] mt-0.5">{idx + 1}.</span>
                  {ornek}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* İlgili Özelgeler */}
        {ref.ozelgeler && ref.ozelgeler.length > 0 && (
          <div className="border border-[#E5E5E5] rounded-lg p-3">
            <h4 className="text-[11px] font-semibold text-[#5A5A5A] mb-2 flex items-center gap-1">
              <Scale className="w-3 h-3" />
              İlgili Özelgeler
            </h4>
            <div className="space-y-2">
              {ref.ozelgeler.map((ozelge, idx) => (
                <div
                  key={idx}
                  className="bg-[#F5F6F8] rounded p-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-[#5A5A5A]">
                      {ozelge.no}
                    </span>
                    <span className="text-[10px] text-[#969696]">
                      {ozelge.tarih}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5A5A5A] mt-1 font-medium">
                    {ozelge.konu}
                  </p>
                  <p className="text-[10px] text-[#969696] mt-0.5">
                    {ozelge.ozet}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MevzuatReferansCard;
