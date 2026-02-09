'use client';

/**
 * Kokpit Ana Kontrol Paneli
 * Risk Skoru + İnceleme Riski + Bugün Yapılacaklar
 * VdkSummaryPanel'den ayıklanmış, kokpite özel premium UI
 */

import React from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  CheckCircle2,
  ArrowRight,
  Shield,
  Target,
  BarChart3,
} from 'lucide-react';
import { getScoreColor, getScoreBorderColor } from '../../_hooks/useVdkFullAnalysis';
import type { RiskSummary, UrgentActions, AcilAksiyon } from '../../_hooks/useVdkFullAnalysis';

interface KokpitKontrolPanelProps {
  score: number;
  riskLevel: string;
  riskSummary: RiskSummary | null | undefined;
  urgentActions: UrgentActions | null | undefined;
  isLoading?: boolean;
  noData?: boolean;
}

export function KokpitKontrolPanel({
  score,
  riskLevel,
  riskSummary,
  urgentActions,
  isLoading = false,
  noData = false,
}: KokpitKontrolPanelProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden">
        <div className="bg-[#F5F6F8] px-5 py-3 border-b border-[#E5E5E5]">
          <div className="h-5 w-40 bg-[#E5E5E5] rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-3 divide-x divide-[#E5E5E5]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6">
              <div className="h-24 bg-[#F5F6F8] rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Veri yok durumu — mock/dummy skor gösterme
  if (noData) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#F5F6F8] to-[#E6F9FF] px-5 py-3 border-b border-[#E5E5E5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#0049AA] to-[#0078D0] rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-sm font-bold text-[#5A5A5A] uppercase tracking-wide">
              Ana Kontrol Paneli
            </h2>
          </div>
          <Link
            href="/v2/vdk"
            className="text-xs text-[#0049AA] hover:text-[#00287F] flex items-center gap-1 font-medium transition-colors"
          >
            Detaylı Analiz
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Veri Yok İçeriği */}
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="w-16 h-16 bg-[#F5F6F8] rounded-full flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-[#B4B4B4]" />
          </div>
          <h3 className="text-base font-semibold text-[#2E2E2E] mb-2">
            Henüz Risk Analizi Yapılmadı
          </h3>
          <p className="text-sm text-[#969696] max-w-md mb-4">
            Risk skoru hesaplamak için bu döneme ait mizan ve beyanname verilerini yüklemeniz gerekmektedir.
          </p>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 text-xs text-[#969696] bg-[#F5F6F8] px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mizan + Beyanname yükleyin
            </div>
            <ArrowRight className="w-3 h-3 text-[#B4B4B4]" />
            <div className="inline-flex items-center gap-1.5 text-xs text-[#969696] bg-[#F5F6F8] px-3 py-1.5 rounded-lg">
              <Shield className="w-3.5 h-3.5" />
              Otomatik risk analizi
            </div>
          </div>
        </div>
      </div>
    );
  }

  const scoreColor = getScoreColor(score);
  const borderColor = getScoreBorderColor(score);
  const trend = riskSummary?.trend || '0';
  const trendNum = parseInt(trend.replace('+', '').replace('-', '')) || 0;
  const isPositiveTrend = trend.includes('+');

  const inspectionProbability = riskSummary?.inspection_probability || 0;
  const inspectionLevel = riskSummary?.inspection_risk_level || 'Hesaplanıyor';

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden">
      {/* Header - LYNTOS Blue Accent */}
      <div className="bg-gradient-to-r from-[#F5F6F8] to-[#E6F9FF] px-5 py-3 border-b border-[#E5E5E5] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#0049AA] to-[#0078D0] rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-sm font-bold text-[#5A5A5A] uppercase tracking-wide">
            Ana Kontrol Paneli
          </h2>
        </div>
        <Link
          href="/v2/vdk"
          className="text-xs text-[#0049AA] hover:text-[#00287F] flex items-center gap-1 font-medium transition-colors"
        >
          Detaylı Analiz
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* 3 Kolon Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E5E5E5]">
        {/* Risk Skoru */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-[#969696]" />
            <h3 className="text-xs font-semibold text-[#969696] uppercase tracking-wide">
              Risk Skoru
            </h3>
          </div>

          <div className="flex items-center gap-4">
            {/* Skor Dairesi */}
            <div
              className={`w-20 h-20 rounded-full border-[6px] flex items-center justify-center bg-gradient-to-br from-white to-[#F5F6F8] shadow-inner ${borderColor}`}
            >
              <div className="text-center">
                <span className={`text-2xl font-black ${scoreColor}`}>{score}</span>
                <span className="text-[10px] text-[#969696] block -mt-1">/100</span>
              </div>
            </div>

            {/* Detaylar */}
            <div className="flex-1">
              {/* Trend */}
              <div className="flex items-center gap-1.5">
                {isPositiveTrend ? (
                  <TrendingUp className="w-3.5 h-3.5 text-[#F0282D]" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-[#00A651]" />
                )}
                <span
                  className={`text-xs font-semibold ${
                    isPositiveTrend ? 'text-[#F0282D]' : 'text-[#00A651]'
                  }`}
                >
                  {trendNum > 0 ? trend : '~0'} geçen ay
                </span>
              </div>

              {/* Risk Level */}
              <div className={`mt-1 text-sm font-bold ${scoreColor}`}>{riskLevel}</div>

              {/* Durum Mesajı */}
              <div className="mt-1 text-[10px] text-[#969696]">
                {score >= 80 && '✅ Düşük risk - İyi durum'}
                {score >= 60 && score < 80 && '⚠️ Orta risk - Dikkat'}
                {score >= 40 && score < 60 && '🔶 Yüksek risk - Aksiyon al'}
                {score < 40 && '🔴 Kritik! - Derhal müdahale'}
              </div>

              <div className="mt-0.5 text-[9px] text-[#969696] italic">
                (Yüksek skor = düşük risk)
              </div>
            </div>
          </div>
        </div>

        {/* İnceleme Riski */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-[#969696]" />
            <h3 className="text-xs font-semibold text-[#969696] uppercase tracking-wide">
              İnceleme Riski
            </h3>
          </div>

          <div className="flex items-center gap-4">
            {/* Yüzde */}
            <div
              className={`text-4xl font-black ${
                inspectionProbability >= 50
                  ? 'text-[#BF192B]'
                  : inspectionProbability >= 25
                    ? 'text-[#E67324]'
                    : 'text-[#00A651]'
              }`}
            >
              %{inspectionProbability}
            </div>

            {/* Detaylar */}
            <div className="flex-1">
              {/* Badge */}
              <div
                className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg ${
                  inspectionProbability >= 50
                    ? 'bg-[#FEF2F2] text-[#BF192B]'
                    : inspectionProbability >= 25
                      ? 'bg-[#FFFBEB] text-[#E67324]'
                      : 'bg-[#ECFDF5] text-[#00A651]'
                }`}
              >
                {inspectionLevel}
              </div>

              {/* En Büyük Risk */}
              {riskSummary?.top_risk_factors && riskSummary.top_risk_factors.length > 0 && (
                <div className="mt-2 text-[10px] text-[#969696]">
                  En büyük risk:{' '}
                  <span className="font-semibold text-[#5A5A5A]">
                    {riskSummary.top_risk_factors[0]}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Formül açıklaması */}
          <div className="mt-3 p-2 bg-[#F5F6F8] rounded-lg text-[9px] text-[#969696]">
            <span className="font-mono">
              = (100 - {score}) + ({riskSummary?.kurgan_triggered_count || 0} KURGAN × 10)
            </span>
          </div>
        </div>

        {/* Bugün Yapılacaklar */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#FFB114]" />
              <h3 className="text-xs font-semibold text-[#969696] uppercase tracking-wide">
                Bugün Yapılacaklar
              </h3>
            </div>
            {urgentActions && (
              <div className="flex items-center gap-1 text-[10px] text-[#969696]">
                <Clock className="w-3 h-3" />~{urgentActions.estimated_time}
              </div>
            )}
          </div>

          {urgentActions && urgentActions.items.length > 0 ? (
            <div className="space-y-2">
              {/* Aksiyon Sayısı */}
              <div className="text-sm font-bold text-[#5A5A5A]">
                {urgentActions.count} Acil Aksiyon
              </div>

              {/* Aksiyon Listesi */}
              <ul className="space-y-1.5">
                {urgentActions.items.slice(0, 3).map((action: AcilAksiyon, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-xs">
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${
                        action.oncelik === 'high'
                          ? 'bg-[#F0282D]'
                          : action.oncelik === 'medium'
                            ? 'bg-[#FFB114]'
                            : 'bg-[#00A651]'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[#5A5A5A] line-clamp-1">{action.aksiyon}</span>
                      {action.puan_etkisi != null && action.puan_etkisi !== 0 && (
                        <span className="ml-1 text-[10px] text-[#00A651] font-semibold">
                          ({action.puan_etkisi > 0 ? '+' : ''}{action.puan_etkisi} puan)
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {/* Toplam Etki */}
              {urgentActions.toplam_puan_etkisi != null &&
                urgentActions.toplam_puan_etkisi !== 0 && (
                  <div className="mt-2 pt-2 border-t border-[#E5E5E5]">
                    <div className="flex items-center gap-1.5 text-[10px] bg-[#ECFDF5] text-[#00A651] px-2 py-1.5 rounded-lg">
                      <TrendingUp className="w-3 h-3 flex-shrink-0" />
                      <span>
                        Yaparsanız: <strong>{score}</strong> →{' '}
                        <strong>
                          {Math.min(100, score + Math.abs(urgentActions.toplam_puan_etkisi))}
                        </strong>
                      </span>
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[#00A651] py-4">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Acil aksiyon yok</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default KokpitKontrolPanel;
