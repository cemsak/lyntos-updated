import type { FileSpreadsheet } from 'lucide-react';

export type UploadMode = 'zip' | 'multi' | null;
export type UploadPhase = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';

export interface UploadResult {
  success: boolean;
  session_id: string;
  period: string;
  client_id: string;
  statistics: {
    total_files: number;
    new_files: number;
    duplicate_files: number;
    period_mismatch_files: number;
    total_parsed_rows: number;
  };
  doc_types: Record<string, number>;
  files: Array<{
    filename: string;
    doc_type: string;
    is_duplicate: boolean;
    parsed_row_count: number;
    status: string;
    message: string;
    period_validation: string;
  }>;
  warnings: string[];
  period_errors: string[] | null;
  pipeline_status: string;
  uploaded_at: string;
}

export interface FileTypeConfigEntry {
  label: string;
  icon: typeof FileSpreadsheet;
  color: string;
}
