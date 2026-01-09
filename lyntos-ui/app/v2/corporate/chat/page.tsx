/**
 * VERGUS Corporate Chat Page
 * Sprint S3
 */
'use client';

import React from 'react';
import ChatInterface from '../../_components/chat/ChatInterface';

export default function CorporateChatPage() {
  return (
    <div className="min-h-screen bg-slate-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-100">Sirketler Hukuku Asistani</h1>
          <p className="text-slate-400 mt-1">
            TTK, sirket islemleri, sermaye ve vergi konularinda sorularinizi yanitliyorum
          </p>
        </div>

        {/* Chat Interface */}
        <div className="h-[calc(100vh-200px)]">
          <ChatInterface agentType="corporate" />
        </div>
      </div>
    </div>
  );
}
