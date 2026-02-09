'use client';

/**
 * VDK Summary Panel Component
 * Risk Skoru + Inceleme Riski + Bugün Yapılacaklar
 */

import React from 'react';
import { TrendingUp, TrendingDown, AlertCircle, Clock, Zap } from 'lucide-react';
import { getScoreColor, getScoreBorderColor } from '../../_hooks/useVdkFullAnalysis';
import type { RiskSummary, UrgentActions, AcilAksiyon } from '../../_hooks/useVdkFullAnalysis';

interface VdkSummaryPanelProps {
  score: number;
  riskLevel: string;
  riskSummary: RiskSummary | null;
  urgentActions: UrgentActions | null;
}

export default function VdkSummaryPanel({
  score,
  riskLevel,
  riskSummary,
  urgentActions,
}: VdkSummaryPanelProps) {
  const scoreColor = getScoreColor(score);
  const borderColor = getScoreBorderColor(score);
  const trend = riskSummary?.trend || '0';
  const trendNum = parseInt(trend.replace('+', '').replace('-', ''));
  const isPositiveTrend = trend.includes('+');

  const inspectionProbability = riskSummary?.inspection_probability || 0;
  const inspectionLevel = riskSummary?.inspection_risk_level || 'Bilinmiyor';

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-sm overflow-hidden">
      <div className="bg-[#F5F6F8] px-4 py-2 border-b border-[#E5E5E5]">
        <h2 className="text-sm font-semibold text-[#5A5A5A] uppercase tracking-wide">
          Ana Kontrol Paneli
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E5E5E5]">
        {/* Risk Skoru */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-medium text-[#969696]">RİSK SKORU</h3>
          </div>
          <div className="flex items-center gap-4">
            <div
              className={`w-24 h-24 rounded-full border-8 flex items-center justify-center ${borderColor}`}
            >
              <div className="text-center">
                <span className={`text-3xl font-bold ${scoreColor}`}>{score}</span>
                <span className="text-sm text-[#969696] block">/100</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1">
                {isPositiveTrend ? (
                  <TrendingUp className="w-4 h-4 text-[#F0282D]" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-[#00A651]" />
                )}
                <span
                  className={`text-sm font-medium ${isPositiveTrend ? 'text-[#F0282D]' : 'text-[#00A651]'}`}
                >
                  {trend} geçen ay
                </span>
              </div>
              <div className={`mt-1 text-sm font-semibold ${scoreColor}`}>{riskLevel}</div>
              {/* Risk skoru açıklaması - SMMM için net */}
              <div className="mt-1 text-xs text-[#969696]">
                {score >= 80 && '✅ İyi durum - VDK riski düşük'}
                {score >= 60 && score < 80 && '⚠️ Dikkat - Bazı düzeltmeler gerekli'}
                {score >= 40 && score < 60 && '🔶 Risk var - Acil önlem alın'}
                {score < 40 && '🔴 Kritik! - Derhal müdahale edin'}
              </div>
              <div className="mt-1 text-xs text-[#969696] italic">
                (Yüksek skor = düşük risk)
              </div>
            </div>
          </div>
          {/* ŞEFFAFLIK: Risk Skoru Hesaplama Detayı */}
          <div className="mt-4 p-3 bg-[#F5F6F8] rounded-lg border border-[#E5E5E5] text-xs">
            <div className="font-semibold text-[#5A5A5A] mb-2 flex items-center gap-1">
              📊 Nasıl Hesaplandı?
            </div>
            <div className="space-y-1 text-[#969696]">
              <div className="font-mono bg-white px-2 py-1 rounded">
                Skor = 100 - (Kategori Risk Ort.) - (Tetiklenen KURGAN × 5)
              </div>
              <div className="mt-2">
                <span className="text-[#969696]">= 100 - </span>
                <span className="text-[#FA841E] font-medium">{100 - score - (riskSummary?.kurgan_triggered_count || 0) * 5}</span>
                <span className="text-[#969696]"> - (</span>
                <span className="text-[#BF192B] font-medium">{riskSummary?.kurgan_triggered_count || 0}</span>
                <span className="text-[#969696]"> × 5) = </span>
                <span className={`font-bold ${scoreColor}`}>{score}</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-[#E5E5E5] text-[#969696] text-[10px]">
              Kaynak: Q1 Mizan verileri (Tekdüzen Hesap Planı)
            </div>
          </div>
        </div>

        {/* Inceleme Riski */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-medium text-[#969696]">İNCELEME RİSKİ</h3>
          </div>
          <div className="flex items-center gap-4">
            <div
              className={`text-4xl font-bold ${inspectionProbability >= 50 ? 'text-[#BF192B]' : inspectionProbability >= 25 ? 'text-[#FA841E]' : 'text-[#00804D]'}`}
            >
              %{inspectionProbability}
            </div>
            <div>
              <div
                className={`text-sm font-semibold px-2 py-1 rounded ${
                  inspectionProbability >= 50
                    ? 'bg-[#FEF2F2] text-[#BF192B]'
                    : inspectionProbability >= 25
                      ? 'bg-[#FFFBEB] text-[#FA841E]'
                      : 'bg-[#ECFDF5] text-[#00804D]'
                }`}
              >
                {inspectionLevel}
              </div>
              {riskSummary?.top_risk_factors && riskSummary.top_risk_factors.length > 0 && (
                <div className="mt-2 text-xs text-[#969696]">
                  En büyük risk:{' '}
                  <span className="font-medium text-[#5A5A5A]">
                    {riskSummary.top_risk_factors[0]}
                  </span>
                </div>
              )}
            </div>
          </div>
          {/* ŞEFFAFLIK: Hesaplama açıklaması */}
          <div className="mt-3 p-2 bg-[#F5F6F8] rounded text-xs text-[#969696] border border-[#E5E5E5]">
            <div className="font-medium text-[#5A5A5A] mb-1">📊 Nasıl Hesaplandı?</div>
            <div>
              Formül: <span className="font-mono">(100 - Risk Skoru) + (Tetiklenen KURGAN × 10)</span>
            </div>
            <div className="mt-1 text-[#969696]">
              = (100 - {score}) + ({riskSummary?.kurgan_triggered_count || 0} × 10) = %{inspectionProbability}
            </div>
            <div className="mt-2 text-[#FA841E] italic">
              ⚠️ Bu tahmindir, gerçek inceleme olasılığı VDK&apos;nın risk analizine bağlıdır.
            </div>
          </div>
        </div>

        {/* Bugün Yapılacaklar */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[#969696]">BUGÜN YAPILACAKLAR</h3>
            {urgentActions && (
              <div className="flex items-center gap-1 text-xs text-[#969696]">
                <Clock className="w-3 h-3" />
                ~{urgentActions.estimated_time}
              </div>
            )}
          </div>
          {urgentActions && urgentActions.items.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#FFB114]" />
                <span className="text-sm font-semibold text-[#5A5A5A]">
                  {urgentActions.count} Acil Aksiyon
                </span>
              </div>
              <ul className="space-y-1">
                {urgentActions.items.slice(0, 3).map((action: AcilAksiyon, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        action.oncelik === 'high'
                          ? 'bg-[#F0282D]'
                          : action.oncelik === 'medium'
                            ? 'bg-[#FFB114]'
                            : 'bg-[#00A651]'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <span className="text-[#5A5A5A]">{action.aksiyon}</span>
                      {action.puan_etkisi && (
                        <span className="ml-2 text-xs text-[#00804D] font-medium">
                          ({action.puan_etkisi} puan)
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {/* Toplam puan değişim mesajı */}
              {/* KRİTİK: KURGAN'da yüksek skor = İYİ (düşük risk) */}
              {/* toplam_puan_etkisi negatif gelir (-35 gibi), skor artması için çıkarıyoruz */}
              {urgentActions.toplam_puan_etkisi && urgentActions.toplam_puan_etkisi !== 0 && (
                <div className="mt-3 pt-3 border-t border-[#E5E5E5]">
                  <div className="flex items-center gap-2 text-xs bg-[#ECFDF5] text-[#00804D] px-3 py-2 rounded-lg">
                    <TrendingUp className="w-4 h-4" />
                    <span>
                      Bu işlemleri yaparsanız risk skoru{' '}
                      <strong>{score}</strong> → <strong>{Math.min(100, score + Math.abs(urgentActions.toplam_puan_etkisi))}</strong>{' '}
                      olur <span className="text-[#00804D]">(yüksek skor = düşük risk = iyi)</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[#00804D]">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Acil aksiyon yok</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
