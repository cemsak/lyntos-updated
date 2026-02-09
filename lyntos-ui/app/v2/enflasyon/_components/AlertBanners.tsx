'use client';

import React from 'react';
import { AlertCircle, Info } from 'lucide-react';

export function AlertBanners() {
  return (
    <>
      <div className="flex items-start gap-4 p-5 bg-gradient-to-r from-[#FFFBEB] to-[#FEF2F2] border border-[#FFE045] rounded-2xl animate-slide-up">
        <div className="w-12 h-12 rounded-xl bg-[#FFB114] flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h4 className="font-bold text-[#92400E]">VUK Geçici Madde 37 - Enflasyon Düzeltmesi Ertelendi</h4>
          <p className="text-sm text-[#78350F] mt-1">
            25 Aralık 2025 tarihli düzenleme ile <strong>2025, 2026 ve 2027</strong> hesap dönemlerinde
            enflasyon düzeltmesi <strong>yapılmayacaktır</strong>.
            İstisna: Münhasıran sürekli olarak işlenmiş altın/gümüş alım-satımı yapan işletmeler.
          </p>
          <p className="text-sm text-[#92400E] mt-2 font-semibold">
            VUK Mük. 298/Ç kapsamında &quot;Sürekli Yeniden Değerleme&quot; uygulaması aktiftir.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-4 p-5 bg-gradient-to-r from-[#E6F9FF] to-[#F5F6F8] border border-[#ABEBFF] rounded-2xl animate-slide-up">
        <div className="w-12 h-12 rounded-xl bg-[#0078D0] flex items-center justify-center flex-shrink-0">
          <Info className="w-6 h-6 text-white" />
        </div>
        <div>
          <h4 className="font-bold text-[#00287F]">698/648/658 Hesapları Hakkında</h4>
          <p className="text-sm text-[#0049AA] mt-1">
            Enflasyon düzeltmesi ertelendiğinden, mizanda bu hesaplarda bakiye görülmesi
            <strong className="ml-1">anomali veya önceki dönem istisna uygulaması göstergesidir</strong>.
            Sistem bu hesapları otomatik olarak kontrol eder ve uyarı üretir.
          </p>
        </div>
      </div>
    </>
  );
}
