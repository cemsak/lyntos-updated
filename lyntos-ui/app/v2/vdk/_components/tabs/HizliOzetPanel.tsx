'use client';

import React from 'react';
import { Sparkles, RefreshCw, Clock, Loader2, AlertCircle } from 'lucide-react';
import { getProviderIcon } from '../../../_hooks/useAiAnalysis';
import type { AiAnalysisResponse } from '../../../_hooks/useAiAnalysis';

interface HizliOzetPanelProps {
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  response: AiAnalysisResponse | null;
  onRefresh: () => void;
}

export function HizliOzetPanel({ isLoading, isError, error, response, onRefresh }: HizliOzetPanelProps) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
      <div className="bg-gradient-to-r from-[#E6F9FF] to-[#E6F9FF] px-4 py-3 border-b border-[#E5E5E5]">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#2E2E2E] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0049AA]" />
            Hizli Ozet
          </h3>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="text-[#969696] hover:text-[#5A5A5A]"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
        {response && (
          <div className="flex items-center gap-2 mt-1 text-xs text-[#969696]">
            <span>{getProviderIcon(response.ai_provider)}</span>
            <span>{response.model}</span>
            <span>|</span>
            <Clock className="w-3 h-3" />
            <span>{response.processing_time_ms}ms</span>
          </div>
        )}
      </div>
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#0049AA]" />
            <span className="ml-2 text-[#969696]">Ozet hazirlaniyor...</span>
          </div>
        ) : response?.response.success ? (
          <div className="prose prose-sm max-w-none text-[#5A5A5A]">
            <pre className="whitespace-pre-wrap text-sm font-sans">
              {response.response.content}
            </pre>
          </div>
        ) : isError ? (
          <div className="text-[#BF192B] text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        ) : (
          <p className="text-[#969696] text-sm">
            Mukellefin hizli risk ozeti icin butona tiklayin.
          </p>
        )}
      </div>
    </div>
  );
}
