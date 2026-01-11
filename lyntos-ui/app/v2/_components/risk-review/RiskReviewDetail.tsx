'use client';
/**
 * LYNTOS Risk Review Detail Component
 * Sprint MOCK-006: Mock data removed, accepts data via props
 */

import React from 'react';
import { ArrowLeft, Download, MoreHorizontal, Check, Flag, MessageSquare } from 'lucide-react';
import type { RiskReviewItem, ReviewStatus } from './types';
import { REVIEW_STATUS_CONFIG } from './types';
import { RiskScoreGauge } from './RiskScoreGauge';
import { RiskInsightsPanel } from './RiskInsightsPanel';
import { RelatedDataPanel } from './RelatedDataPanel';

// Types for related data
export interface PastPeriodData {
  donem: string;
  skor: number;
  riskLevel: 'kritik' | 'yuksek' | 'orta' | 'dusuk';
  duzeltme?: boolean;
}

export interface PartnerData {
  ad: string;
  oran: number;
}

interface RiskReviewDetailProps {
  item: RiskReviewItem;
  onBack?: () => void;
  onStatusChange?: (status: ReviewStatus) => void;
  // Related data - fetched by parent or passed from selection
  pastPeriods?: PastPeriodData[];
  partners?: PartnerData[];
  aiOnerisi?: string;
  legalRefs?: string[];
}

export function RiskReviewDetail({
  item,
  onBack,
  onStatusChange,
  pastPeriods = [],
  partners = [],
  aiOnerisi,
  legalRefs = [],
}: RiskReviewDetailProps) {
  const statusConfig = REVIEW_STATUS_CONFIG[item.status];

  // Use item's aiOnerisi if available, otherwise use prop
  const displayAiOnerisi = item.aiOnerisi || aiOnerisi || '';

  return (
    <div className="min-h-screen bg-[#f6f9fc]">
      {/* Top Bar - Stripe style */}
      <div className="bg-white border-b border-[#e3e8ee]">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[14px] text-[#635bff] hover:text-[#5851ea] font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Bekleyen Islemler
          </button>

          <div className="flex items-center gap-2">
            <button className="p-2 text-[#697386] hover:text-[#1a1f36] hover:bg-[#f6f9fc] rounded-md">
              <Download className="w-4 h-4" />
            </button>
            <button className="p-2 text-[#697386] hover:text-[#1a1f36] hover:bg-[#f6f9fc] rounded-md">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column - Summary Card */}
          <div className="lg:col-span-4">
            <div className="bg-white border border-[#e3e8ee] rounded-lg p-6">
              {/* Score Gauge */}
              <div className="flex justify-center mb-6">
                <RiskScoreGauge
                  score={item.riskSkoru}
                  riskLevel={item.riskLevel}
                  size="lg"
                />
              </div>

              {/* Company Name */}
              <div className="text-center mb-6">
                <h1 className="text-[18px] font-semibold text-[#1a1f36] mb-1">
                  {item.mukellefAdi}
                </h1>
                {item.mukellefVkn && (
                  <p className="text-[13px] font-mono text-[#697386]">
                    VKN: {item.mukellefVkn}
                  </p>
                )}
              </div>

              {/* Meta - Stripe style key-value */}
              <div className="space-y-3 pt-4 border-t border-[#e3e8ee]">
                {item.sektor && (
                  <div className="flex justify-between text-[14px]">
                    <span className="text-[#697386]">Sektor</span>
                    <span className="text-[#1a1f36] font-medium">{item.sektor}</span>
                  </div>
                )}
                <div className="flex justify-between text-[14px]">
                  <span className="text-[#697386]">Donem</span>
                  <span className="text-[#1a1f36] font-medium">{item.donem}</span>
                </div>
                <div className="flex justify-between text-[14px] items-center">
                  <span className="text-[#697386]">Durum</span>
                  <span className={`px-2 py-0.5 rounded text-[12px] font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>

              {/* Related Data */}
              {(pastPeriods.length > 0 || partners.length > 0) && (
                <div className="mt-6 pt-4 border-t border-[#e3e8ee]">
                  <RelatedDataPanel
                    pastPeriods={pastPeriods}
                    partners={partners}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Risk Insights */}
          <div className="lg:col-span-8">
            <div className="bg-white border border-[#e3e8ee] rounded-lg p-6">
              <RiskInsightsPanel
                factors={item.topRiskFactors}
                aiOnerisi={displayAiOnerisi}
                legalRefs={legalRefs}
              />
            </div>

            {/* Actions Bar */}
            <div className="mt-4 bg-white border border-[#e3e8ee] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-[#697386] font-medium uppercase tracking-wider">
                  Islemler
                </span>

                <div className="flex-1" />

                <button
                  onClick={() => onStatusChange?.('approved')}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0caf60] hover:bg-[#0a9a55] text-white rounded-md text-[14px] font-medium transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Temiz
                </button>

                <button
                  onClick={() => onStatusChange?.('flagged')}
                  className="flex items-center gap-2 px-4 py-2 bg-[#cd3d64] hover:bg-[#b8365a] text-white rounded-md text-[14px] font-medium transition-colors"
                >
                  <Flag className="w-4 h-4" />
                  Riskli
                </button>

                <button
                  className="flex items-center gap-2 px-4 py-2 border border-[#e3e8ee] hover:bg-[#f6f9fc] text-[#1a1f36] rounded-md text-[14px] font-medium transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Not
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
