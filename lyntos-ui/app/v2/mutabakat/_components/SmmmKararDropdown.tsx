'use client';
import React, { useState } from 'react';
import { Save, FileText, FolderX, HelpCircle } from 'lucide-react';
import type { SmmmKarar, SmmmKararData } from '../_types/cariMutabakat';
import { SMMM_KARAR_CONFIG } from '../_types/cariMutabakat';

interface SmmmKararDropdownProps {
  currentKarar: SmmmKararData;
  onKararChange: (karar: SmmmKarar, not: string) => void;
}

const KARAR_OPTIONS: { value: SmmmKarar; icon: React.ReactNode }[] = [
  { value: 'RESMI', icon: <FileText className="w-4 h-4" /> },
  { value: 'DEFTER_DISI', icon: <FolderX className="w-4 h-4" /> },
  { value: 'BILINMIYOR', icon: <HelpCircle className="w-4 h-4" /> },
];

/**
 * SMMM karar seciisi: RESMI / DEFTER_DISI / BILINMIYOR
 * Not alanı ve kaydet butonu ile.
 */
export function SmmmKararDropdown({
  currentKarar,
  onKararChange,
}: SmmmKararDropdownProps) {
  const [selectedKarar, setSelectedKarar] = useState<SmmmKarar>(currentKarar.karar);
  const [not, setNot] = useState(currentKarar.not);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onKararChange(selectedKarar, not);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const hasChanged = selectedKarar !== currentKarar.karar || not !== currentKarar.not;

  return (
    <div className="bg-white rounded-lg border border-[#E5E5E5] p-4 space-y-3">
      <h4 className="text-sm font-semibold text-[#5A5A5A]">SMMM Karari</h4>

      {/* Karar Seçimi */}
      <div className="flex gap-2">
        {KARAR_OPTIONS.map((opt) => {
          const config = SMMM_KARAR_CONFIG[opt.value];
          const isActive = selectedKarar === opt.value;

          return (
            <button
              key={opt.value}
              onClick={() => setSelectedKarar(opt.value)}
              title={config.tooltip}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? opt.value === 'RESMI'
                    ? 'bg-[#E6F9FF] text-[#0049AA] border border-[#ABEBFF]'
                    : opt.value === 'DEFTER_DISI'
                      ? 'bg-[#F5F6F8] text-[#5A5A5A] border border-[#B4B4B4]'
                      : 'bg-[#FFFBEB] text-[#E67324] border border-[#FFE045]'
                  : 'bg-[#F5F6F8] text-[#969696] border border-transparent hover:border-[#E5E5E5]'
              }`}
            >
              {opt.icon}
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Tooltip */}
      <p className="text-xs text-[#969696]">
        {SMMM_KARAR_CONFIG[selectedKarar].tooltip}
      </p>

      {/* Defter Dışı Uyarısı */}
      {selectedKarar === 'DEFTER_DISI' && (
        <div className="bg-[#FFFBEB] border border-[#FFE045] rounded-lg p-3">
          <p className="text-xs text-[#E67324]">
            Defter disi olarak isaretlenen farklar risk hesaplamalarina dahil edilmez.
          </p>
        </div>
      )}

      {/* Not Alanı */}
      <div>
        <label className="text-xs text-[#969696] mb-1 block">Not (opsiyonel)</label>
        <textarea
          value={not}
          onChange={(e) => setNot(e.target.value)}
          placeholder="SMMM aciklamasi..."
          rows={2}
          className="w-full text-sm border border-[#E5E5E5] rounded-lg px-3 py-2 focus:outline-none focus:border-[#0078D0] resize-none"
        />
      </div>

      {/* Kaydet */}
      <button
        onClick={handleSave}
        disabled={!hasChanged && !saved}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
          saved
            ? 'bg-[#00A651] text-white'
            : hasChanged
              ? 'bg-[#0049AA] text-white hover:bg-[#00287F]'
              : 'bg-[#F5F6F8] text-[#B4B4B4] cursor-not-allowed'
        }`}
      >
        <Save className="w-4 h-4" />
        {saved ? 'Kaydedildi' : 'Kaydet'}
      </button>
    </div>
  );
}
