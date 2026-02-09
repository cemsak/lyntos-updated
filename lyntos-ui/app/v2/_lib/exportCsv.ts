/**
 * CSV Export Utility
 *
 * Generates and downloads CSV files from tabular data.
 * Uses BOM for Excel UTF-8 compatibility.
 * Separator: semicolon (;) for Turkish Excel compatibility.
 */

interface ExportColumn<T> {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
}

export function exportToCsv<T>(
  filename: string,
  data: T[],
  columns: ExportColumn<T>[]
): void {
  if (data.length === 0) {
    console.warn('exportToCsv: Dışa aktarılacak veri yok.');
    return;
  }

  // BOM for UTF-8 Excel compatibility
  const BOM = '\uFEFF';

  // Header row
  const headerRow = columns.map(c => escapeCell(c.header)).join(';');

  // Data rows
  const dataRows = data.map(row =>
    columns.map(col => {
      const val = col.accessor(row);
      if (val === null || val === undefined) return '';
      if (typeof val === 'number') {
        // Use comma as decimal separator for Turkish locale
        return val.toFixed(2).replace('.', ',');
      }
      return escapeCell(String(val));
    }).join(';')
  );

  const csvContent = BOM + [headerRow, ...dataRows].join('\r\n');

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCell(value: string): string {
  // If contains semicolon, newline, or quote, wrap in quotes
  if (value.includes(';') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
