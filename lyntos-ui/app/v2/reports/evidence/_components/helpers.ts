import { formatDate as formatDateCentral } from '../../../_lib/format';

export const copyHash = (hash: string) => {
  navigator.clipboard.writeText(hash);
};

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatDate = (dateStr: string) =>
  formatDateCentral(dateStr, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
