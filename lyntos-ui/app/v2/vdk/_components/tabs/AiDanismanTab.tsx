'use client';

/**
 * AI Danisman Tab
 * Claude + OpenAI Orkestrasyon
 */

import React, { useState, useEffect } from 'react';
import {
  useQuickSummary,
  useDetailedAnalysis,
  useAiChat,
} from '../../../_hooks/useAiAnalysis';
import type { VdkFullAnalysisData } from '../../../_hooks/useVdkFullAnalysis';
import { ProaktifUyarilar, generateProaktifUyarilar } from './ProaktifUyarilar';
import { HizliOzetPanel } from './HizliOzetPanel';
import { DetayliAnalizPanel } from './DetayliAnalizPanel';
import { ChatPanel } from './ChatPanel';

interface AiDanismanTabProps {
  clientId: string | null;
  period: string | null;
  data?: VdkFullAnalysisData | null;
}

export default function AiDanismanTab({ clientId, period, data }: AiDanismanTabProps) {
  const [inputValue, setInputValue] = useState('');
  const [autoFetched, setAutoFetched] = useState(false);

  // Hooks
  const quickSummary = useQuickSummary(clientId, period);
  const detailedAnalysis = useDetailedAnalysis(clientId, period);
  const chat = useAiChat(clientId, period);

  // Proaktif uyarilari hesapla
  const proaktifUyarilar = generateProaktifUyarilar(data);

  // Hizli ozeti otomatik yukle (client/period degistiginde)
  useEffect(() => {
    if (clientId && period && clientId.trim() !== '' && period.trim() !== '' && !autoFetched) {
      const timer = setTimeout(() => {
        quickSummary.fetchSummary();
        setAutoFetched(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [clientId, period, autoFetched, quickSummary]);

  // Client/period degistiginde autoFetched'i sifirla
  useEffect(() => {
    setAutoFetched(false);
  }, [clientId, period]);

  const handleSend = () => {
    if (inputValue.trim() && !chat.isLoading) {
      chat.sendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sol Panel - Ozet ve Detay */}
      <div className="lg:col-span-1 space-y-4">
        <ProaktifUyarilar
          uyarilar={proaktifUyarilar}
          clientId={clientId}
          period={period}
          onSendMessage={chat.sendMessage}
        />

        <HizliOzetPanel
          isLoading={quickSummary.isLoading}
          isError={quickSummary.isError}
          error={quickSummary.error}
          response={quickSummary.response}
          onRefresh={() => quickSummary.fetchSummary()}
        />

        <DetayliAnalizPanel
          isLoading={detailedAnalysis.isLoading}
          response={detailedAnalysis.response}
          onFetch={() => detailedAnalysis.fetchAnalysis()}
        />
      </div>

      {/* Sag Panel - Chat */}
      <ChatPanel
        messages={chat.messages}
        isLoading={chat.isLoading}
        error={chat.error}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSend={handleSend}
        onClearHistory={chat.clearHistory}
      />
    </div>
  );
}
