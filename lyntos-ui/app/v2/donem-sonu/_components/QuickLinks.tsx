'use client';

/**
 * QuickLinks - Dönem sonu hızlı erişim bağlantıları
 */

import React from 'react';
import {
  Shield,
  TrendingUp,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { type QuickLinksProps } from '../_types';

export function QuickLinks({ onNavigate }: QuickLinksProps) {
  return (
      <div className="grid sm:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate('/v2/vdk')}
          className="flex items-center gap-3 p-4 bg-gradient-to-br from-[#E6F9FF] to-[#E6F9FF] border border-[#ABEBFF] rounded-xl hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 bg-[#0078D0] rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform">
            <Shield className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-[#00287F]">VDK Risk Analizi</p>
            <p className="text-xs text-[#0049AA]">13 kriter kontrolü</p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#00B4EB] ml-auto group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => onNavigate('/v2/corporate')}
          className="flex items-center gap-3 p-4 bg-gradient-to-br from-[#ECFDF5] to-[#ECFDF5] border border-[#AAE8B8] rounded-xl hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 bg-[#00A651] rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-[#005A46]">Şirketler Hukuku</p>
            <p className="text-xs text-[#00804D]">TTK işlemleri</p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#00CB50] ml-auto group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => onNavigate('/v2/quarterly')}
          className="flex items-center gap-3 p-4 bg-gradient-to-br from-[#E6F9FF] to-[#E6F9FF] border border-[#ABEBFF] rounded-xl hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 bg-[#0078D0] rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-[#00287F]">Dönemsel Analiz</p>
            <p className="text-xs text-[#0049AA]">3 aylık raporlar</p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#00B4EB] ml-auto group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
  );
}
