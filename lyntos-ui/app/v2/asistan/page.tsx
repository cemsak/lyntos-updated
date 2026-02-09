/**
 * LYNTOS Asistan Sayfası
 * Birleşik Vergi, Mevzuat ve Şirketler Hukuku Uzmanı
 */
'use client';

import React from 'react';
import ChatInterface from '../_components/chat/ChatInterface';

export default function AsistanPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="flex-1 min-h-0">
        <ChatInterface agentType="assistant" />
      </div>
    </div>
  );
}
