'use client';

import React from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '../shared/Badge';
import {
  KURGAN_AKSIYON_ACIKLAMALARI,
  KURGAN_SCENARIOS,
} from '../../../../lib/rules/kurgan-scenarios';
import type { KurganTriggeredScenario } from './kurganAlertHelpers';
import { AKSIYON_COLORS, AKSIYON_ICONS } from './kurganAlertHelpers';

interface ScenarioCardProps {
  scenario: KurganTriggeredScenario;
  isExpanded: boolean;
  onToggle: () => void;
}

export function KurganScenarioCard({ scenario, isExpanded, onToggle }: ScenarioCardProps) {
  const aksiyonConfig = KURGAN_AKSIYON_ACIKLAMALARI[scenario.aksiyon];
  const colors = AKSIYON_COLORS[scenario.aksiyon];
  const Icon = AKSIYON_ICONS[scenario.aksiyon];

  // Get full scenario details from KURGAN_SCENARIOS
  const fullScenario = KURGAN_SCENARIOS[scenario.senaryo_id];

  return (
    <div className={`rounded-lg border ${colors.border} overflow-hidden`}>
      {/* Header - Clickable */}
      <button
        onClick={onToggle}
        className={`w-full p-3 flex items-center justify-between ${colors.bg} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.text} bg-white/50`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono ${colors.text}`}>{scenario.senaryo_id}</span>
              <Badge variant={scenario.aksiyon === 'INCELEME' ? 'error' :
                scenario.aksiyon === 'IZAHA_DAVET' ? 'warning' : 'default'}>
                {aksiyonConfig.ad}
              </Badge>
            </div>
            <p className={`text-sm font-medium ${colors.text}`}>{scenario.senaryo_ad}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className={`text-lg font-bold ${colors.text}`}>{scenario.risk_puani}</p>
            <p className="text-xs text-[#969696]">Risk Puani</p>
          </div>
          {isExpanded ? (
            <ChevronDown className={`w-5 h-5 ${colors.text}`} />
          ) : (
            <ChevronRight className={`w-5 h-5 ${colors.text}`} />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 bg-white space-y-4">
          {/* Aciklama */}
          {(scenario.aciklama || fullScenario?.aciklama) && (
            <div>
              <h4 className="text-xs font-semibold text-[#969696] mb-1">ACIKLAMA</h4>
              <p className="text-sm text-[#5A5A5A]">{scenario.aciklama || fullScenario?.aciklama}</p>
            </div>
          )}

          {/* Tetiklenen Kosullar */}
          {scenario.tetiklenen_kosullar.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[#969696] mb-2">TETIKLENEN KOSULLAR</h4>
              <ul className="space-y-1">
                {scenario.tetiklenen_kosullar.map((kosul, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#5A5A5A]">
                    <AlertTriangle className="w-4 h-4 text-[#FFB114] flex-shrink-0 mt-0.5" />
                    <span>{kosul}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Aksiyon Detay */}
          <div className={`p-3 rounded-lg ${colors.bg} ${colors.border} border`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${colors.text}`}>
                Aksiyon: {aksiyonConfig.ad}
              </span>
              {scenario.sure && (
                <span className="flex items-center gap-1 text-xs text-[#5A5A5A]">
                  <Clock className="w-3 h-3" />
                  Sure: {scenario.sure}
                </span>
              )}
            </div>
            <p className="text-xs text-[#5A5A5A]">{aksiyonConfig.aciklama}</p>
          </div>

          {/* Oneriler */}
          {(scenario.oneriler || fullScenario?.tetikleyiciler) && (
            <div>
              <h4 className="text-xs font-semibold text-[#969696] mb-2">NELER YAPMALISINIZ</h4>
              <ul className="space-y-1">
                {(scenario.oneriler || fullScenario?.tetikleyiciler?.slice(0, 3))?.map((oneri: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#5A5A5A]">
                    <span className="text-[#00A651]">&#10003;</span>
                    <span>{oneri}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Mevzuat */}
          {fullScenario?.mevzuat && (
            <div className="flex flex-wrap gap-1">
              {fullScenario.mevzuat.map((m: string, i: number) => (
                <Badge key={i} variant="default">{m}</Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
