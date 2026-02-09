'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, Scale, Shield, BookOpen, Info } from 'lucide-react';

export function BilgiTab() {
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E5E5] bg-gradient-to-r from-[#F5F6F8] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00A651] to-[#00A651] flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-[#2E2E2E]">Yeniden Değerleme Nedir?</h3>
              <p className="text-sm text-[#969696]">VUK Mük. 298/Ç ve Geçici Madde 37 kapsamı</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-[#5A5A5A]">
            Sürekli yeniden değerleme, amortismana tabi iktisadi kıymetlerin ve bunlara ait
            birikmiş amortismanların Yİ-ÜFE artış oranı ile yeniden değerlenmesidir.
            VUK Geçici Madde 37 ile 2025-2027 arası enflasyon düzeltmesi ertelenmiş olup,
            yeniden değerleme pratik araç haline gelmiştir.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-gradient-to-br from-[#FFFBEB] to-[#FFFBEB] rounded-2xl border border-[#FFE045]">
              <h4 className="font-bold text-[#92400E] mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                VUK Geçici 37
              </h4>
              <p className="text-sm text-[#78350F]">
                2025-2026-2027 dönemlerinde enflasyon düzeltmesi yapılmayacak.
                İstisna: Sürekli altın/gümüş işleyen işletmeler.
              </p>
            </div>
            <div className="p-5 bg-gradient-to-br from-[#E6F9FF] to-[#E6F9FF] rounded-2xl border border-[#ABEBFF]">
              <h4 className="font-bold text-[#00287F] mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                VUK Mük. 298/Ç
              </h4>
              <p className="text-sm text-[#0049AA]">
                Sürekli Yeniden Değerleme. Amortismana tabi iktisadi kıymetler ve
                birikmiş amortismanlar Yİ-ÜFE oranıyla değerlenir.
              </p>
            </div>
            <div className="p-5 bg-gradient-to-br from-[#ECFDF5] to-[#ECFDF5] rounded-2xl border border-[#AAE8B8]">
              <h4 className="font-bold text-[#005A46] mb-2 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Değer Artış Fonu
              </h4>
              <p className="text-sm text-[#00804D]">
                Yeniden değerleme farkları pasifte özel fon hesabında izlenir.
                Sermayeye ilave edilebilir.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { title: 'Yeniden Değerleme Katsayısı', desc: 'Yİ-ÜFE endeks artış oranı ile hesaplanır' },
              { title: 'Kapsam', desc: 'Amortismana tabi iktisadi kıymetler (ATİK) ve birikmiş amortismanlar' },
              { title: '698/648/658 Hesaplar', desc: 'Enflasyon düzeltmesi ertelendiğinden bu hesaplardaki bakiye anomali göstergesidir' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-[#F5F6F8] rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-[#00A651] mt-0.5" />
                <div>
                  <span className="font-semibold text-[#2E2E2E]">{item.title}:</span>
                  <span className="text-[#5A5A5A] ml-1">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-4 p-5 bg-[#F5F6F8] border border-[#E5E5E5] rounded-2xl">
        <Info className="w-5 h-5 text-[#969696] mt-0.5" />
        <div>
          <p className="font-semibold text-[#5A5A5A]">Yasal Dayanak</p>
          <p className="text-sm text-[#969696] mt-1">
            VUK Mükerrer Madde 298/Ç (Sürekli Yeniden Değerleme), VUK Geçici Madde 37
            (Enflasyon Düzeltmesi Erteleme - 2025/2026/2027).
          </p>
        </div>
      </div>
    </div>
  );
}
