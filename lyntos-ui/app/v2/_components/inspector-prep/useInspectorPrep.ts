'use client';

/**
 * Inspector Preparation Hook
 * Sprint 8.1 - LYNTOS V2
 *
 * Handles preparation notes API calls and state management
 */

import { useState, useCallback } from 'react';
import { getAuthToken } from '../../_lib/auth';
import type {
  PreparationNote,
  PreparationProgress,
  NotesResponse,
} from './types';

interface UseInspectorPrepOptions {
  clientId: string;
  period: string;
}

export function useInspectorPrep({ clientId, period }: UseInspectorPrepOptions) {
  const [notes, setNotes] = useState<Record<string, PreparationNote>>({});
  const [progress, setProgress] = useState<PreparationProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/v1/inspector-prep/notes/${clientId}?period=${period}`,
        {
          headers: {
            Authorization: getAuthToken() || '',
          },
        }
      );
      if (response.ok) {
        const data: NotesResponse = await response.json();
        const notesMap: Record<string, PreparationNote> = {};
        data.notes.forEach((n: PreparationNote) => {
          notesMap[`${n.rule_id}-${n.question_index}`] = n;
        });
        setNotes(notesMap);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, period]);

  const loadProgress = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/v1/inspector-prep/progress/${clientId}?period=${period}`,
        {
          headers: {
            Authorization: getAuthToken() || '',
          },
        }
      );
      if (response.ok) {
        const data: PreparationProgress = await response.json();
        setProgress(data);
      }
    } catch (err) {
      console.error('Failed to load progress:', err);
    }
  }, [clientId, period]);

  const saveNote = useCallback(
    async (
      ruleId: string,
      questionIndex: number,
      noteText: string
    ): Promise<boolean> => {
      setIsSaving(true);
      try {
        const response = await fetch('/api/v1/inspector-prep/notes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: getAuthToken() || '',
          },
          body: JSON.stringify({
            client_id: clientId,
            period,
            rule_id: ruleId,
            question_index: questionIndex,
            note_text: noteText,
          }),
        });

        if (response.ok) {
          const key = `${ruleId}-${questionIndex}`;
          setNotes((prev) => ({
            ...prev,
            [key]: {
              rule_id: ruleId,
              question_index: questionIndex,
              note_text: noteText,
              updated_at: new Date().toISOString(),
            },
          }));
          return true;
        }
        return false;
      } catch (err) {
        console.error('Failed to save note:', err);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [clientId, period]
  );

  const updateDocumentStatus = useCallback(
    async (
      documentId: string,
      status: 'pending' | 'uploaded' | 'verified',
      fileUrl?: string
    ): Promise<boolean> => {
      try {
        const response = await fetch('/api/v1/inspector-prep/document-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: getAuthToken() || '',
          },
          body: JSON.stringify({
            client_id: clientId,
            period,
            document_id: documentId,
            status,
            file_url: fileUrl,
          }),
        });

        if (response.ok) {
          await loadProgress();
          return true;
        }
        return false;
      } catch (err) {
        console.error('Failed to update document status:', err);
        return false;
      }
    },
    [clientId, period, loadProgress]
  );

  const getNote = useCallback(
    (ruleId: string, questionIndex: number): string => {
      return notes[`${ruleId}-${questionIndex}`]?.note_text || '';
    },
    [notes]
  );

  return {
    notes,
    progress,
    isLoading,
    isSaving,
    loadNotes,
    loadProgress,
    saveNote,
    updateDocumentStatus,
    getNote,
  };
}
