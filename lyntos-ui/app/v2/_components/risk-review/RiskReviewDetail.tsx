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
    <div className="min-h-screen bg-[#F5F6F8]">
      {/* Top Bar - Stripe style */}
      <div className="bg-white border-b border-[#E5E5E5]">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[14px] text-[#0049AA] hover:text-[#00287F] font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Bekleyen İşlemler
          </button>

          <div className="flex items-center gap-2">
            <button className="p-2 text-[#5A5A5A] hover:text-[#2E2E2E] hover:bg-[#F5F6F8] rounded-md">
              <Download className="w-4 h-4" />
            </button>
            <button className="p-2 text-[#5A5A5A] hover:text-[#2E2E2E] hover:bg-[#F5F6F8] rounded-md">
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
            <div className="bg-white border border-[#E5E5E5] rounded-lg p-6">
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
                <h1 className="text-[18px] font-semibold text-[#2E2E2E] mb-1">
                  {item.mukellefAdi}
                </h1>
                {item.mukellefVkn && (
                  <p className="text-[13px] font-mono text-[#5A5A5A]">
                    VKN: {item.mukellefVkn}
                  </p>
                )}
              </div>

              {/* Meta - Stripe style key-value */}
              <div className="space-y-3 pt-4 border-t border-[#E5E5E5]">
                {item.sektor && (
                  <div className="flex justify-between text-[14px]">
                    <span className="text-[#5A5A5A]">Sektor</span>
                    <span className="text-[#2E2E2E] font-medium">{item.sektor}</span>
                  </div>
                )}
                <div className="flex justify-between text-[14px]">
                  <span className="text-[#5A5A5A]">Donem</span>
                  <span className="text-[#2E2E2E] font-medium">{item.donem}</span>
                </div>
                <div className="flex justify-between text-[14px] items-center">
                  <span className="text-[#5A5A5A]">Durum</span>
                  <span className={`px-2 py-0.5 rounded text-[12px] font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>

              {/* Related Data */}
              {(pastPeriods.length > 0 || partners.length > 0) && (
                <div className="mt-6 pt-4 border-t border-[#E5E5E5]">
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
            <div className="bg-white border border-[#E5E5E5] rounded-lg p-6">
              <RiskInsightsPanel
                factors={item.topRiskFactors}
                aiOnerisi={displayAiOnerisi}
                legalRefs={legalRefs}
              />
            </div>

            {/* Actions Bar */}
            <div className="mt-4 bg-white border border-[#E5E5E5] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-[#5A5A5A] font-medium uppercase tracking-wider">
                  İşlemler
                </span>

                <div className="flex-1" />

                <button
                  onClick={() => onStatusChange?.('approved')}
                  className="flex items-center gap-2 px-4 py-2 bg-[#00A651] hover:bg-[#00A651] text-white rounded-md text-[14px] font-medium transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Temiz
                </button>

                <button
                  onClick={() => onStatusChange?.('flagged')}
                  className="flex items-center gap-2 px-4 py-2 bg-[#F0282D] hover:bg-[#BF192B] text-white rounded-md text-[14px] font-medium transition-colors"
                >
                  <Flag className="w-4 h-4" />
                  Riskli
                </button>

                <button
                  className="flex items-center gap-2 px-4 py-2 border border-[#E5E5E5] hover:bg-[#F5F6F8] text-[#2E2E2E] rounded-md text-[14px] font-medium transition-colors"
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
