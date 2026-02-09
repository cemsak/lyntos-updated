'use client';

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  ChevronDown,
  BookOpen,
  CheckCircle2,
  Factory,
  Cpu,
  Building2,
  Globe,
  Sprout,
  Beaker,
  Star,
  Info,
} from 'lucide-react';
import { SEKTOR_TESVIKLERI } from '../_lib/constants';
import { useDashboardScope } from '../../_components/scope';
import type { SektorTesviki } from '../_types/corporate';

const sektorIkonlari: Record<string, React.ReactNode> = {
  arge: <Beaker className="w-6 h-6 text-white" />,
  teknopark: <Cpu className="w-6 h-6 text-white" />,
  osb: <Factory className="w-6 h-6 text-white" />,
  'yatirim-tesvik': <Building2 className="w-6 h-6 text-white" />,
  ihracat: <Globe className="w-6 h-6 text-white" />,
  tarim: <Sprout className="w-6 h-6 text-white" />,
};

const sektorRenkleri: Record<string, string> = {
  arge: 'from-[#7C3AED] to-[#5B21B6]',
  teknopark: 'from-[#0078D0] to-[#0049AA]',
  osb: 'from-[#E67324] to-[#C05621]',
  'yatirim-tesvik': 'from-[#00A651] to-[#00804D]',
  ihracat: 'from-[#0049AA] to-[#00287F]',
  tarim: 'from-[#16A34A] to-[#15803D]',
};

/**
 * Mükellefin sektör/NACE koduna göre teşvikleri filtreler ve sıralar.
 * İlgili teşvikler önce, diğerleri sonra.
 */
function filterAndSortTesvikler(
  tesvikler: SektorTesviki[],
  clientSector?: string,
  clientNaceCode?: string
): { ilgili: SektorTesviki[]; diger: SektorTesviki[] } {
  if (!clientSector && !clientNaceCode) {
    return { ilgili: [], diger: tesvikler };
  }

  const sectorLower = (clientSector || '').toLowerCase();
  const nacePrefix = (clientNaceCode || '').substring(0, 2);

  const ilgili: SektorTesviki[] = [];
  const diger: SektorTesviki[] = [];

  for (const t of tesvikler) {
    let matched = false;

    // NACE kodu eşleştirme
    if (nacePrefix && t.naceKodlari && t.naceKodlari.length > 0) {
      if (t.naceKodlari.some(code => nacePrefix.startsWith(code) || code.startsWith(nacePrefix))) {
        matched = true;
      }
    }

    // Sektör anahtar kelime eşleştirme
    if (!matched && sectorLower && t.sektorAnahtarKelimeleri && t.sektorAnahtarKelimeleri.length > 0) {
      if (t.sektorAnahtarKelimeleri.some(kw => sectorLower.includes(kw) || kw.includes(sectorLower))) {
        matched = true;
      }
    }

    // Genel teşvikler (NACE kodu olmayan) herkese uygun
    if (!matched && (!t.naceKodlari || t.naceKodlari.length === 0)) {
      matched = true;
    }

    if (matched) {
      ilgili.push(t);
    } else {
      diger.push(t);
    }
  }

  return { ilgili, diger };
}

