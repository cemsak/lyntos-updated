'use client';

/**
 * TTK 376 Sermaye Kaybi Analizi Widget
 * Sprint S2 - LYNTOS V2
 *
 * Capital loss analysis widget for Turkish Commercial Code Article 376
 */

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useTTK376Analysis } from './useCorporate';
import type { TTK376Status } from './types';
import { TTK376_STATUS_CONFIG } from './types';
import { formatCurrency } from '../../_lib/format';

const STATUS_ICONS: Record<TTK376Status, React.ReactNode> = {
  healthy: <CheckCircle className="w-6 h-6 text-[#00A651]" />,
  half_loss: <AlertTriangle className="w-6 h-6 text-[#FFB114]" />,
  twothirds_loss: <AlertCircle className="w-6 h-6 text-[#F0282D]" />,
  insolvent: <XCircle className="w-6 h-6 text-[#F0282D]" />,
};

export function TTK376Widget() {
  const [capital, setCapital] = useState<string>('');
  const [legalReserves, setLegalReserves] = useState<string>('');
  const [equity, setEquity] = useState<string>('');

  const { result, loading, error, analyze, reset } = useTTK376Analysis();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await analyze({
      capital: parseFloat(capital) || 0,
      legal_reserves: parseFloat(legalReserves) || 0,
      equity: parseFloat(equity) || 0,
    });
  };

  const handleReset = () => {
    setCapital('');
    setLegalReserves('');
    setEquity('');
    reset();
  };

  const statusConfig = result ? TTK376_STATUS_CONFIG[result.status] : null;

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
      <h2 className="text-[16px] font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-[#0049AA]" />
        TTK 376 Sermaye Kaybi Analizi
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[12px] font-medium text-[#5A5A5A] mb-1">
              Sermaye (TL)
            </label>
            <input
              type="number"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              placeholder="1.000.000"
              className="w-full px-3 py-2 text-[13px] border border-[#E5E5E5] rounded-lg bg-white text-[#2E2E2E] focus:outline-none focus:ring-2 focus:ring-[#0049AA] focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#5A5A5A] mb-1">
              Kanuni Yedek Akce (TL)
            </label>
            <input
              type="number"
              value={legalReserves}
              onChange={(e) => setLegalReserves(e.target.value)}
              placeholder="200.000"
              className="w-full px-3 py-2 text-[13px] border border-[#E5E5E5] rounded-lg bg-white text-[#2E2E2E] focus:outline-none focus:ring-2 focus:ring-[#0049AA] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#5A5A5A] mb-1">
              Oz Varlik (TL)
            </label>
            <input
              type="number"
              value={equity}
              onChange={(e) => setEquity(e.target.value)}
              placeholder="500.000"
              className="w-full px-3 py-2 text-[13px] border border-[#E5E5E5] rounded-lg bg-white text-[#2E2E2E] focus:outline-none focus:ring-2 focus:ring-[#0049AA] focus:border-transparent"
              required
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-[13px] font-medium text-white bg-[#0049AA] rounded-lg hover:bg-[#00287F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {loading ? 'Hesaplaniyor...' : 'Analiz Et'}
          </button>

          {result && (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-[13px] font-medium text-[#5A5A5A] bg-[#F5F6F8] rounded-lg hover:bg-[#E5E5E5] transition-colors"
            >
              Temizle
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-[#F0282D]/10 border border-[#F0282D]/30 rounded-lg text-[13px] text-[#F0282D]">
          Hata: {error}
        </div>
      )}

      {result && statusConfig && (
        <div
          className={`mt-6 p-4 rounded-xl border-2 ${statusConfig.bg} ${statusConfig.border}`}
        >
          <div className="flex items-center gap-2 mb-3">
            {STATUS_ICONS[result.status]}
            <h3 className="text-[15px] font-semibold text-[#2E2E2E]">
              {statusConfig.title}
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white/50 p-3 rounded-lg">
              <div className="text-[11px] text-[#5A5A5A]">Kayip Orani</div>
              <div className="text-[16px] font-bold text-[#2E2E2E]">
                %{result.loss_percentage}
              </div>
            </div>
            <div className="bg-white/50 p-3 rounded-lg">
              <div className="text-[11px] text-[#5A5A5A]">1/2 Esik</div>
              <div className="text-[16px] font-bold text-[#2E2E2E]">
                {formatCurrency(result.half_threshold, { decimals: 0 })}
              </div>
            </div>
            <div className="bg-white/50 p-3 rounded-lg">
              <div className="text-[11px] text-[#5A5A5A]">1/3 Esik</div>
              <div className="text-[16px] font-bold text-[#2E2E2E]">
                {formatCurrency(result.twothirds_threshold, { decimals: 0 })}
              </div>
            </div>
            <div className="bg-white/50 p-3 rounded-lg">
              <div className="text-[11px] text-[#5A5A5A]">Yasal Dayanak</div>
              <div className="text-[16px] font-bold text-[#2E2E2E]">
                {result.legal_basis}
              </div>
            </div>
          </div>

          <div className="bg-white/70 p-3 rounded-lg">
            <div className="text-[12px] font-medium text-[#5A5A5A] mb-1">
              Oneri:
            </div>
            <div className="text-[13px] text-[#2E2E2E] whitespace-pre-line">
              {result.recommendation}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
