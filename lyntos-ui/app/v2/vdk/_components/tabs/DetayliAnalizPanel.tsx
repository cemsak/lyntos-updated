'use client';

import React from 'react';
import { FileText, Sparkles, Loader2, Coins, AlertCircle } from 'lucide-react';
import { getProviderIcon, formatCost, formatTokens } from '../../../_hooks/useAiAnalysis';
import type { AiAnalysisResponse } from '../../../_hooks/useAiAnalysis';

interface DetayliAnalizPanelProps {
  isLoading: boolean;
  response: AiAnalysisResponse | null;
  onFetch: () => void;
}

export function DetayliAnalizPanel({ isLoading, response, onFetch }: DetayliAnalizPanelProps) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
      <div className="bg-gradient-to-r from-[#E6F9FF] to-[#FEF2F2] px-4 py-3 border-b border-[#E5E5E5]">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#2E2E2E] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#0049AA]" />
            Detayli Analiz
          </h3>
        </div>
      </div>
      <div className="p-4">
        {!response ? (
          <div className="text-center">
            <p className="text-[#969696] text-sm mb-4">
              Mevzuat referansli detayli analiz icin asagidaki butona tiklayin.
            </p>
            <button
              onClick={onFetch}
              disabled={isLoading}
              className="px-4 py-2 bg-[#0049AA] text-white rounded-lg text-sm font-medium hover:bg-[#0049AA] disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analiz yapiliyor...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Detayli Analiz Iste (Claude)
                </>
              )}
            </button>
          </div>
        ) : response.response.success ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-[#969696]">
              <span>{getProviderIcon(response.ai_provider)}</span>
              <span>{response.model}</span>
              <span>|</span>
              <Coins className="w-3 h-3" />
              <span>{formatCost(response.cost_estimate)}</span>
              <span>|</span>
              <span>{formatTokens(response.tokens_used.total)} token</span>
            </div>
            <div className="prose prose-sm max-w-none text-[#5A5A5A] max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm font-sans">
                {response.response.content}
              </pre>
            </div>
          </div>
        ) : (
          <div className="text-[#BF192B] text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {response.response.error}
          </div>
        )}
      </div>
    </div>
  );
}