function TesvikKart({
  tesvik,
  isExpanded,
  onToggle,
  highlighted,
}: {
  tesvik: SektorTesviki;
  isExpanded: boolean;
  onToggle: () => void;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
        highlighted
          ? 'border-[#00A651] ring-1 ring-[#00A651]/20'
          : 'border-[#E5E5E5]'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-[#F5F6F8]/50 transition-colors"
      >
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${sektorRenkleri[tesvik.id] || 'from-[#5A5A5A] to-[#2E2E2E]'} flex items-center justify-center shadow-lg`}>
          {sektorIkonlari[tesvik.id] || <Sparkles className="w-6 h-6 text-white" />}
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-[#2E2E2E]">{tesvik.sektor}</h4>
            {highlighted && (
              <span className="flex items-center gap-1 text-[10px] font-semibold bg-[#ECFDF5] text-[#00804D] px-2 py-0.5 rounded-full border border-[#00A651]/20">
                <Star className="w-3 h-3" />
                Uygun
              </span>
            )}
          </div>
          <p className="text-sm text-[#969696]">{tesvik.tesvik}</p>
        </div>
        <div className="text-right mr-2">
          <span className="text-sm font-bold text-[#00804D] bg-[#ECFDF5] px-3 py-1 rounded-full">
            {tesvik.kvOrani}
          </span>
        </div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-[#F5F6F8] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          <ChevronDown className="w-5 h-5 text-[#969696]" />
        </div>
      </button>

      {isExpanded && (
        <div className="px-5 pb-5 border-t border-[#E5E5E5] animate-slide-up">
          <div className="pt-4 space-y-4">
            <div className="bg-[#ECFDF5] rounded-xl p-4 border border-[#00A651]/20">
              <p className="text-sm text-[#2E2E2E] leading-relaxed">{tesvik.avantaj}</p>
            </div>

            <div className="bg-[#F5F6F8] rounded-xl p-4">
              <h5 className="text-sm font-bold text-[#5A5A5A] mb-3">Yararlanma Koşulları</h5>
              <div className="space-y-2">
                {tesvik.kosullar.map((kosul, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-[#5A5A5A]">
                    <CheckCircle2 className="w-4 h-4 text-[#00A651] mt-0.5 flex-shrink-0" />
                    {kosul}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-[#E6F9FF] rounded-lg">
              <BookOpen className="w-3.5 h-3.5 text-[#0049AA]" />
              <span className="text-xs text-[#0049AA]">Yasal Dayanak:</span>
              <span className="text-xs font-medium text-[#0049AA]">{tesvik.yasalDayanak}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SektorTesvikleri() {
  const { selectedClient } = useDashboardScope();
  const [expandedSektor, setExpandedSektor] = useState<string | null>(null);

  const { ilgili, diger } = useMemo(
    () =>
      filterAndSortTesvikler(
        SEKTOR_TESVIKLERI,
        selectedClient?.sector,
        selectedClient?.naceCode
      ),
    [selectedClient?.sector, selectedClient?.naceCode]
  );

  const hasClient = !!selectedClient;
  const hasMatches = ilgili.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFCE19] to-[#FFB114] flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-[#2E2E2E]">Sektör Teşvikleri (2026)</h3>
          <p className="text-sm text-[#969696]">
            {hasClient && selectedClient?.sector
              ? `${selectedClient.shortName} — ${selectedClient.sector} sektörüne göre filtrelendi`
              : 'Sektöre göre vergi avantajları ve teşvik programları'}
          </p>
        </div>
      </div>

      {/* Mükellef bilgisi yoksa uyarı */}
      {!hasClient && (
        <div className="flex items-center gap-3 px-4 py-3 bg-[#FFF8E1] border border-[#FFB114]/30 rounded-xl">
          <Info className="w-5 h-5 text-[#E67324] flex-shrink-0" />
          <p className="text-sm text-[#5A5A5A]">
            Mükellef seçildiğinde, sektörüne uygun teşvikler öncelikli olarak gösterilir.
          </p>
        </div>
      )}

      {/* Mükellefe Uygun Teşvikler */}
      {hasMatches && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-[#00A651]" />
            <h4 className="text-sm font-bold text-[#00804D]">
              Mükellefinize Uygun Teşvikler
            </h4>
            <span className="text-xs text-[#969696]">({ilgili.length})</span>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {ilgili.map((tesvik) => (
              <TesvikKart
                key={tesvik.id}
                tesvik={tesvik}
                isExpanded={expandedSektor === tesvik.id}
                onToggle={() => setExpandedSektor(expandedSektor === tesvik.id ? null : tesvik.id)}
                highlighted
              />
            ))}
          </div>
        </div>
      )}

      {/* Diğer Teşvikler */}
      {diger.length > 0 && (
        <div className="space-y-3">
          {hasMatches && (
            <h4 className="text-sm font-semibold text-[#969696]">
              Diğer Teşvikler ({diger.length})
            </h4>
          )}
          <div className="grid grid-cols-1 gap-3">
            {diger.map((tesvik) => (
              <TesvikKart
                key={tesvik.id}
                tesvik={tesvik}
                isExpanded={expandedSektor === tesvik.id}
                onToggle={() => setExpandedSektor(expandedSektor === tesvik.id ? null : tesvik.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
