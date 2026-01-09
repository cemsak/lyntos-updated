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

const STATUS_ICONS: Record<TTK376Status, React.ReactNode> = {
  healthy: <CheckCircle className="w-6 h-6 text-[#0caf60]" />,
  half_loss: <AlertTriangle className="w-6 h-6 text-[#f5a623]" />,
  twothirds_loss: <AlertCircle className="w-6 h-6 text-[#cd3d64]" />,
  insolvent: <XCircle className="w-6 h-6 text-[#cd3d64]" />,
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const statusConfig = result ? TTK376_STATUS_CONFIG[result.status] : null;

  return (
    <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-[#e3e8ee] dark:border-[#2d3343] p-6">
      <h2 className="text-[16px] font-semibold text-[#1a1f36] dark:text-white mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-[#635bff]" />
        TTK 376 Sermaye Kaybi Analizi
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[12px] font-medium text-[#697386] mb-1">
              Sermaye (TL)
            </label>
            <input
              type="number"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              placeholder="1.000.000"
              className="w-full px-3 py-2 text-[13px] border border-[#e3e8ee] dark:border-[#2d3343] rounded-lg bg-white dark:bg-[#0a0d14] text-[#1a1f36] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635bff] focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#697386] mb-1">
              Kanuni Yedek Akce (TL)
            </label>
            <input
              type="number"
              value={legalReserves}
              onChange={(e) => setLegalReserves(e.target.value)}
              placeholder="200.000"
              className="w-full px-3 py-2 text-[13px] border border-[#e3e8ee] dark:border-[#2d3343] rounded-lg bg-white dark:bg-[#0a0d14] text-[#1a1f36] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635bff] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#697386] mb-1">
              Oz Varlik (TL)
            </label>
            <input
              type="number"
              value={equity}
              onChange={(e) => setEquity(e.target.value)}
              placeholder="500.000"
              className="w-full px-3 py-2 text-[13px] border border-[#e3e8ee] dark:border-[#2d3343] rounded-lg bg-white dark:bg-[#0a0d14] text-[#1a1f36] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635bff] focus:border-transparent"
              required
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-[13px] font-medium text-white bg-[#635bff] rounded-lg hover:bg-[#5851ea] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {loading ? 'Hesaplaniyor...' : 'Analiz Et'}
          </button>

          {result && (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-[13px] font-medium text-[#697386] bg-[#f6f9fc] dark:bg-[#0a0d14] rounded-lg hover:bg-[#e3e8ee] dark:hover:bg-[#1a1f2e] transition-colors"
            >
              Temizle
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-[#cd3d64]/10 border border-[#cd3d64]/30 rounded-lg text-[13px] text-[#cd3d64]">
          Hata: {error}
        </div>
      )}

      {result && statusConfig && (
        <div
          className={`mt-6 p-4 rounded-xl border-2 ${statusConfig.bg} ${statusConfig.border}`}
        >
          <div className="flex items-center gap-2 mb-3">
            {STATUS_ICONS[result.status]}
            <h3 className="text-[15px] font-semibold text-[#1a1f36] dark:text-white">
              {statusConfig.title}
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg">
              <div className="text-[11px] text-[#697386]">Kayip Orani</div>
              <div className="text-[16px] font-bold text-[#1a1f36] dark:text-white">
                %{result.loss_percentage}
              </div>
            </div>
            <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg">
              <div className="text-[11px] text-[#697386]">1/2 Esik</div>
              <div className="text-[16px] font-bold text-[#1a1f36] dark:text-white">
                {formatCurrency(result.half_threshold)}
              </div>
            </div>
            <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg">
              <div className="text-[11px] text-[#697386]">1/3 Esik</div>
              <div className="text-[16px] font-bold text-[#1a1f36] dark:text-white">
                {formatCurrency(result.twothirds_threshold)}
              </div>
            </div>
            <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg">
              <div className="text-[11px] text-[#697386]">Yasal Dayanak</div>
              <div className="text-[16px] font-bold text-[#1a1f36] dark:text-white">
                {result.legal_basis}
              </div>
            </div>
          </div>

          <div className="bg-white/70 dark:bg-black/30 p-3 rounded-lg">
            <div className="text-[12px] font-medium text-[#697386] mb-1">
              Oneri:
            </div>
            <div className="text-[13px] text-[#1a1f36] dark:text-white whitespace-pre-line">
              {result.recommendation}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
