import React from 'react';
import { Database, Copy, FileCheck, AlertTriangle, FileText } from 'lucide-react';
import type { IngestResult } from './uploadModalTypes';

interface IngestStatisticsViewProps {
  ingestResult: IngestResult | null;
}

export function IngestStatisticsView({ ingestResult }: IngestStatisticsViewProps) {
  if (!ingestResult?.statistics) return null;

  const stats = ingestResult.statistics;
  const newFiles = stats.new_files ?? stats.new_blobs ?? 0;
  const dupFiles = stats.duplicate_files ?? stats.duplicate_blobs ?? 0;
  const totalFiles = stats.total_files ?? 0;
  const periodMismatch = stats.period_mismatch_files ?? 0;
  const parsedRows = stats.total_parsed_rows ?? 0;
  const dedupeRate = totalFiles > 0 ? Math.round((dupFiles / totalFiles) * 100) : 0;

  return (
    <div className="mt-4 bg-[#F5F6F8] rounded-lg p-4 text-sm">
      <h4 className="font-medium text-[#5A5A5A] mb-3 flex items-center gap-2">
        <Database className="w-4 h-4" />
        İşlem Sonucu
      </h4>

      <div className="grid grid-cols-2 gap-3">
        {/* Dosya istatistikleri */}
        <div className="bg-white rounded p-2">
          <div className="text-xs text-[#969696]">Toplam Dosya</div>
          <div className="font-semibold text-[#5A5A5A]">{totalFiles}</div>
        </div>

        <div className="bg-white rounded p-2">
          <div className="text-xs text-[#969696] flex items-center gap-1">
            <FileCheck className="w-3 h-3" />
            Yeni Dosya
          </div>
          <div className="font-semibold text-[#00804D]">{newFiles}</div>
        </div>

        <div className="bg-white rounded p-2">
          <div className="text-xs text-[#969696] flex items-center gap-1">
            <Copy className="w-3 h-3" />
            Duplicate
          </div>
          <div className="font-semibold text-[#FA841E]">{dupFiles}</div>
        </div>

        <div className="bg-white rounded p-2">
          <div className="text-xs text-[#969696] flex items-center gap-1">
            <FileText className="w-3 h-3" />
            Parse Edilen Satır
          </div>
          <div className="font-semibold text-[#0049AA]">{parsedRows.toLocaleString('tr-TR')}</div>
        </div>
      </div>

      {/* Dedupe rate bar */}
      {dedupeRate > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-[#969696] mb-1">
            <span>Dedupe Oranı</span>
            <span className="font-medium text-[#FA841E]">{dedupeRate}%</span>
          </div>
          <div className="h-2 bg-[#E5E5E5] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FFB114] rounded-full transition-all duration-500"
              style={{ width: `${dedupeRate}%` }}
            />
          </div>
          <p className="text-xs text-[#969696] mt-1">
            {dupFiles} dosya zaten sistemde mevcut
          </p>
        </div>
      )}

      {/* Period mismatch warning */}
      {periodMismatch > 0 && (
        <div className="mt-3 bg-[#FEF2F2] rounded-lg p-3 border border-[#FECACA]">
          <div className="flex items-center gap-2 text-sm text-[#DC2626]">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{periodMismatch} dosya dönem uyuşmazlığı</span>
          </div>
          {ingestResult.period_errors?.map((pe, i) => (
            <p key={i} className="text-xs text-[#DC2626] mt-1 ml-6">
              {pe.filename} → {pe.detected_period}
            </p>
          ))}
        </div>
      )}

      {/* Dosya detayları (opsiyonel) */}
      {ingestResult.files && ingestResult.files.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#E5E5E5]">
          <div className="text-xs text-[#969696] mb-2">Dosya Detayları</div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {ingestResult.files.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-[#5A5A5A] truncate flex-1 mr-2" title={f.filename}>
                  {f.filename}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[#969696]">{f.doc_type}</span>
                  {f.is_duplicate ? (
                    <span className="text-[#FA841E] bg-[#FFF7ED] px-1.5 py-0.5 rounded text-[10px]">DUP</span>
                  ) : f.status === 'period_mismatch' ? (
                    <span className="text-[#DC2626] bg-[#FEF2F2] px-1.5 py-0.5 rounded text-[10px]">DÖNEM</span>
                  ) : f.status === 'OK' ? (
                    <span className="text-[#00804D] bg-[#ECFDF5] px-1.5 py-0.5 rounded text-[10px]">
                      {f.parsed_row_count > 0 ? `${f.parsed_row_count} satır` : 'OK'}
                    </span>
                  ) : (
                    <span className="text-[#969696] bg-[#F5F6F8] px-1.5 py-0.5 rounded text-[10px]">{f.status}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uyarılar */}
      {ingestResult.warnings && ingestResult.warnings.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#E5E5E5]">
          <div className="text-xs text-[#FA841E] space-y-1">
            {ingestResult.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-1">
                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
