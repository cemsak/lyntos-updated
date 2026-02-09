'use client';

import React, { useState } from 'react';
import {
  Shield,
  ChevronDown,
  BookOpen,
  Lightbulb,
  Scale,
  Receipt,
} from 'lucide-react';
import type { SirketIslemi } from '../_types/corporate';

interface VergiAvantajiCardProps {
  islem: SirketIslemi;
}

export function VergiAvantajiCard({ islem }: VergiAvantajiCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-[#F5F6F8]/50 transition-colors"
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00A651] to-[#00804D] flex items-center justify-center shadow-lg">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-mono text-[#969696] bg-[#F5F6F8] px-1.5 py-0.5 rounded">
              {islem.kod}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#ECFDF5] text-[#00804D]">
              Vergi Avantajı
            </span>
          </div>
          <h3 className="font-bold text-[#2E2E2E]">{islem.ad}</h3>
        </div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-[#F5F6F8] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          <ChevronDown className="w-5 h-5 text-[#969696]" />
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-[#E5E5E5] animate-slide-up">
          <div className="pt-4 space-y-4">
            {/* Vergi Avantajı */}
            <div className="bg-[#ECFDF5] rounded-xl p-4 border border-[#00A651]/20">
              <h4 className="text-sm font-bold text-[#00804D] mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Vergi Avantajı
              </h4>
              <p className="text-sm text-[#2E2E2E] leading-relaxed">{islem.vergiAvantaji}</p>
            </div>

            {/* En Az Vergi Yolu */}
            <div className="bg-gradient-to-br from-[#FFFBEB] to-[#FFF08C]/20 rounded-xl p-4 border border-[#FFB114]/30">
              <h4 className="text-sm font-bold text-[#E67324] mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                En Az Vergi Çıkacak Yol
              </h4>
              <p className="text-sm text-[#2E2E2E] leading-relaxed">{islem.enAzVergiYolu}</p>
            </div>

            {/* KVK ve KDV İstisnaları */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-[#E6F9FF] rounded-xl p-4 border border-[#0078D0]/20">
                <h4 className="text-xs font-bold text-[#0049AA] mb-2 flex items-center gap-2">
                  <Scale className="w-3.5 h-3.5" />
                  KVK İstisnaları
                </h4>
                <p className="text-xs text-[#2E2E2E] leading-relaxed">{islem.kvkIstisna}</p>
              </div>
              <div className="bg-[#F5F0FF] rounded-xl p-4 border border-[#7C3AED]/20">
                <h4 className="text-xs font-bold text-[#7C3AED] mb-2 flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5" />
                  KDV İstisnaları
                </h4>
                <p className="text-xs text-[#2E2E2E] leading-relaxed">{islem.kdvIstisna}</p>
              </div>
            </div>

            {/* Yasal Dayanak */}
            <div className="flex items-center gap-2 px-3 py-2 bg-[#F5F6F8] rounded-lg">
              <BookOpen className="w-3.5 h-3.5 text-[#969696]" />
              <span className="text-xs text-[#969696]">Yasal Dayanak:</span>
              <span className="text-xs font-medium text-[#5A5A5A]">{islem.ttkMadde}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
