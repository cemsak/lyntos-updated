/**
 * VERGUS Chat Interface
 * Sprint S3
 */
'use client';

import React, { useState, useRef, useEffect } from 'react';

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
  "A.S. nasil kurulur?",
  "Sermaye artirimi icin ne gerekli?",
  "TTK 376 nedir?",
  "Birlesme vergisiz yapilabilir mi?",
  "Tasfiye sureci nasil isler?",
  "GK nisaplari nedir?",
];

const SUGGESTED_QUESTIONS_REGWATCH = [
  "Kurumlar vergisi orani nedir?",
  "KDV oranlari nelerdir?",
  "Bu ay hangi beyannameler var?",
  "Asgari ucret ne kadar?",
  "SGK prim oranlari?",
  "Son vergi degisiklikleri neler?",
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
    ? 'Mevzuat Asistani'
    : 'Sirketler Hukuku Asistani';

  const headerDescription = agentType === 'regwatch'
    ? 'Vergi oranlari, beyanname tarihleri ve mevzuat degisiklikleri'
    : 'TTK, sirket islemleri ve vergi konularinda yardimci olabilirim';

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
        content: 'Uzgunum, bir hata olustu. Lutfen tekrar deneyin.'
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
        return <h3 key={i} className="text-lg font-bold mt-3 mb-2 text-slate-100">{line.slice(3)}</h3>;
      }
      if (line.startsWith('### ')) {
        return <h4 key={i} className="text-md font-semibold mt-2 mb-1 text-slate-200">{line.slice(4)}</h4>;
      }
      // List items
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={i} className="ml-4 text-slate-300">{line.slice(2)}</li>;
      }
      if (/^\d+\. /.test(line)) {
        return <li key={i} className="ml-4 list-decimal text-slate-300">{line.slice(line.indexOf(' ') + 1)}</li>;
      }
      // Special labels
      if (line.startsWith('UYARI:')) {
        return <p key={i} className="my-1 text-orange-400 font-medium">{line}</p>;
      }
      if (line.startsWith('SURE:')) {
        return <p key={i} className="my-1 text-blue-400 font-medium">{line}</p>;
      }
      if (line.startsWith('BELGE:')) {
        return <p key={i} className="my-1 text-green-400 font-medium">{line}</p>;
      }
      // Bold
      const boldFormatted = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-100">$1</strong>');
      // Empty line
      if (!line.trim()) {
        return <br key={i} />;
      }
      // Table rows
      if (line.startsWith('|')) {
        return <p key={i} className="my-0.5 font-mono text-sm text-slate-400">{line}</p>;
      }
      return <p key={i} className="my-1 text-slate-300" dangerouslySetInnerHTML={{ __html: boldFormatted }} />;
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{agentType === 'regwatch' ? '[M]' : '[S]'}</span>
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              {headerTitle}
            </h2>
            <p className="text-sm text-slate-400">
              {headerDescription}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">[?]</div>
            <h3 className="text-lg font-medium text-slate-200 mb-2">Nasil yardimci olabilirim?</h3>
            <p className="text-slate-400 mb-6">Asagidaki onerilerden birini secin veya sorunuzu yazin</p>

            <div className="flex flex-wrap justify-center gap-2">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors border border-slate-600"
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
                className={`max-w-[80%] rounded-lg p-4 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    {formatMessage(msg.content)}
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <div className="animate-pulse">[...]</div>
                <span>Dusunuyorum...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-700 bg-slate-800">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Sorunuzu yazin..."
            rows={1}
            className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '...' : 'Gonder'}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">
          Bu asistan genel bilgi amaclidir. Onemli kararlar icin profesyonel danismanlik aliniz.
        </p>
      </div>
    </div>
  );
}
