/**
 * VERGUS RegWatch Chat Page
 * Sprint R4
 */
'use client';

import React from 'react';
import ChatInterface from '../../_components/chat/ChatInterface';

export default function RegWatchChatPage() {
  return (
    <div className="min-h-screen bg-slate-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-100">Mevzuat Asistani</h1>
          <p className="text-slate-400 mt-1">
            Vergi oranlari, beyanname tarihleri ve mevzuat degisiklikleri hakkinda sorular sorun
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="text-slate-400 text-sm">KV Orani</div>
            <div className="text-slate-100 text-xl font-bold">%25</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="text-slate-400 text-sm">KDV Genel</div>
            <div className="text-slate-100 text-xl font-bold">%20</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="text-slate-400 text-sm">Asgari Ucret</div>
            <div className="text-slate-100 text-xl font-bold">26.005 TL</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="text-slate-400 text-sm">Kidem Tavani</div>
            <div className="text-slate-100 text-xl font-bold">35.058 TL</div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="h-[calc(100vh-350px)]">
          <ChatInterface agentType="regwatch" />
        </div>
      </div>
    </div>
  );
}
