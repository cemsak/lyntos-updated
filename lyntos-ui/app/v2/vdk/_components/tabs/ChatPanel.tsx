'use client';

import React, { useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Loader2,
  MessageSquare,
  AlertCircle,
  Info,
} from 'lucide-react';
import { getProviderIcon } from '../../../_hooks/useAiAnalysis';
import type { ChatMessage } from '../../../_hooks/useAiAnalysis';

// YMM/SMMM seviyesinde profesyonel ornek sorular
const EXAMPLE_QUESTIONS = [
  'VDK inceleme riski ve KURGAN senaryolarini analiz et',
  'TTK 376 sermaye kaybi durumu icin yasal yukumlulukler nelerdir?',
  'Kasa siskinligi icin adat faizi hesaplama yontemi ve mevzuat dayanagi nedir?',
  'KVK 12 ortulu sermaye hesaplamasi ve KKEG etkisi nedir?',
  'Transfer fiyatlandirmasi dokumantasyon yukumlulukleri nelerdir?',
  'Devreden KDV 36 ay kurali ve VDK risk senaryosu acikla',
];

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onClearHistory: () => void;
}

export function ChatPanel({
  messages,
  isLoading,
  error,
  inputValue,
  onInputChange,
  onSend,
  onClearHistory,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="lg:col-span-2">
      <div className="bg-white rounded-xl border border-[#E5E5E5] h-[600px] flex flex-col">
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-[#F5F6F8] to-[#F5F6F8] px-4 py-3 border-b border-[#E5E5E5]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-[#2E2E2E] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#5A5A5A]" />
                YMM/SMMM Danismani
              </h3>
              <p className="text-xs text-[#969696] mt-0.5">
                Mevzuat referansli profesyonel yanitlar - Claude AI + RAG
              </p>
            </div>
            {messages.length > 0 && (
              <button
                onClick={onClearHistory}
                className="text-xs text-[#969696] hover:text-[#5A5A5A]"
              >
                Temizle
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <EmptyState onSelectQuestion={onInputChange} />
          ) : (
            messages.map((msg: ChatMessage, idx: number) => (
              <MessageBubble key={idx} message={msg} />
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#F5F6F8] rounded-lg p-3">
                <Loader2 className="w-5 h-5 animate-spin text-[#969696]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#E5E5E5]">
          <div className="flex gap-2">
            <textarea
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Sorunuzu yazin..."
              className="flex-1 resize-none border border-[#B4B4B4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D0] focus:border-transparent"
              rows={2}
            />
            <button
              onClick={onSend}
              disabled={!inputValue.trim() || isLoading}
              className="px-4 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#0049AA] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          {error && (
            <div className="mt-2 text-xs text-[#BF192B] flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onSelectQuestion }: { onSelectQuestion: (q: string) => void }) {
  return (
    <div className="text-center py-8">
      <Bot className="w-12 h-12 text-[#B4B4B4] mx-auto mb-4" />
      <h4 className="font-medium text-[#5A5A5A] mb-2">
        YMM/SMMM Seviyesinde Mevzuat Danismanligi
      </h4>
      <p className="text-[#969696] text-sm mb-4 max-w-md mx-auto">
        VDK risk analizi, vergi mevzuati, TTK, KVK ve ilgili tum konularda
        <strong> kaynak referansli</strong> profesyonel yanitlar alin.
      </p>

      {/* Bilgi Notu */}
      <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-3 mb-4 max-w-md mx-auto text-left">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-[#0049AA] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-[#00287F]">
            <strong>AI Yanitlari Hakkinda:</strong> Yanitlar Claude AI tarafindan mukellef verileriniz
            ve guncel mevzuat bilgisiyle uretilir. Her yanıtta mevzuat referansi (VUK, KVK, GVK, TTK vb.)
            belirtilir. Kesin kararlar icin YMM/SMMM danismanligi onerilir.
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-[#969696] uppercase">Ornek Sorular:</p>
        <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
          {EXAMPLE_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => onSelectQuestion(q)}
              className="text-xs bg-[#F5F6F8] hover:bg-[#E5E5E5] text-[#5A5A5A] px-3 py-1.5 rounded-full transition-colors text-left"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          message.role === 'user'
            ? 'bg-[#0049AA] text-white'
            : 'bg-[#F5F6F8] text-[#2E2E2E]'
        }`}
      >
        {message.role === 'assistant' && message.provider && (
          <div className="flex items-center gap-1 text-xs text-[#969696] mb-1">
            <span>{getProviderIcon(message.provider)}</span>
            <span>{message.model}</span>
          </div>
        )}
        <pre className="whitespace-pre-wrap text-sm font-sans">{message.content}</pre>
        <div
          className={`text-xs mt-1 ${
            message.role === 'user' ? 'text-[#ABEBFF]' : 'text-[#969696]'
          }`}
        >
          {message.timestamp.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
