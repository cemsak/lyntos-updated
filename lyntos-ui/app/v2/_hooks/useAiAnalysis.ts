/**
 * LYNTOS AI Analysis Hook
 * VDK AI Destekli Analiz - Claude + OpenAI Orkestrasyon
 *
 * POST /api/v1/contracts/vdk-ai-analysis
 */

'use client';

import { useState, useCallback } from 'react';
import { API_ENDPOINTS } from '../_lib/config/api';
import { api } from '../_lib/api/client';

// ============================================================================
// TYPES
// ============================================================================

export type AnalysisType = 'quick_summary' | 'detailed' | 'izah_text' | 'question';

export interface AiAnalysisContext {
  question?: string;
  scenario?: string;
  focus_area?: string;
  specific_issue?: string;
  conversation_history?: Array<{ role: string; content: string }>;
}

export interface AiAnalysisRequest {
  client_id: string;
  period: string;
  analysis_type: AnalysisType;
  context?: AiAnalysisContext;
}

export interface AiAnalysisResponse {
  ai_provider: string;
  model: string;
  response: {
    content: string;
    success: boolean;
    error: string | null;
  };
  tokens_used: {
    total: number;
    input: number;
    output: number;
  };
  cost_estimate: string;
  processing_time_ms: number;
  risk_summary: {
    total_score: number;
    trend: string;
    inspection_probability: number;
    inspection_risk_level: string;
    top_risk_factors: string[];
  } | null;
  trust_score: number;
}

export interface AiAnalysisState {
  response: AiAnalysisResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
  provider?: string;
}

// ============================================================================
// HOOK: Single Analysis
// ============================================================================

