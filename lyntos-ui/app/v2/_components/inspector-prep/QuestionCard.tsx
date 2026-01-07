'use client';

/**
 * Question Card Component
 * Sprint 8.1 - LYNTOS V2
 *
 * Displays a single inspector question with:
 * - Suggested answer approaches
 * - Avoid phrases warnings
 * - Sample answer template
 * - SMMM preparation notes
 * - Related documents
 */

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Lightbulb,
  FileText,
  Check,
  Save,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { QuestionWithTemplate } from './types';

interface QuestionCardProps {
  ruleId: string;
  ruleName: string;
  severity: string;
  question: QuestionWithTemplate;
  savedNote: string;
  onSaveNote: (note: string) => Promise<boolean>;
  onDocumentUpload: (docId: string) => void;
  isSaving: boolean;
}

export function QuestionCard({
  ruleId,
  ruleName,
  severity,
  question,
  savedNote,
  onSaveNote,
  onDocumentUpload,
  isSaving,
}: QuestionCardProps) {
  const [note, setNote] = useState(savedNote);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setNote(savedNote);
    setHasUnsavedChanges(false);
  }, [savedNote]);

  const handleNoteChange = (value: string) => {
    setNote(value);
    setHasUnsavedChanges(value !== savedNote);
  };

  const handleSave = async () => {
    const success = await onSaveNote(note);
    if (success) {
      setHasUnsavedChanges(false);
    }
  };

  const severityColors: Record<string, string> = {
    critical: '#cd3d64',
    high: '#e56f4a',
    medium: '#f5a623',
    low: '#0caf60',
  };

  const severityColor = severityColors[severity] || '#697386';

  return (
    <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-[#e3e8ee] dark:border-[#2d3343] overflow-hidden">
      {/* Question Header */}
      <div className="p-4 border-b border-[#e3e8ee] dark:border-[#2d3343]">
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
            style={{ backgroundColor: severityColor }}
          >
            {question.index + 1}
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-medium text-[#1a1f36] dark:text-white leading-relaxed">
              &quot;{question.question}&quot;
            </p>
            <p className="text-[11px] text-[#697386] mt-1">
              {ruleName} &bull; {ruleId}
            </p>
          </div>
        </div>
      </div>

      {/* Answer Suggestions */}
      {question.template && (
        <div className="p-4 border-b border-[#e3e8ee] dark:border-[#2d3343]">
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="flex items-center gap-2 text-[13px] font-medium text-[#635bff] mb-3 w-full"
          >
            <Lightbulb className="w-4 h-4" />
            Tavsiye Edilen Cevap Yaklasimi
            {showSuggestions ? (
              <ChevronUp className="w-4 h-4 ml-auto" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-auto" />
            )}
          </button>

          {showSuggestions && (
            <div className="space-y-3">
              {/* Suggested Approaches */}
              <div className="p-3 bg-[#635bff]/5 rounded-lg">
                <p className="text-[11px] font-medium text-[#635bff] mb-2">
                  Kullanilabilecek ifadeler:
                </p>
                <ul className="space-y-1">
                  {question.template.suggested_approaches.map((approach, i) => (
                    <li
                      key={i}
                      className="text-[12px] text-[#697386] flex items-start gap-2"
                    >
                      <span className="text-[#0caf60]">&bull;</span>
                      {approach}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Avoid Phrases */}
              <div className="p-3 bg-[#cd3d64]/5 rounded-lg">
                <p className="text-[11px] font-medium text-[#cd3d64] mb-2">
                  Kacinilmasi gereken ifadeler:
                </p>
                <ul className="space-y-1">
                  {question.template.avoid_phrases.map((phrase, i) => (
                    <li
                      key={i}
                      className="text-[12px] text-[#697386] flex items-start gap-2"
                    >
                      <span className="text-[#cd3d64]">&times;</span>
                      &quot;{phrase}&quot;
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sample Answer */}
              <div className="p-3 bg-[#f6f9fc] dark:bg-[#0a0d14] rounded-lg">
                <p className="text-[11px] font-medium text-[#1a1f36] dark:text-white mb-2">
                  Ornek cevap sablonu:
                </p>
                <p className="text-[12px] text-[#697386] italic leading-relaxed">
                  &quot;{question.template.sample_answer}&quot;
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preparation Notes */}
      <div className="p-4 border-b border-[#e3e8ee] dark:border-[#2d3343]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#697386]" />
            <p className="text-[13px] font-medium text-[#1a1f36] dark:text-white">
              Hazirlik Notlariniz
            </p>
          </div>
          {hasUnsavedChanges && (
            <span className="text-[10px] text-[#f5a623]">
              Kaydedilmemis degisiklik
            </span>
          )}
        </div>
        <textarea
          value={note}
          onChange={(e) => handleNoteChange(e.target.value)}
          placeholder="Bu soru icin kendi hazirlik notlarinizi yazin..."
          className="w-full h-24 px-3 py-2 text-[13px] bg-[#f6f9fc] dark:bg-[#0a0d14] border border-[#e3e8ee] dark:border-[#2d3343] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#635bff]/20 text-[#1a1f36] dark:text-white placeholder:text-[#697386]"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-[#635bff] hover:bg-[#5851ea] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="w-3 h-3" />
                Notu Kaydet
              </>
            )}
          </button>
        </div>
      </div>

      {/* Related Documents */}
      {question.relatedDocuments.length > 0 && (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-[#697386]" />
            <p className="text-[13px] font-medium text-[#1a1f36] dark:text-white">
              Ilgili Belgeler
            </p>
          </div>
          <div className="space-y-2">
            {question.relatedDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-2 bg-[#f6f9fc] dark:bg-[#0a0d14] rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={
                      doc.status === 'pending'
                        ? 'text-[#f5a623]'
                        : 'text-[#0caf60]'
                    }
                  >
                    {doc.status === 'pending' ? '\u2610' : '\u2611'}
                  </span>
                  <span
                    className={`text-[12px] ${
                      doc.status === 'pending'
                        ? 'text-[#1a1f36] dark:text-white'
                        : 'text-[#697386] line-through'
                    }`}
                  >
                    {doc.name}
                  </span>
                </div>
                {doc.status === 'pending' ? (
                  <button
                    onClick={() => onDocumentUpload(doc.id)}
                    className="px-2 py-1 text-[10px] font-medium text-[#635bff] hover:bg-[#635bff]/10 rounded transition-colors"
                  >
                    Yukle
                  </button>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-[#0caf60]">
                    <Check className="w-3 h-3" />
                    Hazir
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
