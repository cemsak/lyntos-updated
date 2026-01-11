'use client';

/**
 * KURGAN Alarm Card Component
 * Sprint 8.0 - LYNTOS V2
 *
 * Displays a single KURGAN alarm with:
 * - Finding summary
 * - Inspector questions
 * - Required documents checklist
 * - Legal references
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  MessageSquare,
  FileText,
  Scale,
  CheckCircle2,
  Upload,
} from 'lucide-react';
import type { KurganAlarm, RequiredDocument } from './types';
import { SEVERITY_CONFIG, CATEGORY_LABELS, PRIORITY_CONFIG } from './types';

interface KurganAlarmCardProps {
  alarm: KurganAlarm;
  onDocumentUpload?: (docId: string) => void;
}

export function KurganAlarmCard({
  alarm,
  onDocumentUpload,
}: KurganAlarmCardProps) {
  const [isExpanded, setIsExpanded] = useState(alarm.triggered);
  const severity = SEVERITY_CONFIG[alarm.severity];
  const category = CATEGORY_LABELS[alarm.category] || alarm.category;

  // Non-triggered alarm: show as passed check
  if (!alarm.triggered) {
    return (
      <div className="p-4 rounded-lg border border-[#e3e8ee] bg-[#0caf60]/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#0caf60]" />
            <span className="text-[13px] font-medium text-[#1a1f36]">
              {alarm.rule_name}
            </span>
            <span className="px-2 py-0.5 text-[10px] font-medium bg-[#0caf60]/10 text-[#0caf60] rounded">
              {alarm.rule_id}
            </span>
          </div>
          <span className="text-[12px] text-[#0caf60] font-medium">
            Normal
          </span>
        </div>
        {alarm.finding_summary && (
          <p className="mt-2 text-[12px] text-[#697386] ml-8">
            {alarm.finding_summary}
          </p>
        )}
      </div>
    );
  }

  // Triggered alarm: expandable card
  return (
    <div
      className={`rounded-lg border-2 overflow-hidden ${severity.bgColor}`}
      style={{ borderColor: severity.color }}
    >
      {/* Header - Clickable */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle
            className="w-5 h-5 flex-shrink-0"
            style={{ color: severity.color }}
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-semibold text-[#1a1f36]">
                {alarm.rule_name}
              </span>
              <span
                className="px-2 py-0.5 text-[10px] font-bold rounded"
                style={{ backgroundColor: severity.color, color: 'white' }}
              >
                {alarm.rule_id}
              </span>
            </div>
            <p className="text-[12px] text-[#697386] mt-0.5">{category}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="px-2 py-1 text-[11px] font-medium rounded"
            style={{
              backgroundColor: `${severity.color}20`,
              color: severity.color,
            }}
          >
            {severity.label}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[#697386]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#697386]" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Finding Summary */}
          <div className="p-3 bg-white rounded-lg">
            <p className="text-[13px] font-medium text-[#1a1f36] mb-2">
              Tespit:
            </p>
            <p className="text-[13px] text-[#697386]">
              {alarm.finding_summary}
            </p>
            {alarm.details && Object.keys(alarm.details).length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                {Object.entries(alarm.details)
                  .slice(0, 6)
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-2">
                      <span className="text-[#697386] truncate">
                        {formatDetailKey(key)}:
                      </span>
                      <span className="font-medium text-[#1a1f36]">
                        {formatDetailValue(value)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Inspector Questions */}
          {alarm.inspector_questions.length > 0 && (
            <div className="p-3 bg-white rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare
                  className="w-4 h-4"
                  style={{ color: severity.color }}
                />
                <p className="text-[13px] font-medium text-[#1a1f36]">
                  Mufettis Sorulari:
                </p>
              </div>
              <ul className="space-y-2">
                {alarm.inspector_questions.map((question, i) => (
                  <li
                    key={i}
                    className="text-[12px] text-[#697386] flex items-start gap-2"
                  >
                    <span
                      className="mt-1 flex-shrink-0"
                      style={{ color: severity.color }}
                    >
                      {i + 1}.
                    </span>
                    <span className="italic">&quot;{question}&quot;</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Required Documents */}
          {alarm.required_documents.length > 0 && (
            <div className="p-3 bg-white rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <FileText
                  className="w-4 h-4"
                  style={{ color: severity.color }}
                />
                <p className="text-[13px] font-medium text-[#1a1f36]">
                  Hazirlanacak Belgeler:
                </p>
              </div>
              <ul className="space-y-2">
                {alarm.required_documents.map((doc) => (
                  <DocumentItem
                    key={doc.id}
                    document={doc}
                    onUpload={() => onDocumentUpload?.(doc.id)}
                  />
                ))}
              </ul>
            </div>
          )}

          {/* Legal References */}
          {alarm.legal_references.length > 0 && (
            <div className="p-3 bg-white rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Scale className="w-4 h-4 text-[#697386]" />
                <p className="text-[13px] font-medium text-[#1a1f36]">
                  Yasal Dayanak:
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {alarm.legal_references.map((ref, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 text-[11px] bg-[#f6f9fc] text-[#697386] rounded"
                  >
                    {ref}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Document Item Sub-component
function DocumentItem({
  document,
  onUpload,
}: {
  document: RequiredDocument;
  onUpload: () => void;
}) {
  const priority = PRIORITY_CONFIG[document.priority];

  return (
    <li className="flex items-center justify-between text-[12px] py-1">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span
          className="w-4 h-4 flex items-center justify-center text-[10px] font-bold rounded flex-shrink-0"
          style={{
            backgroundColor: document.uploaded
              ? '#0caf60'
              : `${priority.color}20`,
            color: document.uploaded ? 'white' : priority.color,
          }}
        >
          {document.uploaded ? '\u2713' : priority.icon}
        </span>
        <div className="min-w-0 flex-1">
          <span
            className={`block truncate ${
              document.uploaded
                ? 'text-[#697386] line-through'
                : 'text-[#1a1f36]'
            }`}
          >
            {document.name}
          </span>
          <span className="text-[10px] text-[#697386] truncate block">
            {document.description}
          </span>
        </div>
      </div>
      {!document.uploaded ? (
        <button
          onClick={onUpload}
          className="ml-2 px-2 py-1 text-[10px] font-medium text-[#635bff] hover:bg-[#635bff]/10 rounded flex items-center gap-1 flex-shrink-0"
        >
          <Upload className="w-3 h-3" />
          Yukle
        </button>
      ) : (
        <span className="ml-2 text-[10px] text-[#0caf60] flex-shrink-0">
          Yuklendi
        </span>
      )}
    </li>
  );
}

// Helper functions
function formatDetailKey(key: string): string {
  const labels: Record<string, string> = {
    kasa_bakiyesi: 'Kasa',
    aktif_toplam: 'Aktif',
    oran: 'Oran',
    esik: 'Esik',
    sektor: 'Sektor',
    ortaklardan_alacak: '131 Hesap',
    sermaye: 'Sermaye',
    faiz_tahakkuk: 'Faiz',
    stok_bakiyesi: 'Stok',
    satis_maliyeti: 'SMM',
    devir_hizi: 'Devir',
    sektor_ortalama: 'Sekt. Ort.',
    sapma_yuzdesi: 'Sapma',
    ticari_alacak: 'Tic. Alacak',
    supheli_alacak: 'Supheli',
    karsilik: 'Karsilik',
    net_supheli: 'Net Supheli',
    duran_varlik: 'D. Varlik',
    birikmis_amortisman: 'B. Amor.',
    onceki_yil: 'Onceki Yil',
    onceki_matrah: 'Onceki',
    guncel_yil: 'Guncel Yil',
    guncel_matrah: 'Guncel',
    degisim_yuzdesi: 'Degisim',
    riskli_tedarikci_sayisi: 'Riskli Ted.',
    uyari: 'Uyari',
  };
  return labels[key] || key.replace(/_/g, ' ');
}

function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined) return '-';

  if (typeof value === 'number') {
    if (Math.abs(value) >= 1000) {
      return new Intl.NumberFormat('tr-TR').format(value) + ' TL';
    }
    if (value % 1 !== 0) {
      return value.toFixed(2);
    }
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.slice(0, 3).join(', ') + (value.length > 3 ? '...' : '');
  }

  return String(value);
}
