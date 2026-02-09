/**
 * Duplicate Kural Yönetim Paneli
 */

import { useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Duplicate } from '../_types';
import { resolutionLabels } from '../_lib/constants';

interface DuplicatePanelProps {
  duplicates: Duplicate[];
  showDuplicates: boolean;
  setShowDuplicates: (show: boolean) => void;
  onResolve: (ruleId1: string, ruleId2: string, resolution: string) => Promise<boolean>;
}

export function DuplicatePanel({
  duplicates,
  showDuplicates,
  setShowDuplicates,
  onResolve
}: DuplicatePanelProps) {
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const pendingCount = duplicates.filter(d => d.resolution === 'pending').length;
  const resolvedCount = duplicates.length - pendingCount;

  const handleResolve = async (dup: Duplicate, resolution: string) => {
    const id = `${dup.rule_id_1}-${dup.rule_id_2}`;
    setResolvingId(id);
    await onResolve(dup.rule_id_1, dup.rule_id_2, resolution);
    setResolvingId(null);
  };

  return (
    <div className={`border rounded-lg p-4 ${pendingCount > 0 ? 'bg-[#FFFBEB] border-[#FFF08C]' : 'bg-[#ECFDF5] border-[#AAE8B8]'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${pendingCount > 0 ? 'bg-[#FFFBEB]' : 'bg-[#ECFDF5]'}`}>
            {pendingCount > 0 ? (
              <AlertTriangle className="w-5 h-5 text-[#FA841E]" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[#00804D]" />
            )}
          </div>
          <div>
            <p className={`font-medium ${pendingCount > 0 ? 'text-[#E67324]' : 'text-[#005A46]'}`}>
              {pendingCount > 0 ? 'Duplicate Kural Yönetimi' : 'Tüm Duplicate\'lar Çözümlendi'}
            </p>
            <p className={`text-sm ${pendingCount > 0 ? 'text-[#FA841E]' : 'text-[#00804D]'}`}>
              {pendingCount > 0
                ? `${pendingCount} bekleyen, ${resolvedCount} çözülmüş duplicate`
                : `${resolvedCount} duplicate çözümlendi`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowDuplicates(!showDuplicates)}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            pendingCount > 0
              ? 'bg-[#FFFBEB] text-[#FA841E] hover:bg-[#FFF08C]'
              : 'bg-[#ECFDF5] text-[#00804D] hover:bg-[#AAE8B8]'
          }`}
        >
          {showDuplicates ? 'Gizle' : 'Göster'}
        </button>
      </div>

      {showDuplicates && (
        <div className="mt-4 space-y-3">
          {duplicates.map((dup, i) => {
            const isPending = dup.resolution === 'pending';
            const resInfo = resolutionLabels[dup.resolution] || resolutionLabels.pending;
            const id = `${dup.rule_id_1}-${dup.rule_id_2}`;
            const isResolving = resolvingId === id;

            return (
              <div
                key={i}
                className={`bg-white rounded-lg p-4 border ${isPending ? 'border-[#FFF08C]' : 'border-[#E5E5E5]'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-sm bg-[#F5F6F8] px-2 py-0.5 rounded">{dup.rule_id_1}</span>
                      <span className="text-[#969696]">↔</span>
                      <span className="font-mono text-sm bg-[#F5F6F8] px-2 py-0.5 rounded">{dup.rule_id_2}</span>
                    </div>
                    <p className="text-sm text-[#5A5A5A]">{dup.overlap_description}</p>
                    {dup.resolved_at && (
                      <p className="text-xs text-[#969696] mt-1">
                        Çözüldü: {new Date(dup.resolved_at).toLocaleDateString('tr-TR')}
                        {dup.resolved_by && ` • ${dup.resolved_by}`}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isPending ? (
                      // Çözümleme butonları
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleResolve(dup, 'keep_both')}
                          disabled={isResolving}
                          className="px-2 py-1 text-xs bg-[#ECFDF5] text-[#00804D] rounded hover:bg-[#AAE8B8] disabled:opacity-50"
                          title="İkisini de koru"
                        >
                          {isResolving ? '...' : '✅ İkisini Koru'}
                        </button>
                        <button
                          onClick={() => handleResolve(dup, 'deprecate_1')}
                          disabled={isResolving}
                          className="px-2 py-1 text-xs bg-[#FEF2F2] text-[#BF192B] rounded hover:bg-[#FFC7C9] disabled:opacity-50"
                          title={`${dup.rule_id_1} kuralını devre dışı bırak`}
                        >
                          ❌ {dup.rule_id_1}
                        </button>
                        <button
                          onClick={() => handleResolve(dup, 'deprecate_2')}
                          disabled={isResolving}
                          className="px-2 py-1 text-xs bg-[#FEF2F2] text-[#BF192B] rounded hover:bg-[#FFC7C9] disabled:opacity-50"
                          title={`${dup.rule_id_2} kuralını devre dışı bırak`}
                        >
                          ❌ {dup.rule_id_2}
                        </button>
                      </div>
                    ) : (
                      // Çözüm durumu gösterimi
                      <span className={`text-xs px-2 py-1 rounded ${resInfo.color}`}>
                        {resInfo.icon} {resInfo.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
