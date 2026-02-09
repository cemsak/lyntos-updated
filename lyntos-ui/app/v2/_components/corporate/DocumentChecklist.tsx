'use client';

/**
 * Belge Checklist Component
 * Sprint S2 - LYNTOS V2
 *
 * Document checklist for selected corporate event type
 */

import React, { useState, useEffect } from 'react';
import { X, Clock, FileCheck, AlertCircle, CheckCircle2, Users } from 'lucide-react';
import type { CorporateEventType } from './types';
import { COMPANY_TYPE_LABELS } from './types';

interface DocumentChecklistProps {
  event: CorporateEventType | null;
  onClose?: () => void;
}

export function DocumentChecklist({ event, onClose }: DocumentChecklistProps) {
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (event) {
      // Reset checklist when event changes
      setCheckedDocs({});
    }
  }, [event?.event_code]);

  if (!event) {
    return null;
  }

  const documents = event.required_documents || [];
  const checkedCount = Object.values(checkedDocs).filter(Boolean).length;
  const progress = documents.length > 0 ? (checkedCount / documents.length) * 100 : 0;

  const toggleDoc = (doc: string) => {
    setCheckedDocs((prev) => ({
      ...prev,
      [doc]: !prev[doc],
    }));
  };

  return (
    <div className="bg-white rounded-xl border-2 border-[#0049AA]/30 p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-[16px] font-semibold text-[#2E2E2E]">
            {event.event_name}
          </h3>
          <p className="text-[12px] text-[#5A5A5A] mt-1">{event.legal_basis}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[#5A5A5A] hover:text-[#2E2E2E] transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[12px] mb-1">
          <span className="text-[#5A5A5A]">Ilerleme</span>
          <span className="font-medium text-[#2E2E2E]">
            {checkedCount}/{documents.length}
          </span>
        </div>
        <div className="h-2 bg-[#E5E5E5] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0049AA] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Quorum Info */}
      {event.gk_quorum && (
        <div className="mb-4 p-3 bg-[#FFB114]/10 border border-[#FFB114]/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-[#FFB114]" />
            <span className="text-[13px] font-medium text-[#FFB114]">Genel Kurul Nisabi</span>
          </div>
          <div className="text-[12px] text-[#5A5A5A] space-y-1">
            {Object.entries(event.gk_quorum).map(([type, quorum]) => (
              <div key={type}>
                <span className="font-medium">{COMPANY_TYPE_LABELS[type] || type}:</span>{' '}
                Toplanti: {quorum.meeting || 'Sart yok'}, Karar: {quorum.decision}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Registration Deadline */}
      {event.registration_deadline && (
        <div className="mb-4 p-3 bg-[#0049AA]/10 border border-[#0049AA]/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0049AA]" />
            <span className="text-[13px] text-[#0049AA]">
              Tescil suresi: <strong>{event.registration_deadline} gun</strong>
            </span>
          </div>
        </div>
      )}

      {/* Tax Implications */}
      {event.tax_implications && (
        <div className="mb-4 p-3 bg-[#00A651]/10 border border-[#00A651]/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-[#00A651]" />
            <span className="text-[13px] font-medium text-[#00A651]">Vergi Durumu</span>
          </div>
          <div className="text-[12px] text-[#5A5A5A] space-y-1">
            {event.tax_implications.kv_istisna && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#00A651]" />
                Kurumlar Vergisi Istisnasi
              </div>
            )}
            {event.tax_implications.kdv_istisna && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#00A651]" />
                KDV Istisnasi
              </div>
            )}
            {event.tax_implications.damga_vergisi && (
              <div>Damga Vergisi: {event.tax_implications.damga_vergisi}</div>
            )}
            {event.tax_implications.harc && <div>Harc: {event.tax_implications.harc}</div>}
            {event.tax_implications.note && (
              <div className="mt-1 text-[11px] text-[#FFB114] italic flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {event.tax_implications.note}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Checklist */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <FileCheck className="w-4 h-4 text-[#0049AA]" />
          <span className="text-[13px] font-medium text-[#2E2E2E]">
            Gerekli Belgeler
          </span>
        </div>
        {documents.map((doc, index) => (
          <label
            key={index}
            className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
              checkedDocs[doc]
                ? 'bg-[#00A651]/10'
                : 'hover:bg-[#F5F6F8]'
            }`}
          >
            <input
              type="checkbox"
              checked={checkedDocs[doc] || false}
              onChange={() => toggleDoc(doc)}
              className="mt-0.5 h-4 w-4 text-[#0049AA] rounded border-[#E5E5E5] focus:ring-[#0049AA]"
            />
            <span
              className={`text-[13px] ${
                checkedDocs[doc]
                  ? 'line-through text-[#5A5A5A]'
                  : 'text-[#2E2E2E]'
              }`}
            >
              {doc}
            </span>
          </label>
        ))}
      </div>

      {/* Notes */}
      {event.notes && (
        <div className="mt-4 p-3 bg-[#F5F6F8] border border-[#E5E5E5] rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#5A5A5A] mt-0.5" />
            <span className="text-[12px] text-[#5A5A5A]">{event.notes}</span>
          </div>
        </div>
      )}

      {/* Completion Message */}
      {progress === 100 && (
        <div className="mt-4 p-3 bg-[#00A651]/10 border border-[#00A651]/30 rounded-lg text-center">
          <span className="text-[13px] text-[#00A651] font-medium flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Tum belgeler hazir!
          </span>
        </div>
      )}
    </div>
  );
}
