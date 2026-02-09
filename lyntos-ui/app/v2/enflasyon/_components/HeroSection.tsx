'use client';

import React from 'react';
import { TrendingUp, Calendar, Flame } from 'lucide-react';

interface HeroSectionProps {
  completedStepsCount: number;
  totalSteps: number;
  progressPercentage: number;
}

export function HeroSection({ completedStepsCount, totalSteps, progressPercentage }: HeroSectionProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl">
      <div className="absolute inset-0 bg-gradient-to-br from-[#FA841E] via-[#BF192B] to-[#BF192B]">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-72 h-72 bg-[#FFCE19] rounded-full filter blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#FF555F] rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-[#FFE045] rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute bottom-0 w-1 bg-gradient-to-t from-[#FFCE19]/60 to-transparent rounded-full animate-pulse"
              style={{
                left: `${15 + i * 18}%`,
                height: `${30 + Math.random() * 40}%`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }} />
      </div>

      <div className="relative p-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FFCE19] to-[#FFB114] flex items-center justify-center shadow-2xl shadow-[#FFB114]/30">
                <TrendingUp className="w-9 h-9 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white flex items-center gap-3">
                  Yeniden Değerleme
                  <Flame className="w-8 h-8 text-[#FFE045] animate-pulse" />
                </h1>
                <p className="text-[#FFFBEB] font-medium">VUK Mük. 298/Ç Sürekli Yeniden Değerleme</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mt-6">
              {[
                { label: '2025 Durum', value: 'İHTİYARİ', color: 'bg-white/20' },
                { label: 'Endeks', value: 'Yİ-ÜFE', color: 'bg-white/20' },
                { label: 'Dayanak', value: 'VUK 298/Ç', color: 'bg-white/20' },
                { label: 'Tamamlanan', value: `${completedStepsCount}/3`, color: 'bg-white/20' },
              ].map((stat, i) => (
                <div key={i} className={`${stat.color} backdrop-blur-sm rounded-xl p-3 text-center`}>
                  <p className="text-2xl font-black text-white">{stat.value}</p>
                  <p className="text-[10px] text-white/70 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 min-w-[240px]">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-[#FFE045]" />
              <span className="text-white font-semibold">Bilanço Tarihi</span>
            </div>
            <p className="text-4xl font-black text-white">31.12.2025</p>
            <p className="text-sm text-[#FFF08C] mt-1">Son beyan: 30.04.2026</p>

            <div className="mt-6 pt-4 border-t border-white/20">
              <div className="flex justify-between text-sm text-white mb-2">
                <span>İlerleme</span>
                <span>{completedStepsCount}/{totalSteps}</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FFCE19] to-[#FFCE19] rounded-full transition-all duration-1000"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
