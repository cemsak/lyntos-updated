'use client';

import React from 'react';
import {
  Building2,
  ChevronDown,
  FileText,
  CheckCircle2,
  AlertTriangle,
  CircleDot,
  Info,
  Shield,
} from 'lucide-react';
import type { SirketIslemi } from '../_types/corporate';

interface IslemCardProps {
  islem: SirketIslemi;
  isExpanded: boolean;
  onToggle: () => void;
  index: number;
}

const kategoriConfig = {
  kurulus: { color: 'from-[#00A651] to-[#00804D]', badge: 'bg-[#ECFDF5] text-[#00804D]' },
  sermaye: { color: 'from-[#0078D0] to-[#0049AA]', badge: 'bg-[#E6F9FF] text-[#0049AA]' },
  yapisal: { color: 'from-[#0049AA] to-[#00287F]', badge: 'bg-[#E6F9FF] text-[#0049AA]' },
  devir: { color: 'from-[#FFB114] to-[#FA841E]', badge: 'bg-[#FFFBEB] text-[#E67324]' },
  tasfiye: { color: 'from-[#5A5A5A] to-[#2E2E2E]', badge: 'bg-[#F5F6F8] text-[#5A5A5A]' },
};

export function IslemCard({
  islem,
  isExpanded,
  onToggle,
  index,
}: IslemCardProps) {
  const cfg = kategoriConfig[islem.kategori];

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border bg-white border-[#E5E5E5]
        transition-all duration-500 animate-slide-up
        ${isExpanded ? 'ring-2 ring-[#0078D0]/30' : ''}
      `}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-center gap-4 hover:bg-[#F5F6F8]/50 transition-colors"
      >
        {/* Icon */}
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${cfg.color} flex items-center justify-center shadow-lg`}>
          <Building2 className="w-7 h-7 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-[#969696] bg-[#F5F6F8] px-1.5 py-0.5 rounded">{islem.kod}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
              {islem.sirketTuru.join(' / ')}
            </span>
          </div>
          <h3 className="font-bold text-[#2E2E2E] text-lg">{islem.ad}</h3>
          <p className="text-sm text-[#969696] mt-0.5 line-clamp-1">{islem.aciklama}</p>
        </div>

        {/* Süre & Zorluk */}
        <div className="text-right mr-4">
          <p className="text-sm font-medium text-[#5A5A5A]">{islem.tahminiSure}</p>
          <div className="flex items-center gap-1 justify-end mt-1">
            {[1, 2, 3, 4, 5].map(n => (
              <div
                key={n}
                className={`w-2 h-2 rounded-full transition-colors ${
                  n <= islem.zorlukDerecesi ? 'bg-[#FFB114]' : 'bg-[#E5E5E5]'
                }`}
              />
            ))}
            <span className="text-xs text-[#969696] ml-1">Zorluk</span>
          </div>
        </div>

        {/* Chevron */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-[#F5F6F8] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          <ChevronDown className="w-5 h-5 text-[#969696]" />
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-[#E5E5E5] animate-slide-up">
          <div className="pt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sol - Evraklar + Önemli Hususlar */}
            <div className="space-y-4">
              <div className="bg-[#F5F6F8] rounded-xl p-4">
                <h4 className="text-sm font-bold text-[#5A5A5A] mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0078D0]" />
                  Gerekli Evraklar
                </h4>
                <div className="space-y-2">
                  {islem.gerekliEvraklar.map((evrak, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-[#5A5A5A]">
                      <CheckCircle2 className="w-4 h-4 text-[#00A651] mt-0.5 flex-shrink-0" />
                      {evrak}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#FFFBEB] rounded-xl p-4 border border-[#FFB114]/50">
                <h4 className="text-sm font-bold text-[#E67324] mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Önemli Hususlar
                </h4>
                <div className="space-y-2">
                  {islem.onemliHususlar.map((husus, i) => (
                    <div key={i} className="text-sm text-[#E67324] flex items-start gap-2">
                      <CircleDot className="w-3 h-3 text-[#FFB114] mt-1 flex-shrink-0" />
                      {husus}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sağ - Vergi Bilgileri + Notlar */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-[#E5E5E5] rounded-xl p-3 shadow-sm">
                  <p className="text-xs text-[#969696]">Yasal Dayanak</p>
                  <p className="font-semibold text-[#2E2E2E] mt-1">{islem.ttkMadde}</p>
                </div>
                <div className="bg-white border border-[#E5E5E5] rounded-xl p-3 shadow-sm">
                  <p className="text-xs text-[#969696]">Tahmini Süre</p>
                  <p className="font-semibold text-[#2E2E2E] mt-1">{islem.tahminiSure}</p>
                </div>
                <div className="bg-white border border-[#E5E5E5] rounded-xl p-3 shadow-sm col-span-2">
                  <p className="text-xs text-[#969696]">Damga Vergisi</p>
                  <p className="font-semibold text-[#2E2E2E] mt-1">
                    {islem.damgaVergisiOrani > 0 ? `‰${(islem.damgaVergisiOrani * 1000).toFixed(2)}` : 'İstisna'}
                  </p>
                </div>
              </div>

              {/* Vergi Avantajı Özet */}
              <div className="bg-[#ECFDF5] rounded-xl p-4 border border-[#00A651]/20">
                <h4 className="text-sm font-bold text-[#00804D] mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Vergi Avantajı
                </h4>
                <p className="text-xs text-[#2E2E2E] leading-relaxed line-clamp-3">{islem.vergiAvantaji}</p>
              </div>

              <div className="bg-[#E6F9FF] rounded-xl p-4 border border-[#0078D0]/50">
                <h4 className="text-sm font-bold text-[#0049AA] mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Notlar
                </h4>
                <ul className="space-y-1">
                  {islem.notlar.map((not, i) => (
                    <li key={i} className="text-sm text-[#0049AA] flex items-start gap-2">
                      <CircleDot className="w-3 h-3 text-[#0078D0] mt-1 flex-shrink-0" />
                      {not}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
