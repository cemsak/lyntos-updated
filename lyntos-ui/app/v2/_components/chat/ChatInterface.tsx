/**
 * LYNTOS Chat Interface
 * Birleşik Asistan + Legacy Agent Desteği
 *
 * GÜVENLIK DÜZELTMELERI (2026-02-05):
 * - XSS koruması: sanitizeHtml eklendi
 * - Multi-tenant: scope'tan user_id alınıyor
 */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { API_ENDPOINTS } from '../../_lib/config/api';
import { api } from '../../_lib/api/client';
import { sanitizeHtml } from '../../_lib/sanitize';
import { useDashboardScope } from '../scope/useDashboardScope';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

interface ChatInterfaceProps {
  agentType?: 'corporate' | 'regwatch' | 'assistant';
  sessionId?: string;
  onSessionCreate?: (sessionId: string) => void;
}

const SUGGESTED_QUESTIONS_ASSISTANT = [
  "Bu ay hangi beyannameler var?",
  "A.Ş. kuruluş işlemleri nelerdir?",
  "KDV oranları nedir?",
  "TTK 376 analizi nasıl yapılır?",
  "İmalat sektöründe hangi teşvikler var?",
  "Sermaye artırımı için belgeler?",
  "Birleşme vergisiz yapılabilir mi?",
  "Son vergi değişiklikleri neler?",
];

const SUGGESTED_QUESTIONS_CORPORATE = [
  "A.Ş. nasıl kurulur?",
  "Sermaye artırımı için ne gerekli?",
  "TTK 376 nedir?",
  "Birleşme vergisiz yapılabilir mi?",
  "Tasfiye süreci nasıl işler?",
  "GK nisapları nedir?",
];

const SUGGESTED_QUESTIONS_REGWATCH = [
  "Kurumlar vergisi oranı nedir?",
  "KDV oranları nelerdir?",
  "Bu ay hangi beyannameler var?",
  "Asgari ücret ne kadar?",
  "SGK prim oranları?",
  "Son vergi değişiklikleri neler?",
];

