'use client';

/**
 * KURGAN Tab - VDK 16 Senaryo Analizi
 *
 * VDK Genelgesi: E-55935724-010.06-7361 (18.04.2025)
 * Mali Milat: 1 Ekim 2025
 *
 * SMMM/YMM için profesyonel terminoloji ve şeffaf veri gösterimi
 */


import React, { useState } from 'react';
import {
  Shield,
  AlertTriangle,
} from 'lucide-react';
import type { KurganSenaryo } from '../../../_hooks/useVdkFullAnalysis';
import { ScenarioCard } from './ScenarioCard';
import { PassedScenarioCard } from './PassedScenarioCard';

interface KurganTabProps {
  scenarios: KurganSenaryo[] | null;
  onGenerateIzah?: (scenario: KurganSenaryo) => void;
}

export default function KurganTab({ scenarios, onGenerateIzah }: KurganTabProps) {
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);
  const [expandedPassedScenario, setExpandedPassedScenario] = useState<string | null>(null);

  if (!scenarios || scenarios.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-12 text-center">
        <Shield className="w-16 h-16 text-[#B4B4B4] mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[#5A5A5A] mb-2">KURGAN Analizi Bekleniyor</h3>
        <p className="text-[#969696]">
          KURGAN 16 senaryo analizi için verilerinizi kontrol edin.
        </p>
      </div>
    );
  }

  // Tetiklenen ve tetiklenmeyen senaryoları ayır
  const triggered = scenarios.filter((s) => s.tetiklendi);
  const notTriggered = scenarios.filter((s) => !s.tetiklendi);

  return (
    <div className="space-y-6">
      {/* Özet */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#FEF2F2] border border-[#FFC7C9] rounded-lg p-4">
          <div className="text-2xl font-bold text-[#BF192B]">
            {triggered.filter((s) => s.aksiyon === 'INCELEME').length}
          </div>
          <div className="text-sm text-[#BF192B]">İnceleme Riski</div>
        </div>
        <div className="bg-[#FFFBEB] border border-[#FFF08C] rounded-lg p-4">
          <div className="text-2xl font-bold text-[#FA841E]">
            {triggered.filter((s) => s.aksiyon === 'IZAHA_DAVET').length}
          </div>
          <div className="text-sm text-[#FA841E]">İzaha Davet Riski</div>
        </div>
        <div className="bg-[#FFFBEB] border border-[#FFF08C] rounded-lg p-4">
          <div className="text-2xl font-bold text-[#FA841E]">
            {triggered.filter((s) => s.aksiyon === 'BILGI_ISTEME').length}
          </div>
          <div className="text-sm text-[#FA841E]">Bilgi İsteme Riski</div>
        </div>
        <div className="bg-[#ECFDF5] border border-[#AAE8B8] rounded-lg p-4">
          <div className="text-2xl font-bold text-[#00804D]">{notTriggered.length}</div>
          <div className="text-sm text-[#00804D]">Geçen Senaryo</div>
        </div>
      </div>

      {/* Tetiklenen Senaryolar */}
      {triggered.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#F0282D]" />
            Tetiklenen Senaryolar ({triggered.length})
          </h3>
          <div className="space-y-3">
            {triggered.map((scenario) => (
              <ScenarioCard
                key={scenario.senaryo_id}
                scenario={scenario}
                isExpanded={expandedScenario === scenario.senaryo_id}
                onToggle={() =>
                  setExpandedScenario(
                    expandedScenario === scenario.senaryo_id ? null : scenario.senaryo_id
                  )
                }
                onGenerateIzah={onGenerateIzah}
              />
            ))}
          </div>
        </div>
      )}

      {/* Geçen Senaryolar */}
      <div>
        <h3 className="text-lg font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#00A651]" />
          Geçen Senaryolar ({notTriggered.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {notTriggered.map((scenario) => (
            <PassedScenarioCard
              key={scenario.senaryo_id}
              scenario={scenario}
              isExpanded={expandedPassedScenario === scenario.senaryo_id}
              onToggle={() =>
                setExpandedPassedScenario(
                  expandedPassedScenario === scenario.senaryo_id ? null : scenario.senaryo_id
                )
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
