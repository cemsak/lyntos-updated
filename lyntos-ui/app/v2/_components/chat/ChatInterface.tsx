/**
 * VERGUS Chat Interface
 * Sprint S3 - UX Enhanced
 */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Loader2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

interface ChatInterfaceProps {
  agentType?: 'corporate' | 'regwatch';
  sessionId?: string;
  onSessionCreate?: (sessionId: string) => void;
}

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
  agentType = 'corporate',
  sessionId: initialSessionId,
  onSessionCreate
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Select questions based on agent type
  const suggestedQuestions = agentType === 'regwatch'
    ? SUGGESTED_QUESTIONS_REGWATCH
    : SUGGESTED_QUESTIONS_CORPORATE;

  const headerTitle = agentType === 'regwatch'
    ? 'Mevzuat Asistanı'
    : 'Şirketler Hukuku Asistanı';

  const headerDescription = agentType === 'regwatch'
    ? 'Vergi oranları, beyanname tarihleri ve mevzuat değişiklikleri'
    : 'TTK, şirket işlemleri ve vergi konularında yardımcı olabilirim';

  const headerGradient = agentType === 'regwatch'
    ? 'from-blue-600 to-indigo-700'
    : 'from-purple-600 to-indigo-700';

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
      const res = await fetch(`${API_BASE}/api/v1/chat/history/${sid}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
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
      const res = await fetch(`${API_BASE}/api/v1/chat/${agentType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          user_id: 'default'
        })
      });

      if (!res.ok) throw new Error('Chat request failed');

      const data = await res.json();

      if (!sessionId && data.session_id) {
        setSessionId(data.session_id);
        onSessionCreate?.(data.session_id);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (err) {
      console.error('Chat error:', err);
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
        return <h3 key={i} className="text-lg font-bold mt-3 mb-2 text-gray-900">{line.slice(3)}</h3>;
      }
      if (line.startsWith('### ')) {
        return <h4 key={i} className="text-md font-semibold mt-2 mb-1 text-gray-800">{line.slice(4)}</h4>;
      }
      // List items
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={i} className="ml-4 text-gray-700">{line.slice(2)}</li>;
      }
      if (/^\d+\. /.test(line)) {
        return <li key={i} className="ml-4 list-decimal text-gray-700">{line.slice(line.indexOf(' ') + 1)}</li>;
      }
      // Special labels
      if (line.startsWith('UYARI:')) {
        return <p key={i} className="my-1 text-orange-600 font-medium">{line}</p>;
      }
      if (line.startsWith('SURE:')) {
        return <p key={i} className="my-1 text-blue-600 font-medium">{line}</p>;
      }
      if (line.startsWith('BELGE:')) {
        return <p key={i} className="my-1 text-green-600 font-medium">{line}</p>;
      }
      // Bold
      const boldFormatted = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900">$1</strong>');
      // Empty line
      if (!line.trim()) {
        return <br key={i} />;
      }
      // Table rows
      if (line.startsWith('|')) {
        return <p key={i} className="my-0.5 font-mono text-sm text-gray-600">{line}</p>;
      }
      return <p key={i} className="my-1 text-gray-700" dangerouslySetInnerHTML={{ __html: boldFormatted }} />;
    });
  };

  return (
    <div className="flex flex-col h-full min-h-[500px] bg-white rounded-xl overflow-hidden border border-gray-200 shadow-lg">
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
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 min-h-[350px]">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Nasıl yardımcı olabilirim?</h3>
            <p className="text-gray-500 mb-6">Aşağıdaki önerilerden birini seçin veya sorunuzu yazın</p>

            <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="px-4 py-2.5 bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-700 rounded-xl text-sm transition-all border border-gray-200 hover:border-blue-300 shadow-sm"
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
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-white border border-gray-200 rounded-bl-md'
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
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md p-4 shadow-sm">
              <div className="flex items-center gap-3 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Düşünüyorum...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input - More prominent */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Sorunuzu yazın..."
            className="flex-1 px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[15px]"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="px-6 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
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
        <p className="text-xs text-gray-400 mt-3 text-center">
          Bu asistan genel bilgi amaçlıdır. Önemli kararlar için profesyonel danışmanlık alınız.
        </p>
      </div>
    </div>
  );
}
