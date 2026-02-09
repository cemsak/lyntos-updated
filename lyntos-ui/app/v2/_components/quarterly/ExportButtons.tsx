/**
 * LYNTOS Export Buttons Component
 * PDF ve ZIP bundle indirme butonlari
 */

'use client';

import React, { useState } from 'react';
import { FileText, FolderArchive, Loader2 } from 'lucide-react';
import { useToast } from '../shared/Toast';
import { generateQuarterlyEvidenceBundle, downloadQuarterlyPDFOnly } from '../../_lib/evidence';
import type { EngineCheckReport } from '../../_lib/parsers/crosscheck/types';
import type { ParsedData } from '../../_hooks/useQuarterlyAnalysis';

interface ExportButtonsProps {
  report: EngineCheckReport;
  parsedData: ParsedData;
  startTime: number | null;
  endTime: number | null;
}

export function ExportButtons({ report, parsedData, startTime, endTime }: ExportButtonsProps) {
  const { showToast } = useToast();
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingBundle, setIsExportingBundle] = useState(false);

  const handlePDFExport = async () => {
    setIsExportingPDF(true);
    try {
      await downloadQuarterlyPDFOnly(report);
    } catch (error) {
      console.error('PDF export error:', error);
      showToast('error', 'PDF olusturulurken hata olustu.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleBundleExport = async () => {
    if (!startTime || !endTime) return;

    setIsExportingBundle(true);
    try {
      await generateQuarterlyEvidenceBundle(report, parsedData, startTime, endTime);
    } catch (error) {
      console.error('Bundle export error:', error);
      showToast('error', 'Evidence bundle olusturulurken hata olustu.');
    } finally {
      setIsExportingBundle(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      {/* PDF Export */}
      <button
        onClick={handlePDFExport}
        disabled={isExportingPDF}
        className="flex items-center gap-2 px-4 py-2 bg-[#BF192B] text-white rounded-lg hover:bg-[#BF192B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isExportingPDF ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        <span>PDF Indir</span>
      </button>

      {/* Bundle Export */}
      <button
        onClick={handleBundleExport}
        disabled={isExportingBundle || !startTime || !endTime}
        className="flex items-center gap-2 px-4 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#0049AA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isExportingBundle ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FolderArchive className="w-4 h-4" />
        )}
        <span>Evidence Bundle (ZIP)</span>
      </button>
    </div>
  );
}
