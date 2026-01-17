/**
 * LYNTOS PDF Report Generator
 * Profesyonel çapraz kontrol raporu PDF'i oluşturur
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { EngineCheckReport } from '../../parsers/crosscheck/types';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

const COLORS = {
  primary: [37, 99, 235] as [number, number, number],    // Blue
  success: [34, 197, 94] as [number, number, number],    // Green
  danger: [239, 68, 68] as [number, number, number],     // Red
  warning: [234, 179, 8] as [number, number, number],    // Yellow
  gray: [107, 114, 128] as [number, number, number],     // Gray
  lightGray: [243, 244, 246] as [number, number, number] // Light gray
};

function formatNumber(num: number | string | null): string {
  if (num === null) return '-';
  if (typeof num === 'string') return num;
  return num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getStatusText(status: string): string {
  switch (status) {
    case 'pass': return 'Basarili';
    case 'fail': return 'Basarisiz';
    case 'partial': return 'Kismi';
    case 'skip': return 'Atlandi';
    default: return status;
  }
}

export async function generatePDFReport(report: EngineCheckReport): Promise<Blob> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // Helper function for new page check
  const checkNewPage = (requiredSpace: number) => {
    if (y + requiredSpace > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // === HEADER ===
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('LYNTOS', margin, 18);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Capraz Kontrol Raporu', margin, 28);

  doc.setFontSize(10);
  doc.text(formatDate(new Date()), pageWidth - margin, 28, { align: 'right' });

  y = 45;

  // === TAXPAYER INFO ===
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Mukellef Bilgileri', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const taxpayerData = [
    ['Unvan', report.unvan || '-'],
    ['VKN', report.vkn || '-'],
    ['Donem', report.donem || '-']
  ];

  autoTable(doc, {
    startY: y,
    head: [],
    body: taxpayerData,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 30 },
      1: { cellWidth: 'auto' }
    },
    margin: { left: margin }
  });

  y = doc.lastAutoTable.finalY + 10;

  // === SUMMARY ===
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Ozet', margin, y);
  y += 8;

  const summaryData = [
    ['Toplam Kontrol', String(report.summary.totalChecks)],
    ['Basarili', String(report.summary.passed)],
    ['Basarisiz', String(report.summary.failed)],
    ['Kismi', String(report.summary.partial)],
    ['Atlandi', String(report.summary.skipped)],
    ['Kritik Uyumsuzluk', String(report.summary.criticalIssues)]
  ];

  autoTable(doc, {
    startY: y,
    head: [],
    body: summaryData,
    theme: 'striped',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: margin, right: pageWidth - margin - 80 },
    alternateRowStyles: { fillColor: COLORS.lightGray }
  });

  y = doc.lastAutoTable.finalY + 15;

  // === CRITICAL ISSUES ALERT ===
  if (report.summary.criticalIssues > 0) {
    checkNewPage(20);

    doc.setFillColor(...COLORS.danger);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 15, 2, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `${report.summary.criticalIssues} Kritik Uyumsuzluk Tespit Edildi`,
      margin + 5,
      y + 10
    );

    doc.setTextColor(0, 0, 0);
    y += 25;
  }

  // === DETAILED RESULTS ===
  checkNewPage(30);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Kontrol Detaylari', margin, y);
  y += 8;

  // Group by category
  const categories = ['kdv', 'muhtasar', 'banka', 'yevmiye', 'edefter'];
  const categoryLabels: Record<string, string> = {
    kdv: 'KDV Kontrolleri',
    muhtasar: 'Muhtasar Kontrolleri',
    banka: 'Banka Kontrolleri',
    yevmiye: 'Yevmiye Kontrolleri',
    edefter: 'e-Defter Kontrolleri'
  };

  for (const category of categories) {
    const categoryResults = report.results.filter(r => r.category === category);
    if (categoryResults.length === 0) continue;

    checkNewPage(40);

    // Category header
    doc.setFillColor(...COLORS.lightGray);
    doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text(categoryLabels[category] || category, margin + 3, y + 6);
    doc.setTextColor(0, 0, 0);
    y += 12;

    // Results table
    const tableData = categoryResults.map(r => [
      r.ruleId,
      r.ruleName.substring(0, 40) + (r.ruleName.length > 40 ? '...' : ''),
      getStatusText(r.status),
      r.difference !== undefined ? formatNumber(r.difference) + ' TL' : '-'
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Kural ID', 'Kontrol', 'Durum', 'Fark']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: {
        fillColor: COLORS.primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 80 },
        2: { cellWidth: 30 },
        3: { cellWidth: 25, halign: 'right' }
      },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          const status = categoryResults[data.row.index]?.status;
          if (status === 'fail') {
            data.cell.styles.textColor = COLORS.danger;
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'pass') {
            data.cell.styles.textColor = COLORS.success;
          }
        }
      }
    });

    y = doc.lastAutoTable.finalY + 10;
  }

  // === FAILED CHECKS DETAIL ===
  const failedChecks = report.results.filter(r => r.status === 'fail');

  if (failedChecks.length > 0) {
    checkNewPage(40);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.danger);
    doc.text('Basarisiz Kontrol Detaylari', margin, y);
    doc.setTextColor(0, 0, 0);
    y += 10;

    for (const check of failedChecks) {
      checkNewPage(35);

      // Rule header
      doc.setFillColor(254, 226, 226); // Light red
      doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${check.ruleId}: ${check.ruleName}`, margin + 3, y + 6);
      y += 12;

      // Details
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      const details = [
        `Beklenen: ${formatNumber(check.expected)} ${typeof check.expected === 'number' ? 'TL' : ''}`,
        `Bulunan: ${formatNumber(check.actual)} ${typeof check.actual === 'number' ? 'TL' : ''}`,
        `Fark: ${check.difference !== undefined ? formatNumber(check.difference) + ' TL' : '-'}`,
        `Kaynak A: ${check.evidenceA.source} -> ${check.evidenceA.field}`,
        `Kaynak B: ${check.evidenceB.source} -> ${check.evidenceB.field}`
      ];

      if (check.suggestion) {
        details.push(`Oneri: ${check.suggestion}`);
      }

      if (check.legalBasis) {
        details.push(`Yasal Dayanak: ${check.legalBasis}`);
      }

      details.forEach(line => {
        doc.text(line, margin + 3, y);
        y += 5;
      });

      y += 5;
    }
  }

  // === FOOTER ===
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gray);
    doc.text(
      `LYNTOS Capraz Kontrol Raporu - Sayfa ${i}/${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      'Bu rapor otomatik olarak olusturulmustur.',
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}
