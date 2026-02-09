'use client';

/**
 * Document Checklist
 * Birleşik belge listesi: Simulator alarm belgeleri + Statik temel belgeler
 * Priority-sorted, localStorage persist
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileCheck,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { KurganAlarm, RequiredDocument } from '../../../../_components/vdk-simulator/types';
import { PRIORITY_CONFIG } from '../../../../_components/vdk-simulator/types';

// Statik temel belgeler (simulator'da olmayan)
const STATIC_DOCUMENTS = [
  { id: 'static-kasa-sayim', name: 'Kasa sayım tutanağı', priority: 'critical' as const, category: 'likidite' },
  { id: 'static-adat-hesap', name: 'Kasa adat hesaplama tablosu', priority: 'high' as const, category: 'likidite' },
  { id: 'static-banka-mutabakat', name: 'Banka mutabakatları', priority: 'high' as const, category: 'likidite' },
  { id: 'static-ortak-mutabakat', name: 'Ortaklarla mutabakat', priority: 'medium' as const, category: 'ortaklar' },
  { id: 'static-faiz-fatura', name: '131 hesap faiz faturaları', priority: 'medium' as const, category: 'ortaklar' },
  { id: 'static-e-fatura', name: 'e-Fatura/e-İrsaliye eşleştirme', priority: 'medium' as const, category: 'ticari' },
  { id: 'static-sgk', name: 'SGK ödeme makbuzları', priority: 'medium' as const, category: 'vergi_sgk' },
  { id: 'static-kkeg', name: 'KKEG hesaplama tablosu', priority: 'medium' as const, category: 'vergi_sgk' },
  { id: 'static-stok-sayim', name: 'Stok sayım tutanakları', priority: 'medium' as const, category: 'stok' },
  { id: 'static-amortisman', name: 'Amortisman defteri', priority: 'low' as const, category: 'duran_varlik' },
];

interface MergedDocument {
  id: string;
  name: string;
  description?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  source: 'simulator' | 'static';
  alarm_code?: string;
}

interface DocumentChecklistProps {
  alarms: KurganAlarm[];
  clientId: string;
  period: string;
}

export function DocumentChecklist({
  alarms,
  clientId,
  period,
}: DocumentChecklistProps) {
  const storageKey = `vdk-oracle-docs-${clientId}-${period}`;

  // Checked items from localStorage
  const [checkedItems, setCheckedItems] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...checkedItems]));
    } catch {
      // localStorage not available
    }
  }, [checkedItems, storageKey]);

  const toggleItem = useCallback((id: string) => {
    setCheckedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Belgeleri birleştir
  const documents = mergeDocuments(alarms);

  const completedCount = documents.filter((d) => checkedItems.has(d.id)).length;
  const totalCount = documents.length;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#2E2E2E] flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-[#00804D]" />
          Belge Checklist
        </h3>
        <span className="text-sm text-[#969696]">
          {completedCount}/{totalCount} (%{completionPercent})
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-[#F5F6F8] rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            completionPercent >= 80
              ? 'bg-[#00A651]'
              : completionPercent >= 50
                ? 'bg-[#FFB114]'
                : 'bg-[#F0282D]'
          }`}
          style={{ width: `${completionPercent}%` }}
        />
      </div>

      <div className="space-y-2">
        {documents.map((doc) => {
          const isChecked = checkedItems.has(doc.id);
          const priority = PRIORITY_CONFIG[doc.priority];

          return (
            <div
              key={doc.id}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                isChecked
                  ? 'bg-[#ECFDF5] border border-[#AAE8B8]'
                  : 'bg-[#F5F6F8] border border-[#E5E5E5] hover:border-[#B4B4B4]'
              }`}
              onClick={() => toggleItem(doc.id)}
            >
              {isChecked ? (
                <CheckCircle className="w-5 h-5 text-[#00804D] flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-[#B4B4B4] flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm block ${
                    isChecked ? 'text-[#005A46] line-through' : 'text-[#2E2E2E]'
                  }`}
                >
                  {doc.name}
                </span>
                {doc.description && (
                  <span className="text-[10px] text-[#969696] block truncate">
                    {doc.description}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {doc.alarm_code && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#FEF2F2] text-[#BF192B] rounded">
                    {doc.alarm_code}
                  </span>
                )}
                <span
                  className="w-4 h-4 flex items-center justify-center text-[10px] font-bold rounded flex-shrink-0"
                  style={{
                    backgroundColor: `${priority.color}20`,
                    color: priority.color,
                  }}
                >
                  {priority.icon}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// BELGE BİRLEŞTİRME
// ============================================================================

function mergeDocuments(alarms: KurganAlarm[]): MergedDocument[] {
  const documents: MergedDocument[] = [];
  const seenNames = new Set<string>();

  // 1. Simulator triggered alarm belgelerini al
  const triggeredAlarms = (alarms || []).filter((a) => a.triggered);
  for (const alarm of triggeredAlarms) {
    for (const doc of alarm.required_documents || []) {
      const key = doc.name.toLowerCase();
      if (seenNames.has(key)) continue;
      seenNames.add(key);

      documents.push({
        id: doc.id || `sim-${alarm.rule_id}-${documents.length}`,
        name: doc.name,
        description: doc.description,
        priority: doc.priority || 'medium',
        source: 'simulator',
        alarm_code: alarm.rule_id,
      });
    }
  }

  // 2. Statik belgeleri ekle (tekrar olmayanlar)
  for (const staticDoc of STATIC_DOCUMENTS) {
    const key = staticDoc.name.toLowerCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);

    documents.push({
      id: staticDoc.id,
      name: staticDoc.name,
      priority: staticDoc.priority,
      source: 'static',
    });
  }

  // 3. Priority'ye göre sırala
  const priorityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  documents.sort(
    (a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3)
  );

  return documents;
}
