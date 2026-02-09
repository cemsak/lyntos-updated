'use client';

/**
 * Oracle Risk Header
 * VDK Seçilme Olasılığı + KURGAN Sağlık Skoru + Özet İstatistik
 */

import React from 'react';
import {
  ShieldAlert,
  Activity,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Target,
} from 'lucide-react';
import type { SimulatorData } from '../../../../_hooks/useVdkOracle';
import type { KurganAlarm } from '../../../../_components/vdk-simulator/types';

interface OracleRiskHeaderProps {
  kurganScore: number;
  kurganRiskLevel: string;
  simulator: SimulatorData;
}

export function OracleRiskHeader({
  kurganScore,
  kurganRiskLevel,
  simulator,
}: OracleRiskHeaderProps) {
  const auditProb = simulator.audit_probability || 0;
  const triggeredCount = simulator.triggered_count || 0;
  const totalDocs = simulator.total_documents || 0;

  // Toplam soru sayısı
  const totalQuestions = (simulator.alarms || [])
    .filter((a: KurganAlarm) => a.triggered)
    .reduce((sum: number, a: KurganAlarm) => sum + (a.inspector_questions?.length || 0), 0);

  // Audit probability color
  const getAuditColor = (prob: number) => {
    if (prob >= 70) return { text: '#BF192B', bg: '#FEF2F2', border: '#FFC7C9' };
    if (prob >= 40) return { text: '#E67324', bg: '#FFFBEB', border: '#FFF08C' };
    return { text: '#00804D', bg: '#ECFDF5', border: '#AAE8B8' };
  };

  // KURGAN score color (yüksek = iyi)
  const getKurganColor = (score: number) => {
    if (score >= 70) return { text: '#00804D', bg: '#ECFDF5', border: '#AAE8B8' };
    if (score >= 40) return { text: '#E67324', bg: '#FFFBEB', border: '#FFF08C' };
    return { text: '#BF192B', bg: '#FEF2F2', border: '#FFC7C9' };
  };

  const auditColors = getAuditColor(auditProb);
  const kurganColors = getKurganColor(kurganScore);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* VDK Seçilme Olasılığı */}
      <div
        className="rounded-xl p-5 border-2"
        style={{ backgroundColor: auditColors.bg, borderColor: auditColors.border }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5" style={{ color: auditColors.text }} />
          <span className="text-sm font-medium text-[#5A5A5A]">
            VDK Seçilme Olasılığı
          </span>
        </div>
        <div className="flex items-end gap-1">
          <span
            className="text-4xl font-bold font-mono"
            style={{ color: auditColors.text }}
          >
            %{Math.round(auditProb)}
          </span>
        </div>
        <div className="mt-3 w-full h-2 bg-white/50 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, auditProb)}%`,
              backgroundColor: auditColors.text,
            }}
          />
        </div>
        <p className="mt-2 text-xs text-[#969696]">
          Simulator Risk Puanı: {simulator.risk_score ?? '-'}/100
        </p>
      </div>

      {/* KURGAN Sağlık Skoru */}
      <div
        className="rounded-xl p-5 border-2"
        style={{ backgroundColor: kurganColors.bg, borderColor: kurganColors.border }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-5 h-5" style={{ color: kurganColors.text }} />
          <span className="text-sm font-medium text-[#5A5A5A]">
            KURGAN Saglik Skoru <span className="text-[10px] text-[#969696] font-normal">(yuksek = iyi)</span>
          </span>
        </div>
        <div className="flex items-end gap-2">
          <span
            className="text-4xl font-bold font-mono"
            style={{ color: kurganColors.text }}
          >
            {kurganScore}
          </span>
          <span className="text-lg text-[#969696] mb-1">/100</span>
        </div>
        <div className="mt-3 w-full h-2 bg-white/50 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${kurganScore}%`,
              backgroundColor: kurganColors.text,
            }}
          />
        </div>
        <p className="mt-2 text-xs text-[#969696]">
          Seviye: {kurganRiskLevel} (Yüksek skor = düşük risk)
        </p>
      </div>

      {/* Özet İstatistik */}
      <div className="rounded-xl p-5 border-2 border-[#E5E5E5] bg-white">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="w-5 h-5 text-[#0049AA]" />
          <span className="text-sm font-medium text-[#5A5A5A]">
            İnceleme Özeti
          </span>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#BF192B]" />
              <span className="text-sm text-[#5A5A5A]">Tetiklenen Alarm</span>
            </div>
            <span className="text-lg font-bold text-[#BF192B] font-mono">
              {triggeredCount}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0049AA]" />
              <span className="text-sm text-[#5A5A5A]">Gereken Belge</span>
            </div>
            <span className="text-lg font-bold text-[#0049AA] font-mono">
              {totalDocs}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#E67324]" />
              <span className="text-sm text-[#5A5A5A]">Müfettiş Sorusu</span>
            </div>
            <span className="text-lg font-bold text-[#E67324] font-mono">
              {totalQuestions}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
