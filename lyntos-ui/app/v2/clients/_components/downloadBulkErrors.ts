import type { BulkError } from '../_types/client';

export function downloadBulkErrors(bulkErrors: BulkError[]) {
  if (bulkErrors.length === 0) return;
  const BOM = '\uFEFF';
  const header = 'Satır No;VKN;Hata';
  const rows = bulkErrors.map(e => `${e.satir};${e.vkn};${e.hata}`);
  const csv = BOM + [header, ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'hatali_satirlar.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