export function useAiAnalysis() {
  const [state, setState] = useState<AiAnalysisState>({
    response: null,
    isLoading: false,
    isError: false,
    error: null,
  });

  const analyze = useCallback(async (request: AiAnalysisRequest): Promise<AiAnalysisResponse | null> => {
    // HTTP 422 hatasını önle - clientId ve period kontrolü
    if (!request.client_id || !request.period) {
      console.warn('[AiAnalysis] client_id veya period boş, istek iptal edildi');
      setState({
        response: null,
        isLoading: false,
        isError: true,
        error: 'Müşteri ve dönem seçilmeli',
      });
      return null;
    }

    setState((prev) => ({ ...prev, isLoading: true, isError: false, error: null }));

    try {
      const { data: result, error: apiError } = await api.post<AiAnalysisResponse>(
        API_ENDPOINTS.contracts.vdkAiAnalysis, request, { timeout: 120_000 }
      );

      if (apiError || !result) {
        throw new Error(apiError || 'AI analiz yanitialinmadi');
      }

      setState({
        response: result,
        isLoading: false,
        isError: false,
        error: null,
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      console.error('[AiAnalysis] Error:', errorMessage);

      setState({
        response: null,
        isLoading: false,
        isError: true,
        error: errorMessage,
      });

      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      response: null,
      isLoading: false,
      isError: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    analyze,
    reset,
  };
}

// ============================================================================
// HOOK: Chat Interface
// ============================================================================

export function useAiChat(clientId: string | null, period: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (userMessage: string): Promise<void> => {
      // Boş string kontrolü - '' (empty string) falsy değil!
      if (!clientId || !period || clientId.trim() === '' || period.trim() === '') {
        console.warn('[AiChat] clientId veya period boş/geçersiz, mesaj gönderilemedi');
        setError('Lütfen müşteri ve dönem seçin');
        return;
      }

      // Add user message
      const userMsg: ChatMessage = {
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setError(null);

      // Build conversation history for context
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const { data: result, error: chatApiError } = await api.post<AiAnalysisResponse>(
          API_ENDPOINTS.contracts.vdkAiAnalysis,
          {
            client_id: clientId,
            period: period,
            analysis_type: 'question',
            context: {
              question: userMessage,
              conversation_history: history,
            },
          },
          { timeout: 120_000 }
        );

        if (chatApiError || !result) {
          throw new Error(chatApiError || 'AI yaniti alinamadi');
        }

        if (result.response.success) {
          const assistantMsg: ChatMessage = {
            role: 'assistant',
            content: result.response.content,
            timestamp: new Date(),
            model: result.model,
            provider: result.ai_provider,
          };
          setMessages((prev) => [...prev, assistantMsg]);
        } else {
          throw new Error(result.response.error || 'AI yanit veremedi');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
        setError(errorMessage);

        // Add error message as assistant response
        const errorMsg: ChatMessage = {
          role: 'assistant',
          content: `Hata: ${errorMessage}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [clientId, period, messages]
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearHistory,
  };
}

// ============================================================================
// SHORTCUT HOOKS
// ============================================================================

/**
 * Hizli ozet al (OpenAI GPT-4o-mini)
 */
export function useQuickSummary(clientId: string | null, period: string | null) {
  const { analyze, ...state } = useAiAnalysis();

  const fetchSummary = useCallback(async () => {
    // Boş string kontrolü - HTTP 422 hatasını önle
    if (!clientId || !period || clientId.trim() === '' || period.trim() === '') {
      console.warn('[useQuickSummary] clientId veya period boş/geçersiz');
      return null;
    }
    return analyze({
      client_id: clientId,
      period: period,
      analysis_type: 'quick_summary',
    });
  }, [clientId, period, analyze]);

  return { ...state, fetchSummary };
}

/**
 * Detayli analiz al (Claude)
 */
export function useDetailedAnalysis(clientId: string | null, period: string | null) {
  const { analyze, ...state } = useAiAnalysis();

  const fetchAnalysis = useCallback(
    async (focusArea?: string) => {
      // Boş string kontrolü - HTTP 422 hatasını önle
      if (!clientId || !period || clientId.trim() === '' || period.trim() === '') {
        console.warn('[useDetailedAnalysis] clientId veya period boş/geçersiz');
        return null;
      }
      return analyze({
        client_id: clientId,
        period: period,
        analysis_type: 'detailed',
        context: focusArea ? { focus_area: focusArea } : undefined,
      });
    },
    [clientId, period, analyze]
  );

  return { ...state, fetchAnalysis };
}

/**
 * Izah metni uret (Claude)
 */
export function useIzahGenerator(clientId: string | null, period: string | null) {
  const { analyze, ...state } = useAiAnalysis();

  const generateIzah = useCallback(
    async (scenario: string, specificIssue?: string) => {
      // Boş string kontrolü - HTTP 422 hatasını önle
      if (!clientId || !period || clientId.trim() === '' || period.trim() === '') {
        console.warn('[useIzahGenerator] clientId veya period boş/geçersiz');
        return null;
      }
      return analyze({
        client_id: clientId,
        period: period,
        analysis_type: 'izah_text',
        context: {
          scenario,
          specific_issue: specificIssue,
        },
      });
    },
    [clientId, period, analyze]
  );

  return { ...state, generateIzah };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getProviderLabel(provider: string): string {
  const labels: Record<string, string> = {
    claude: 'Claude (Anthropic)',
    openai_gpt4o: 'GPT-4o (OpenAI)',
    openai_gpt4o_mini: 'GPT-4o-mini (OpenAI)',
  };
  return labels[provider] || provider;
}

export function getProviderIcon(provider: string): string {
  if (provider.includes('claude')) return '🧠';
  if (provider.includes('openai')) return '🤖';
  return '💬';
}

export function formatCost(cost: string): string {
  // "$0.0012 USD" -> "0.12¢"
  const match = cost.match(/\$?([\d.]+)/);
  if (!match) return cost;
  const value = parseFloat(match[1]);
  if (value < 0.01) {
    return `${(value * 100).toFixed(2)}¢`;
  }
  return `$${value.toFixed(2)}`;
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toString();
}

// ============================================================================
// MEVZUAT RAG HOOK - Yeni Eklendi
// ============================================================================

export interface MevzuatRAGResponse {
  cevap: string;
  mevzuat_referanslari: Array<{
    kaynak: string;
    madde: string;
    ozet: string;
  }>;
  pratik_uygulama?: string;
  dikkat_edilecekler?: string[];
  ilgili_hesap_kodlari?: string[];
  guven_skoru: number;
  model_used: string;
  tokens_used: number;
  processing_time_ms: number;
  rag_sources?: Array<{
    kaynak: string;
    baslik: string;
    referans: string;
    ozet: string;
    url: string;
    guven_skoru: number;
  }>;
}

export interface MevzuatRAGState {
  response: MevzuatRAGResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
}

/**
 * Mevzuat RAG Hook - YMM/SMMM soruları için mevzuat destekli AI yanıtı
 *
 * Kaynaklar: mevzuat.gov.tr, dijital.gib.gov.tr, LYNTOS mevzuat veritabanı
 *
 * @example
 * const { askQuestion, response, isLoading } = useMevzuatRAG();
 * askQuestion("TTK 376 sermaye kaybı durumunda ne yapmalıyım?");
 */
export function useMevzuatRAG() {
  const [state, setState] = useState<MevzuatRAGState>({
    response: null,
    isLoading: false,
    isError: false,
    error: null,
  });

  const askQuestion = useCallback(async (
    question: string,
    context?: Record<string, unknown>
  ): Promise<MevzuatRAGResponse | null> => {
    if (!question.trim()) {
      return null;
    }

    setState({
      response: null,
      isLoading: true,
      isError: false,
      error: null,
    });

    try {
      const { data: result, error: apiError } = await api.post<MevzuatRAGResponse>(
        API_ENDPOINTS.ai.mevzuatRag,
        { question, context: context || null, include_sources: true },
        { timeout: 60_000 }
      );

      if (apiError || !result) {
        throw new Error(apiError || 'Mevzuat RAG yaniti alinamadi');
      }

      setState({
        response: result,
        isLoading: false,
        isError: false,
        error: null,
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setState({
        response: null,
        isLoading: false,
        isError: true,
        error: errorMessage,
      });
      return null;
    }
  }, []);

  return {
    ...state,
    askQuestion,
  };
}
