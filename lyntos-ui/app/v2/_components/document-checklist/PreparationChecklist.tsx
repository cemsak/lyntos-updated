'use client';

/**
 * Preparation Checklist Panel Component
 * Sprint 8.2 - LYNTOS V2
 *
 * Main panel for document preparation checklist:
 * - Stats overview (ready, pending, waiting)
 * - Collapsible rule sections
 * - Document upload per item
 * - Evidence bundle download
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  FileCheck,
  Package,
  Mail,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { DocumentCard } from './DocumentCard';
import { useDocumentChecklist } from './useDocumentChecklist';
import { PRIORITY_CONFIG } from './types';

interface PreparationChecklistProps {
  clientId: string;
  clientName: string;
  period: string;
}

export function PreparationChecklist({
  clientId,
  clientName,
  period,
}: PreparationChecklistProps) {
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [isCreatingBundle, setIsCreatingBundle] = useState(false);

  const {
    checklist,
    isLoading,
    uploadProgress,
    error,
    loadChecklist,
    uploadDocument,
    deleteDocument,
    downloadBundle,
  } = useDocumentChecklist({ clientId, period });

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  useEffect(() => {
    // Auto-expand rules with pending documents
    if (checklist) {
      const rulesWithPending = checklist.checklist
        .filter((c) => c.documents.some((d) => d.status === 'pending'))
        .map((c) => c.rule_id);
      setExpandedRules(new Set(rulesWithPending));
    }
  }, [checklist]);

  const toggleRule = useCallback((ruleId: string) => {
    setExpandedRules((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  }, []);

  const handleDownloadBundle = useCallback(async () => {
    setIsCreatingBundle(true);
    await downloadBundle();
    setIsCreatingBundle(false);
  }, [downloadBundle]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-8">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-[#0049AA] border-t-transparent rounded-full animate-spin" />
          <p className="text-[14px] text-[#5A5A5A]">
            Kontrol listesi yukleniyor...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-[#F0282D] p-6">
        <div className="flex items-center gap-3 text-[#F0282D]">
          <AlertTriangle className="w-5 h-5" />
          <p className="text-[14px]">{error}</p>
        </div>
        <button
          onClick={loadChecklist}
          className="mt-4 px-4 py-2 text-[13px] font-medium text-white bg-[#0049AA] rounded-lg hover:bg-[#00287F] transition-colors"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (!checklist || checklist.checklist.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-8 text-center">
        <FileCheck className="w-12 h-12 text-[#00A651] mx-auto mb-4" />
        <p className="text-[14px] font-medium text-[#2E2E2E]">
          Hazirlanacak belge yok
        </p>
        <p className="text-[13px] text-[#5A5A5A] mt-1">
          Tum kontroller basarili
        </p>
      </div>
    );
  }

  const { stats } = checklist;

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#E5E5E5]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileCheck className="w-6 h-6 text-[#0049AA]" />
            <div>
              <h2 className="text-[16px] font-semibold text-[#2E2E2E]">
                Hazirlik Kontrol Listesi
              </h2>
              <p className="text-[12px] text-[#5A5A5A]">
                {clientName} &bull; {period}
              </p>
            </div>
          </div>
          <button
            onClick={loadChecklist}
            className="p-2 text-[#5A5A5A] hover:text-[#2E2E2E] hover:bg-[#F5F6F8] rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 border-b border-[#E5E5E5]">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-[#00A651]/10 rounded-lg">
            <p className="text-[24px] font-bold text-[#00A651]">
              {stats.ready}
            </p>
            <p className="text-[11px] text-[#5A5A5A]">Hazir</p>
          </div>
          <div className="text-center p-3 bg-[#FFB114]/10 rounded-lg">
            <p className="text-[24px] font-bold text-[#FFB114]">
              {stats.total - stats.ready - stats.pending}
            </p>
            <p className="text-[11px] text-[#5A5A5A]">Bekleniyor</p>
          </div>
          <div className="text-center p-3 bg-[#F0282D]/10 rounded-lg">
            <p className="text-[24px] font-bold text-[#F0282D]">
              {stats.pending}
            </p>
            <p className="text-[11px] text-[#5A5A5A]">Eksik</p>
          </div>
          <div className="text-center p-3 bg-[#0049AA]/10 rounded-lg">
            <p className="text-[24px] font-bold text-[#0049AA]">
              {stats.progress_percent}%
            </p>
            <p className="text-[11px] text-[#5A5A5A]">Ilerleme</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-2 bg-[#E5E5E5] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#00A651] rounded-full transition-all duration-500"
            style={{ width: `${stats.progress_percent}%` }}
          />
        </div>
      </div>

      {/* Checklist by Rule */}
      <div className="divide-y divide-[#E5E5E5]">
        {checklist.checklist.map((alarm) => {
          const isExpanded = expandedRules.has(alarm.rule_id);
          const readyCount = alarm.documents.filter(
            (d) => d.status === 'uploaded'
          ).length;
          const totalCount = alarm.documents.length;

          return (
            <div key={alarm.rule_id}>
              {/* Rule Header */}
              <button
                onClick={() => toggleRule(alarm.rule_id)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F5F6F8] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[14px]">
                    {readyCount === totalCount ? '✅' : '🔴'}
                  </span>
                  <div>
                    <p className="text-[14px] font-medium text-[#2E2E2E]">
                      {alarm.rule_id}: {alarm.rule_name}
                    </p>
                    <p className="text-[11px] text-[#5A5A5A]">
                      {alarm.finding_summary}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-[#5A5A5A]">
                    {readyCount}/{totalCount} belge
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#5A5A5A]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#5A5A5A]" />
                  )}
                </div>
              </button>

              {/* Documents */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  {alarm.documents
                    .sort(
                      (a, b) =>
                        PRIORITY_CONFIG[a.priority].order -
                        PRIORITY_CONFIG[b.priority].order
                    )
                    .map((doc) => (
                      <DocumentCard
                        key={doc.document_id}
                        document={doc}
                        ruleId={alarm.rule_id}
                        onUpload={(file, notes) =>
                          uploadDocument(
                            doc.document_id,
                            alarm.rule_id,
                            file,
                            notes
                          )
                        }
                        onDelete={() => deleteDocument(doc.document_id)}
                        isUploading={uploadProgress[doc.document_id] || false}
                      />
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-[#E5E5E5]">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[#5A5A5A]">
            {stats.ready} / {stats.total} belge hazir
          </p>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-[#5A5A5A] hover:text-[#2E2E2E] border border-[#E5E5E5] rounded-lg transition-colors">
              <Mail className="w-4 h-4" />
              Eksik Liste Gonder
            </button>
            <button
              onClick={handleDownloadBundle}
              disabled={isCreatingBundle || stats.ready === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-[#0049AA] hover:bg-[#00287F] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreatingBundle ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  Kanit Dosyasi Indir
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
