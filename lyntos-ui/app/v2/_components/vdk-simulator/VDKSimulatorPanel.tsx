'use client';

/**
 * VDK Simulator Panel Component
 * Sprint 8.0 - LYNTOS V2
 *
 * Main panel that displays:
 * - Risk score gauge
 * - Triggered alarms with inspector questions
 * - Document preparation checklist
 * - Action buttons
 */

import React, { useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  Send,
  FileArchive,
  Target,
} from 'lucide-react';
import { useVDKSimulator } from './useVDKSimulator';
import { KurganAlarmCard } from './KurganAlarmCard';
import { RISK_LEVEL_CONFIG, SEVERITY_CONFIG } from './types';

interface VDKSimulatorPanelProps {
  clientId: string;
  clientName?: string;
  period?: string;
  autoRun?: boolean;
  onDocumentUpload?: (docId: string) => void;
}

export function VDKSimulatorPanel({
  clientId,
  clientName,
  period = '2026/Q1',
  autoRun = true,
  onDocumentUpload,
}: VDKSimulatorPanelProps) {
  const { analyze, isLoading, result, error } = useVDKSimulator();

  useEffect(() => {
    if (autoRun && clientId) {
      analyze(clientId, period);
    }
  }, [clientId, period, autoRun, analyze]);

  const handleRefresh = () => {
    analyze(clientId, period);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-[#e3e8ee] p-8">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-[#635bff] border-t-transparent rounded-full animate-spin" />
          <p className="text-[14px] text-[#697386]">
            KURGAN simulasyonu calisiyor...
          </p>
          <p className="text-[12px] text-[#697386]/70">
            Mufettis gozuyle analiz ediliyor
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-xl border border-[#cd3d64] p-6">
        <div className="flex items-center gap-3 text-[#cd3d64]">
          <AlertTriangle className="w-5 h-5" />
          <p className="text-[14px]">{error}</p>
        </div>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 text-[13px] font-medium text-white bg-[#635bff] rounded-lg hover:bg-[#5851ea] transition-colors"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  // Empty state
  if (!result) {
    return (
      <div className="bg-white rounded-xl border border-[#e3e8ee] p-8">
        <div className="text-center">
          <Shield className="w-12 h-12 text-[#697386] mx-auto mb-4" />
          <h3 className="text-[16px] font-semibold text-[#1a1f36] mb-2">
            VDK Simulatoru
          </h3>
          <p className="text-[14px] text-[#697386] mb-4">
            Mufettis gozunden mukellefinizi goruntuleyin
          </p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 text-[13px] font-medium text-white bg-[#635bff] rounded-lg hover:bg-[#5851ea] transition-colors"
          >
            Simulasyonu Baslat
          </button>
        </div>
      </div>
    );
  }

  const triggeredAlarms = result.alarms.filter((a) => a.triggered);
  const passedAlarms = result.alarms.filter((a) => !a.triggered);
  const riskConfig = RISK_LEVEL_CONFIG[result.risk_level];

  return (
    <div className="bg-white rounded-xl border border-[#e3e8ee] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#e3e8ee]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#635bff]/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-[#635bff]" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-[#1a1f36]">
                VDK Simulatoru
              </h2>
              <p className="text-[12px] text-[#697386]">
                {result.client_name} &bull; {result.period}
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 text-[#697386] hover:text-[#1a1f36] hover:bg-[#f6f9fc] rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Risk Summary */}
      <div className="p-4 border-b border-[#e3e8ee]">
        <div className="flex items-center gap-6">
          {/* Risk Score Circle */}
          <div className="flex items-center gap-3">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-[20px] shadow-lg"
              style={{ backgroundColor: riskConfig.color }}
            >
              {result.risk_score}
            </div>
            <div>
              <p className="text-[12px] text-[#697386]">Risk Skoru</p>
              <p
                className="text-[14px] font-semibold"
                style={{ color: riskConfig.color }}
              >
                {riskConfig.label}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 grid grid-cols-3 gap-4">
            <StatBox
              value={result.triggered_count}
              label="Alarm"
              color="#cd3d64"
            />
            <StatBox
              value={result.total_documents}
              label="Belge Gerekli"
              color="#f5a623"
            />
            <StatBox
              value={result.prepared_documents}
              label="Hazir"
              color="#0caf60"
            />
          </div>
        </div>

        {/* Sector Info */}
        {result.nace_code && (
          <div className="mt-4 flex items-center gap-2 text-[12px] text-[#697386]">
            <span>Sektor:</span>
            <span className="font-medium text-[#1a1f36]">
              {result.sector_group} (NACE {result.nace_code})
            </span>
          </div>
        )}
      </div>

      {/* Alarms Section */}
      <div className="p-4">
        {/* Triggered Alarms */}
        {triggeredAlarms.length > 0 && (
          <div className="mb-6">
            <h3 className="text-[13px] font-semibold text-[#cd3d64] mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Tetiklenen Alarmlar ({triggeredAlarms.length})
            </h3>
            <div className="space-y-3">
              {triggeredAlarms.map((alarm) => (
                <KurganAlarmCard
                  key={alarm.rule_id}
                  alarm={alarm}
                  onDocumentUpload={onDocumentUpload}
                />
              ))}
            </div>
          </div>
        )}

        {/* No Alarms Message */}
        {triggeredAlarms.length === 0 && (
          <div className="text-center py-8 mb-6">
            <FileCheck className="w-12 h-12 text-[#0caf60] mx-auto mb-3" />
            <p className="text-[14px] font-medium text-[#0caf60]">
              Tebrikler! Hicbir alarm tetiklenmedi.
            </p>
            <p className="text-[12px] text-[#697386] mt-1">
              Mukellefiniz KURGAN kriterlerine gore temiz gorunuyor.
            </p>
          </div>
        )}

        {/* Passed Checks */}
        {passedAlarms.length > 0 && (
          <div>
            <h3 className="text-[13px] font-semibold text-[#0caf60] mb-3 flex items-center gap-2">
              <FileCheck className="w-4 h-4" />
              Gecen Kontroller ({passedAlarms.length})
            </h3>
            <div className="space-y-2">
              {passedAlarms.map((alarm) => (
                <KurganAlarmCard key={alarm.rule_id} alarm={alarm} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions Footer */}
      <div className="p-4 border-t border-[#e3e8ee] bg-[#f6f9fc]">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[#697386]">
            Son simulasyon:{' '}
            {new Date(result.simulated_at).toLocaleString('tr-TR')}
          </p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 text-[12px] font-medium text-[#697386] hover:text-[#1a1f36] border border-[#e3e8ee] bg-white rounded-lg flex items-center gap-1.5 transition-colors">
              <Send className="w-3.5 h-3.5" />
              Mukellefe Gonder
            </button>
            <button className="px-3 py-2 text-[12px] font-medium text-white bg-[#635bff] hover:bg-[#5851ea] rounded-lg flex items-center gap-1.5 transition-colors">
              <FileArchive className="w-3.5 h-3.5" />
              Kanıt Dosyası Oluştur
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Box Sub-component
function StatBox({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="text-center">
      <p className="text-[24px] font-bold" style={{ color }}>
        {value}
      </p>
      <p className="text-[11px] text-[#697386]">{label}</p>
    </div>
  );
}
