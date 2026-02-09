'use client';

import React, { useState, useMemo } from 'react';
import { HelpCircle, AlertTriangle, Shield } from 'lucide-react';
import { Card } from '../shared/Card';
import { Badge, TrustBadge } from '../shared/Badge';
import { PanelState } from '../shared/PanelState';
import { ExplainModal } from '../kpi/ExplainModal';
import { useFailSoftFetch } from '../hooks/useFailSoftFetch';
import { ENDPOINTS } from '../contracts/endpoints';
import type { KurganResult } from './kurganAlertHelpers';
import { normalizeKurgan } from './kurganAlertHelpers';
import { KurganInfoModal } from './KurganInfoModal';
import { KurganScenarioCard } from './KurganScenarioCard';

// Main Component
export function KurganAlertPanel() {
  const [showExplain, setShowExplain] = useState(false);
  const [showSmmmInfo, setShowSmmmInfo] = useState(false);
  const [expandedScenarios, setExpandedScenarios] = useState<Set<string>>(new Set());

  const envelope = useFailSoftFetch<KurganResult>(ENDPOINTS.KURGAN_RISK, normalizeKurgan);
  const { status, reason_tr, data, analysis, trust, legal_basis_refs, evidence_refs, meta } = envelope;

  const sortedScenarios = useMemo(() => {
    if (!data?.triggered_scenarios) return [];
    return [...data.triggered_scenarios].sort((a, b) => b.risk_puani - a.risk_puani);
  }, [data?.triggered_scenarios]);

  const toggleScenario = (id: string) => {
    setExpandedScenarios(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const hasHighRisk = data?.summary && (
    data.summary.risk_dagilimi.inceleme > 0 ||
    data.summary.risk_dagilimi.izaha_davet > 0
  );

  return (
    <>
      <Card
        title={
          <span className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#BF192B]" />
            KURGAN Risk Analizi
            <button
              onClick={() => setShowSmmmInfo(true)}
              className="text-[#969696] hover:text-[#BF192B] transition-colors"
              title="SMMM Rehberi"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </span>
        }
        subtitle="Kurulus Gozetimli Risk Analiz Sistemi (1 Ekim 2025 Aktif)"
        headerAction={
          data && (
            <div className="flex items-center gap-2">
              {data.system_status === 'active' && (
                <Badge variant="error">AKTIF</Badge>
              )}
              <Badge variant={hasHighRisk ? 'error' : 'success'}>
                {data.summary.tetiklenen_senaryo} / {data.summary.toplam_senaryo} senaryo
              </Badge>
            </div>
          )
        }
      >
        <PanelState status={status} reason_tr={reason_tr}>
          {data && (
            <div className="space-y-4">
              {/* System Status Banner */}
              {data.system_status === 'active' && (
                <div className="bg-[#FEF2F2] border border-[#FF9196] rounded-lg p-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#BF192B] flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#980F30]">
                      KURGAN sistemi 1 Ekim 2025 itibariyle AKTIF!
                    </p>
                    <p className="text-xs text-[#BF192B]">
                      Tum islemler anlik olarak izleniyor. "Bilmiyordum" savunmasi gecersiz.
                    </p>
                  </div>
                </div>
              )}

              {/* Risk Summary Cards */}
              <div className="grid grid-cols-4 gap-2">
                <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FFC7C9] text-center">
                  <p className="text-2xl font-bold text-[#BF192B]">{data.summary.risk_dagilimi.inceleme}</p>
                  <p className="text-xs text-[#5A5A5A]">Inceleme</p>
                </div>
                <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#FFF08C] text-center">
                  <p className="text-2xl font-bold text-[#FA841E]">{data.summary.risk_dagilimi.izaha_davet}</p>
                  <p className="text-xs text-[#5A5A5A]">Izaha Davet</p>
                </div>
                <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#FFF08C] text-center">
                  <p className="text-2xl font-bold text-[#FA841E]">{data.summary.risk_dagilimi.bilgi_isteme}</p>
                  <p className="text-xs text-[#5A5A5A]">Bilgi Isteme</p>
                </div>
                <div className="p-3 rounded-lg bg-[#E6F9FF] border border-[#ABEBFF] text-center">
                  <p className="text-2xl font-bold text-[#0049AA]">{data.summary.risk_dagilimi.takip}</p>
                  <p className="text-xs text-[#5A5A5A]">Takip</p>
                </div>
              </div>

              {/* Risk Score Summary */}
              <div className="flex items-center justify-between p-3 bg-[#F5F6F8] rounded-lg">
                <div>
                  <p className="text-xs text-[#969696]">Ortalama Risk</p>
                  <p className="text-lg font-bold text-[#2E2E2E]">{data.summary.ortalama_risk} / 100</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#969696]">En Yuksek Risk</p>
                  <p className={`text-lg font-bold ${data.summary.en_yuksek_risk >= 80 ? 'text-[#BF192B]' : data.summary.en_yuksek_risk >= 60 ? 'text-[#FA841E]' : 'text-[#2E2E2E]'}`}>
                    {data.summary.en_yuksek_risk} / 100
                  </p>
                </div>
              </div>

              {/* Triggered Scenarios */}
              {sortedScenarios.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-[#5A5A5A] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Tetiklenen Senaryolar ({sortedScenarios.length})
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {sortedScenarios.map((scenario) => (
                      <KurganScenarioCard
                        key={scenario.id}
                        scenario={scenario}
                        isExpanded={expandedScenarios.has(scenario.id)}
                        onToggle={() => toggleScenario(scenario.id)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-[#969696]">
                  <Shield className="w-12 h-12 mx-auto mb-2 text-[#00A651]" />
                  <p className="text-sm font-medium text-[#00804D]">Tetiklenen KURGAN senaryosu yok</p>
                  <p className="text-xs text-[#969696]">Islemleriniz normal gorunuyor</p>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-[#E5E5E5]">
                <TrustBadge trust={trust} />
                {(analysis.expert || analysis.ai || legal_basis_refs.length > 0) && (
                  <button
                    onClick={() => setShowExplain(true)}
                    className="text-xs text-[#0049AA] hover:text-[#00287F] font-medium"
                  >
                    Neden? &rarr;
                  </button>
                )}
              </div>
            </div>
          )}
        </PanelState>
      </Card>

      <ExplainModal
        isOpen={showExplain}
        onClose={() => setShowExplain(false)}
        title="KURGAN Risk Analizi"
        analysis={analysis}
        trust={trust}
        legalBasisRefs={legal_basis_refs}
        evidenceRefs={evidence_refs}
        meta={meta}
      />

      <KurganInfoModal isOpen={showSmmmInfo} onClose={() => setShowSmmmInfo(false)} />
    </>
  );
}
