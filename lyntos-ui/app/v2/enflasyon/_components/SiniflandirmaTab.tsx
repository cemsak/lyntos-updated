'use client';

import React from 'react';
import { Building2, CircleDot, CheckCircle2 } from 'lucide-react';
import { HESAP_SINIFLANDIRMA } from '../_lib/constants';

export function SiniflandirmaTab() {
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E5E5] bg-gradient-to-r from-[#F5F6F8] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0078D0] to-[#0078D0] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-[#2E2E2E]">Parasal / Parasal Olmayan Hesap Sınıflandırması</h3>
              <p className="text-sm text-[#969696]">Hangi hesaplar düzeltmeye tabi?</p>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-[#969696]" />
              <h4 className="font-bold text-[#5A5A5A]">Parasal Kalemler (Düzeltme YOK)</h4>
            </div>

            <div className="bg-[#F5F6F8] rounded-xl p-4">
              <p className="text-xs font-semibold text-[#969696] uppercase mb-3">Varlıklar</p>
              <div className="space-y-2">
                {HESAP_SINIFLANDIRMA.parasal.varlik.map((hesap, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-[#5A5A5A]">
                    <CircleDot className="w-3 h-3 text-[#969696]" />
                    {hesap}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#F5F6F8] rounded-xl p-4">
              <p className="text-xs font-semibold text-[#969696] uppercase mb-3">Kaynaklar</p>
              <div className="space-y-2">
                {HESAP_SINIFLANDIRMA.parasal.kaynak.map((hesap, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-[#5A5A5A]">
                    <CircleDot className="w-3 h-3 text-[#969696]" />
                    {hesap}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-[#00A651]" />
              <h4 className="font-bold text-[#5A5A5A]">Parasal Olmayan (Düzeltme VAR)</h4>
            </div>

            <div className="bg-[#ECFDF5] rounded-xl p-4 border border-[#AAE8B8]">
              <p className="text-xs font-semibold text-[#00804D] uppercase mb-3">Varlıklar</p>
              <div className="space-y-2">
                {HESAP_SINIFLANDIRMA.parasalOlmayan.varlik.map((hesap, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-[#00804D]">
                    <CheckCircle2 className="w-3 h-3 text-[#00A651]" />
                    {hesap}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#ECFDF5] rounded-xl p-4 border border-[#AAE8B8]">
              <p className="text-xs font-semibold text-[#00804D] uppercase mb-3">Kaynaklar</p>
              <div className="space-y-2">
                {HESAP_SINIFLANDIRMA.parasalOlmayan.kaynak.map((hesap, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-[#00804D]">
                    <CheckCircle2 className="w-3 h-3 text-[#00A651]" />
                    {hesap}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
