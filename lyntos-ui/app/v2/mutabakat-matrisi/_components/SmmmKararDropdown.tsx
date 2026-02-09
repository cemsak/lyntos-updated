'use client';

import React, { useState } from 'react';
import { Badge } from '../../_components/shared/Badge';
import { Check, X, Clock, HelpCircle } from 'lucide-react';
import type { SmmmKarar, SmmmKararData } from '../_types/crossCheck';
import { SMMM_KARAR_CONFIG } from '../_types/crossCheck';

interface SmmmKararDropdownProps {
  currentKarar: SmmmKararData;
  onKararChange: (karar: SmmmKarar, not: string) => void;
}

const ICONS: Record<SmmmKarar, React.FC<{ className?: string }>> = {
  KABUL: Check,
  REDDEDILDI: X,
  INCELENIYOR: Clock,
  BILINMIYOR: HelpCircle,
};

export function SmmmKararDropdown({ currentKarar, onKararChange }: SmmmKararDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [not, setNot] = useState(currentKarar.not || '');

  const handleSelect = (karar: SmmmKarar) => {
    onKararChange(karar, not);
    setIsOpen(false);
  };

  const config = SMMM_KARAR_CONFIG[currentKarar.karar];

  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold text-[#969696] uppercase tracking-wide">SMMM Karari</label>

      <div className="flex items-center gap-2">
        <Badge variant={config.badgeVariant} size="sm" style="soft">
          {config.label}
        </Badge>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs text-[#0078D0] hover:underline"
        >
          {isOpen ? 'Kapat' : 'Degistir'}
        </button>
      </div>

      {isOpen && (
        <div className="bg-[#F5F6F8] rounded-lg p-2 space-y-1">
          {(Object.keys(SMMM_KARAR_CONFIG) as SmmmKarar[]).map(key => {
            const cfg = SMMM_KARAR_CONFIG[key];
            const Icon = ICONS[key];
            const isSelected = currentKarar.karar === key;
            return (
              <button
                key={key}
                onClick={() => handleSelect(key)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  isSelected ? 'bg-white border-2 border-[#0078D0]' : 'hover:bg-white border-2 border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0 text-[#5A5A5A]" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#2E2E2E]">{cfg.label}</div>
                  <div className="text-xs text-[#969696] truncate">{cfg.tooltip}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div>
        <label className="text-xs text-[#969696] mb-1 block">Aciklama (opsiyonel)</label>
        <textarea
          value={not}
          onChange={e => setNot(e.target.value)}
          onBlur={() => {
            if (not !== currentKarar.not) {
              onKararChange(currentKarar.karar, not);
            }
          }}
          className="w-full px-3 py-2 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0078D0]/30 focus:border-[#0078D0]"
          rows={2}
          placeholder="Karar icin aciklama..."
        />
      </div>
    </div>
  );
}