export default function ChatInterface({
  agentType = 'assistant',
  sessionId: initialSessionId,
  onSessionCreate
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Multi-tenant güvenlik: Scope'tan kullanıcı bilgilerini al
  const { scope } = useDashboardScope();

  // Select questions based on agent type
  const suggestedQuestions = agentType === 'assistant'
    ? SUGGESTED_QUESTIONS_ASSISTANT
    : agentType === 'regwatch'
      ? SUGGESTED_QUESTIONS_REGWATCH
      : SUGGESTED_QUESTIONS_CORPORATE;

  const headerTitle = agentType === 'assistant'
    ? 'LYNTOS Asistan'
    : agentType === 'regwatch'
      ? 'Mevzuat Asistanı'
      : 'Şirketler Hukuku Asistanı';

  const headerDescription = agentType === 'assistant'
    ? 'Vergi, mevzuat ve şirketler hukuku konularında uzman asistan'
    : agentType === 'regwatch'
      ? 'Vergi oranları, beyanname tarihleri ve mevzuat değişiklikleri'
      : 'TTK, şirket işlemleri ve vergi konularında yardımcı olabilirim';

  const headerGradient = agentType === 'assistant'
    ? 'from-[#0049AA] to-[#00287F]'
    : 'from-[#0049AA] to-[#0049AA]';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (initialSessionId) {
      loadSessionHistory(initialSessionId);
    }
  }, [initialSessionId]);

  const loadSessionHistory = async (sid: string) => {
    try {
      const { data } = await api.get<{ messages: Message[] }>(API_ENDPOINTS.chat.history(sid));
      if (data) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load history:', err);
      }
    }
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Agent tipine göre doğru endpoint seçimi
      const chatEndpoint = API_ENDPOINTS.chat[agentType] || API_ENDPOINTS.chat.assistant;
      const { data, error: apiError } = await api.post<{ session_id?: string; response?: string; content?: string }>(
        chatEndpoint,
        {
          message: text,
          session_id: sessionId,
          user_id: scope.smmm_id || 'anonymous',
          client_id: scope.client_id || undefined,
        }
      );

      if (apiError || !data) throw new Error(apiError || 'Chat request failed');

      if (!sessionId && data.session_id) {
        setSessionId(data.session_id);
        onSessionCreate?.(data.session_id);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || data.content || ''
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (err) {
      // Production'da console.error kullanmıyoruz
      if (process.env.NODE_ENV === 'development') {
        console.error('Chat error:', err);
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessage = (content: string) => {
    return content.split('\n').map((line, i) => {
      // Headers
      if (line.startsWith('## ')) {
        return <h3 key={i} className="text-lg font-bold mt-3 mb-2 text-[#2E2E2E]">{line.slice(3)}</h3>;
      }
      if (line.startsWith('### ')) {
        return <h4 key={i} className="text-md font-semibold mt-2 mb-1 text-[#2E2E2E]">{line.slice(4)}</h4>;
      }
      // List items
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={i} className="ml-4 text-[#5A5A5A]">{line.slice(2)}</li>;
      }
      if (/^\d+\. /.test(line)) {
        return <li key={i} className="ml-4 list-decimal text-[#5A5A5A]">{line.slice(line.indexOf(' ') + 1)}</li>;
      }
      // Special labels
      if (line.startsWith('UYARI:')) {
        return <p key={i} className="my-1 text-[#FA841E] font-medium">{line}</p>;
      }
      if (line.startsWith('SURE:')) {
        return <p key={i} className="my-1 text-[#0049AA] font-medium">{line}</p>;
      }
      if (line.startsWith('BELGE:')) {
        return <p key={i} className="my-1 text-[#00804D] font-medium">{line}</p>;
      }
      // Bold - XSS güvenliği için sanitize edilmiş
      const boldFormatted = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#2E2E2E]">$1</strong>');
      // Empty line
      if (!line.trim()) {
        return <br key={i} />;
      }
      // Table rows
      if (line.startsWith('|')) {
        return <p key={i} className="my-0.5 font-mono text-sm text-[#5A5A5A]">{line}</p>;
      }
      // XSS GÜVENLİK DÜZELTMESİ: sanitizeHtml ile temizlenmiş HTML
      return <p key={i} className="my-1 text-[#5A5A5A]" dangerouslySetInnerHTML={{ __html: sanitizeHtml(boldFormatted) }} />;
    });
  };

  return (
    <div className="flex flex-col h-full min-h-[500px] bg-white rounded-xl overflow-hidden border border-[#E5E5E5] shadow-lg">
      {/* Header - Gradient */}
      <div className={`p-5 bg-gradient-to-r ${headerGradient}`}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {headerTitle}
            </h2>
            <p className="text-sm text-white/80">
              {headerDescription}
            </p>
          </div>
        </div>
      </div>

      {/* Messages - Larger area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F5F6F8] min-h-[350px]">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[#E5E5E5] rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-[#969696]" />
            </div>
            <h3 className="text-lg font-medium text-[#2E2E2E] mb-2">Nasıl yardımcı olabilirim?</h3>
            <p className="text-[#969696] mb-6">Aşağıdaki önerilerden birini seçin veya sorunuzu yazın</p>

            <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="px-4 py-2.5 bg-white hover:bg-[#E6F9FF] text-[#5A5A5A] hover:text-[#0049AA] rounded-xl text-sm transition-all border border-[#E5E5E5] hover:border-[#5ED6FF] shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-[#0049AA] text-white rounded-br-md'
                    : 'bg-white border border-[#E5E5E5] rounded-bl-md'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none">
                    {formatMessage(msg.content)}
                  </div>
                ) : (
                  <p className="text-[15px]">{msg.content}</p>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-[#E5E5E5] rounded-2xl rounded-bl-md p-4 shadow-sm">
              <div className="flex items-center gap-3 text-[#969696]">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Düşünüyorum...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input - More prominent */}
      <div className="p-4 border-t border-[#E5E5E5] bg-white">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Sorunuzu yazın..."
            className="flex-1 px-5 py-3.5 bg-[#F5F6F8] border border-[#E5E5E5] rounded-xl text-[#2E2E2E] placeholder-[#969696] focus:outline-none focus:ring-2 focus:ring-[#0078D0] focus:border-transparent text-[15px]"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="px-6 py-3.5 bg-[#0049AA] text-white rounded-xl hover:bg-[#0049AA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                Gönder
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-[#969696] mt-3 text-center">
          Bu asistan genel bilgi amaçlıdır. Önemli kararlar için profesyonel danışmanlık alınız.
        </p>
      </div>
    </div>
  );
}
