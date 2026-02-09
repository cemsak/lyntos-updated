'use client';

/**
 * Inspector Preparation Panel Component
 * Sprint 8.1 - LYNTOS V2
 *
 * Main panel for inspector question preparation:
 * - Alarm tabs for navigation
 * - Question carousel with prev/next
 * - Progress tracking
 * - Export and share actions
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Download,
  Send,
  FileCheck,
  Loader2,
} from 'lucide-react';
import { getAuthToken } from '../../_lib/auth';
import { useToast } from '../shared/Toast';
import { QuestionCard } from './QuestionCard';
import { useInspectorPrep } from './useInspectorPrep';
import type { KurganAlarm } from '../vdk-simulator/types';
import type { QuestionWithTemplate, AnswerTemplate } from './types';

interface InspectorPrepPanelProps {
  clientId: string;
  clientName: string;
  period: string;
  alarms: KurganAlarm[];
  answerTemplates: Record<string, AnswerTemplate[]>;
}

export function InspectorPrepPanel({
  clientId,
  clientName,
  period,
  alarms,
  answerTemplates,
}: InspectorPrepPanelProps) {
  const { showToast } = useToast();
  const [selectedAlarmIndex, setSelectedAlarmIndex] = useState(0);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const {
    notes,
    progress,
    isLoading,
    isSaving,
    loadNotes,
    loadProgress,
    saveNote,
    updateDocumentStatus,
    getNote,
  } = useInspectorPrep({ clientId, period });

  useEffect(() => {
    loadNotes();
    loadProgress();
  }, [loadNotes, loadProgress]);

  // Filter only triggered alarms
  const triggeredAlarms = useMemo(
    () => alarms.filter((a) => a.triggered),
    [alarms]
  );

  const currentAlarm = triggeredAlarms[selectedAlarmIndex];

  // Build questions with templates
  const questionsWithTemplates: QuestionWithTemplate[] = useMemo(() => {
    if (!currentAlarm) return [];

    const templates = answerTemplates[currentAlarm.rule_id] || [];

    return currentAlarm.inspector_questions.map((q, index) => {
      const template = templates.find((t) => t.question_index === index);
      const relatedDocIds = template?.key_documents || [];

      return {
        index,
        question: q,
        template,
        note: getNote(currentAlarm.rule_id, index),
        relatedDocuments: currentAlarm.required_documents
          .filter((d) => relatedDocIds.includes(d.id))
          .map((d) => ({
            id: d.id,
            name: d.name,
            status:
              progress?.documents.find((pd) => pd.document_id === d.id)
                ?.status || 'pending',
          })),
      };
    });
  }, [currentAlarm, answerTemplates, getNote, progress]);

  const currentQuestion = questionsWithTemplates[selectedQuestionIndex];

  // Calculate total stats
  const totalQuestions = triggeredAlarms.reduce(
    (sum, a) => sum + a.inspector_questions.length,
    0
  );
  const notesCount = Object.keys(notes).length;
  const docsReady = progress?.documents_ready || 0;
  const docsTotal = progress?.documents_total || 0;

  const handlePrevQuestion = () => {
    if (selectedQuestionIndex > 0) {
      setSelectedQuestionIndex(selectedQuestionIndex - 1);
    } else if (selectedAlarmIndex > 0) {
      setSelectedAlarmIndex(selectedAlarmIndex - 1);
      const prevAlarm = triggeredAlarms[selectedAlarmIndex - 1];
      setSelectedQuestionIndex(prevAlarm.inspector_questions.length - 1);
    }
  };

  const handleNextQuestion = () => {
    if (
      currentAlarm &&
      selectedQuestionIndex < currentAlarm.inspector_questions.length - 1
    ) {
      setSelectedQuestionIndex(selectedQuestionIndex + 1);
    } else if (selectedAlarmIndex < triggeredAlarms.length - 1) {
      setSelectedAlarmIndex(selectedAlarmIndex + 1);
      setSelectedQuestionIndex(0);
    }
  };

  const handleSaveNote = async (noteText: string) => {
    if (!currentAlarm) return false;
    return saveNote(currentAlarm.rule_id, selectedQuestionIndex, noteText);
  };

  const handleExportPDF = useCallback(async () => {
    setIsExporting(true);
    try {
      const response = await fetch(
        `/api/v1/inspector-prep/export-pdf/${clientId}?period=${period}`,
        {
          headers: {
            Authorization: getAuthToken() || '',
          },
        }
      );

      if (!response.ok) {
        throw new Error('PDF oluşturulamadı');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VDK_Hazirlik_${clientName.replace(/\s+/g, '_')}_${period.replace('/', '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export failed:', err);
      showToast('error', 'PDF oluşturulurken hata oluştu');
    } finally {
      setIsExporting(false);
    }
  }, [clientId, clientName, period]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-8">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-[#0049AA] border-t-transparent rounded-full animate-spin" />
          <p className="text-[14px] text-[#5A5A5A]">Hazirlik yukl&rsquo;eniyor...</p>
        </div>
      </div>
    );
  }

  if (triggeredAlarms.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-8 text-center">
        <FileCheck className="w-12 h-12 text-[#00A651] mx-auto mb-4" />
        <p className="text-[14px] font-medium text-[#2E2E2E]">
          Hazirlik gerektiren alarm yok
        </p>
        <p className="text-[13px] text-[#5A5A5A] mt-1">
          Tum kontroller basarili
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#E5E5E5]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-[#0049AA]" />
            <div>
              <h2 className="text-[16px] font-semibold text-[#2E2E2E]">
                Mufettis Sorulari Hazirlik
              </h2>
              <p className="text-[12px] text-[#5A5A5A]">
                {clientName} &bull; {period} &bull; {triggeredAlarms.length}{' '}
                alarm
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alarm Tabs */}
      <div className="p-2 border-b border-[#E5E5E5] flex gap-2 overflow-x-auto">
        {triggeredAlarms.map((alarm, index) => (
          <button
            key={alarm.rule_id}
            onClick={() => {
              setSelectedAlarmIndex(index);
              setSelectedQuestionIndex(0);
            }}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-lg whitespace-nowrap transition-colors ${
              index === selectedAlarmIndex
                ? 'bg-[#0049AA] text-white'
                : 'bg-[#F5F6F8] text-[#5A5A5A] hover:text-[#2E2E2E]'
            }`}
          >
            {alarm.rule_id}: {alarm.rule_name}
          </button>
        ))}
      </div>

      {/* Question Navigation */}
      <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
        <button
          onClick={handlePrevQuestion}
          disabled={selectedAlarmIndex === 0 && selectedQuestionIndex === 0}
          className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium text-[#5A5A5A] hover:text-[#2E2E2E] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Onceki Soru
        </button>

        <span className="text-[12px] text-[#5A5A5A]">
          Soru {selectedQuestionIndex + 1} /{' '}
          {currentAlarm?.inspector_questions.length || 0}
        </span>

        <button
          onClick={handleNextQuestion}
          disabled={
            selectedAlarmIndex === triggeredAlarms.length - 1 &&
            selectedQuestionIndex ===
              (currentAlarm?.inspector_questions.length || 0) - 1
          }
          className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium text-[#5A5A5A] hover:text-[#2E2E2E] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Sonraki Soru
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Current Question */}
      <div className="p-4">
        {currentAlarm && currentQuestion && (
          <QuestionCard
            ruleId={currentAlarm.rule_id}
            ruleName={currentAlarm.rule_name}
            severity={currentAlarm.severity}
            question={currentQuestion}
            savedNote={currentQuestion.note || ''}
            onSaveNote={handleSaveNote}
            onDocumentUpload={(docId) => updateDocumentStatus(docId, 'uploaded')}
            isSaving={isSaving}
          />
        )}
      </div>

      {/* Progress Footer */}
      <div className="p-4 border-t border-[#E5E5E5]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4 text-[12px] text-[#5A5A5A]">
            <span>Toplam Soru: {totalQuestions}</span>
            <span>Notlu: {notesCount}</span>
            <span>
              Belge Hazir: {docsReady}/{docsTotal || '-'}
            </span>
          </div>
          <span className="text-[12px] font-medium text-[#0049AA]">
            %{Math.round((notesCount / totalQuestions) * 100 || 0)} Tamamlandi
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-[#E5E5E5] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0049AA] rounded-full transition-all duration-300"
            style={{ width: `${(notesCount / totalQuestions) * 100 || 0}%` }}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-[#5A5A5A] hover:text-[#2E2E2E] border border-[#E5E5E5] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Oluşturuluyor...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                PDF&apos;e Aktar
              </>
            )}
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-[#0049AA] hover:bg-[#00287F] rounded-lg transition-colors">
            <Send className="w-4 h-4" />
            Mukellefe Gonder
          </button>
        </div>
      </div>
    </div>
  );
}
