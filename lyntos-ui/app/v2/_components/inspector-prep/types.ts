/**
 * Inspector Preparation Types
 * Sprint 8.1 - LYNTOS V2
 */

export interface AnswerTemplate {
  question_index: number;
  question: string;
  suggested_approaches: string[];
  avoid_phrases: string[];
  key_documents: string[];
  sample_answer: string;
}

export interface PreparationNote {
  rule_id: string;
  question_index: number;
  note_text: string;
  updated_at: string;
}

export interface DocumentStatus {
  document_id: string;
  status: 'pending' | 'uploaded' | 'verified';
  uploaded_at?: string;
}

export interface PreparationProgress {
  client_id: string;
  period: string | null;
  notes_count: number;
  documents_ready: number;
  documents_total: number;
  documents: DocumentStatus[];
}

export interface QuestionWithTemplate {
  index: number;
  question: string;
  template?: AnswerTemplate;
  note?: string;
  relatedDocuments: {
    id: string;
    name: string;
    status: 'pending' | 'uploaded' | 'verified';
  }[];
}

export interface NotesResponse {
  client_id: string;
  period: string | null;
  notes: PreparationNote[];
}

export interface AnswerTemplatesResponse {
  success: boolean;
  templates: Record<
    string,
    {
      rule_name: string;
      templates: AnswerTemplate[];
    }
  >;
}
