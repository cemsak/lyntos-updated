/**
 * VERGUS RegWatch Chat Page
 * Sprint R4 - UX Enhanced
 */
'use client';

import React from 'react';
import ChatInterface from '../../_components/chat/ChatInterface';

export default function RegWatchChatPage() {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mevzuat Asistanı</h1>
          <p className="text-gray-500 mt-1">
            Vergi oranları, beyanname tarihleri ve mevzuat değişiklikleri hakkında sorular sorun
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="text-gray-500 text-sm">KV Oranı</div>
            <div className="text-gray-900 text-xl font-bold">%25</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="text-gray-500 text-sm">KDV Genel</div>
            <div className="text-gray-900 text-xl font-bold">%20</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="text-gray-500 text-sm">Asgari Ücret</div>
            <div className="text-gray-900 text-xl font-bold">26.005 TL</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="text-gray-500 text-sm">Kıdem Tavanı</div>
            <div className="text-gray-900 text-xl font-bold">35.058 TL</div>
          </div>
        </div>

        {/* Chat Interface - Larger */}
        <div className="h-[calc(100vh-280px)] min-h-[500px]">
          <ChatInterface agentType="regwatch" />
        </div>
      </div>
    </div>
  );
}
