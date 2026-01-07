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
      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-[#e3e8ee] dark:border-[#2d3343] p-8">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-[#635bff] border-t-transparent rounded-full animate-spin" />
          <p className="text-[14px] text-[#697386]">
            Kontrol listesi yukleniyor...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-[#cd3d64] p-6">
        <div className="flex items-center gap-3 text-[#cd3d64]">
          <AlertTriangle className="w-5 h-5" />
          <p className="text-[14px]">{error}</p>
        </div>
        <button
          onClick={loadChecklist}
          className="mt-4 px-4 py-2 text-[13px] font-medium text-white bg-[#635bff] rounded-lg hover:bg-[#5851ea] transition-colors"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (!checklist || checklist.checklist.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-[#e3e8ee] dark:border-[#2d3343] p-8 text-center">
        <FileCheck className="w-12 h-12 text-[#0caf60] mx-auto mb-4" />
        <p className="text-[14px] font-medium text-[#1a1f36] dark:text-white">
          Hazirlanacak belge yok
        </p>
        <p className="text-[13px] text-[#697386] mt-1">
          Tum kontroller basarili
        </p>
      </div>
    );
  }

  const { stats } = checklist;

  return (
    <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-[#e3e8ee] dark:border-[#2d3343] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#e3e8ee] dark:border-[#2d3343]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileCheck className="w-6 h-6 text-[#635bff]" />
            <div>
              <h2 className="text-[16px] font-semibold text-[#1a1f36] dark:text-white">
                Hazirlik Kontrol Listesi
              </h2>
              <p className="text-[12px] text-[#697386]">
                {clientName} &bull; {period}
              </p>
            </div>
          </div>
          <button
            onClick={loadChecklist}
            className="p-2 text-[#697386] hover:text-[#1a1f36] dark:hover:text-white hover:bg-[#f6f9fc] dark:hover:bg-[#0a0d14] rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 border-b border-[#e3e8ee] dark:border-[#2d3343]">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-[#0caf60]/10 rounded-lg">
            <p className="text-[24px] font-bold text-[#0caf60]">
              {stats.ready}
            </p>
            <p className="text-[11px] text-[#697386]">Hazir</p>
          </div>
          <div className="text-center p-3 bg-[#f5a623]/10 rounded-lg">
            <p className="text-[24px] font-bold text-[#f5a623]">
              {stats.total - stats.ready - stats.pending}
            </p>
            <p className="text-[11px] text-[#697386]">Bekleniyor</p>
          </div>
          <div className="text-center p-3 bg-[#cd3d64]/10 rounded-lg">
            <p className="text-[24px] font-bold text-[#cd3d64]">
              {stats.pending}
            </p>
            <p className="text-[11px] text-[#697386]">Eksik</p>
          </div>
          <div className="text-center p-3 bg-[#635bff]/10 rounded-lg">
            <p className="text-[24px] font-bold text-[#635bff]">
              {stats.progress_percent}%
            </p>
            <p className="text-[11px] text-[#697386]">Ilerleme</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-2 bg-[#e3e8ee] dark:bg-[#2d3343] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0caf60] rounded-full transition-all duration-500"
            style={{ width: `${stats.progress_percent}%` }}
          />
        </div>
      </div>

      {/* Checklist by Rule */}
      <div className="divide-y divide-[#e3e8ee] dark:divide-[#2d3343]">
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
                className="w-full p-4 flex items-center justify-between text-left hover:bg-[#f6f9fc] dark:hover:bg-[#0a0d14] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[14px]">
                    {readyCount === totalCount ? '✅' : '🔴'}
                  </span>
                  <div>
                    <p className="text-[14px] font-medium text-[#1a1f36] dark:text-white">
                      {alarm.rule_id}: {alarm.rule_name}
                    </p>
                    <p className="text-[11px] text-[#697386]">
                      {alarm.finding_summary}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-[#697386]">
                    {readyCount}/{totalCount} belge
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#697386]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#697386]" />
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
      <div className="p-4 border-t border-[#e3e8ee] dark:border-[#2d3343]">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[#697386]">
            {stats.ready} / {stats.total} belge hazir
          </p>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-[#697386] hover:text-[#1a1f36] dark:hover:text-white border border-[#e3e8ee] dark:border-[#2d3343] rounded-lg transition-colors">
              <Mail className="w-4 h-4" />
              Eksik Liste Gonder
            </button>
            <button
              onClick={handleDownloadBundle}
              disabled={isCreatingBundle || stats.ready === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-[#635bff] hover:bg-[#5851ea] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreatingBundle ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Olusturuluyor...
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
