/**
 * VERGUS Corporate Chat Page
 * Sprint S3 - UX Enhanced
 */
'use client';

import React from 'react';
import ChatInterface from '../../_components/chat/ChatInterface';

export default function CorporateChatPage() {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Şirketler Hukuku Asistanı</h1>
          <p className="text-gray-500 mt-1">
            TTK, şirket işlemleri, sermaye ve vergi konularında sorularınızı yanıtlıyorum
          </p>
        </div>

        {/* Chat Interface - Larger */}
        <div className="h-[calc(100vh-180px)] min-h-[600px]">
          <ChatInterface agentType="corporate" />
        </div>
      </div>
    </div>
  );
}
