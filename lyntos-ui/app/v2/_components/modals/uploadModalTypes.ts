import type { BelgeTipi } from '../donem-verileri/types';

export interface IngestStatistics {
  total_files: number;
  new_files: number;
  duplicate_files: number;
  period_mismatch_files: number;
  total_parsed_rows: number;
  // Legacy compatibility fields (may come from old backend)
  garbage_files?: number;
  processable_files?: number;
  new_blobs?: number;
  duplicate_blobs?: number;
  dedupe_rate?: number;
  new_canonical_docs?: number;
  updated_canonical_docs?: number;
}

export interface IngestFileResult {
  filename: string;
  doc_type: string;
  is_duplicate: boolean;
  parsed_row_count: number;
  status: string;
  message: string;
  period_validation?: string;
}

export interface PeriodError {
  filename: string;
  detected_period: string;
  detail: string;
}

export interface IngestResult {
  success: boolean;
  session_id: string;
  client_id: string;
  period: string;
  statistics: IngestStatistics;
  doc_types: Record<string, number>;
  files: IngestFileResult[];
  warnings: string[];
  period_errors?: PeriodError[] | null;
  pipeline_status?: string;
  uploaded_at?: string;
  // Legacy
  status?: string;
  error_message?: string;
}

export interface PipelineStatus {
  session_id: string;
  pipeline_status: string;
  pipeline_detail: string;
  pipeline_completed_at: string | null;
  cross_check_count: number;
  analysis_findings_count: number;
}

export type PipelinePhase = 'uploading' | 'parsing' | 'cross_checking' | 'analyzing' | 'completed' | 'error';

export const PIPELINE_LABELS: Record<PipelinePhase, string> = {
  uploading: 'Dosya yükleniyor...',
  parsing: 'Dosyalar parse ediliyor...',
  cross_checking: 'Çapraz kontroller yapılıyor...',
  analyzing: 'Risk analizi çalışıyor...',
  completed: 'Tamamlandı',
  error: 'Hata oluştu',
};

export const PIPELINE_ORDER: PipelinePhase[] = ['uploading', 'parsing', 'cross_checking', 'analyzing', 'completed'];

export interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  belgeTipi: BelgeTipi | null;
  onSuccess: (belgeTipi: BelgeTipi) => void;
}
