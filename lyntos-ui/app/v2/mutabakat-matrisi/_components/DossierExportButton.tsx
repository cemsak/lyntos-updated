'use client';

import React, { useState, useCallback } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import type { EnrichedCrossCheck, CrossCheckSummaryRaw } from '../_types/crossCheck';
import { SEVERITY_CONFIG, STATUS_CONFIG, ROOT_CAUSE_CONFIG, SMMM_KARAR_CONFIG } from '../_types/crossCheck';

interface DossierExportButtonProps {
  summary: CrossCheckSummaryRaw;
  enrichedChecks: EnrichedCrossCheck[];
  clientId: string;
  periodCode: string;
}

/**
 * Generates a printable HTML dossier and opens it in a new tab for PDF export.
 * No backend dependency - fully client-side.
 */
export function DossierExportButton({ summary, enrichedChecks, clientId, periodCode }: DossierExportButtonProps) {
  const [generating, setGenerating] = useState(false);

  const generateDossier = useCallback(() => {
    setGenerating(true);

    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

      const criticalChecks = enrichedChecks.filter(c => c.severity === 'critical' || c.severity === 'high');
      const failedChecks = enrichedChecks.filter(c => c.status === 'fail');
      const kararBekleyen = enrichedChecks.filter(c => c.smmmKarar.karar === 'BILINMIYOR');

      const formatTL = (v: number) => v.toLocaleString('tr-TR', { minimumFractionDigits: 2 });

      const checkRows = enrichedChecks.map(c => {
        const sevCfg = SEVERITY_CONFIG[c.severity];
        const stsCfg = STATUS_CONFIG[c.status];
        const rcCfg = ROOT_CAUSE_CONFIG[c.rootCause.neden];
        const kararCfg = SMMM_KARAR_CONFIG[c.smmmKarar.karar];
        const evidenceCount = c.evidence ? Object.keys(c.evidence).length : 0;

        return `<tr>
          <td>${c.check_name_tr}</td>
          <td class="center"><span class="badge badge-${stsCfg.badgeVariant}">${stsCfg.label}</span></td>
          <td class="center"><span class="badge badge-${sevCfg.badgeVariant}">${sevCfg.label}</span></td>
          <td class="right mono">${formatTL(c.source_value)}</td>
          <td class="right mono">${formatTL(c.target_value)}</td>
          <td class="right mono">${formatTL(c.difference)}</td>
          <td class="center">${rcCfg.label}</td>
          <td class="center">${evidenceCount}</td>
          <td class="center">K:${c.confidence.kapsam}% E:${c.confidence.eslestirme}%</td>
          <td class="center"><span class="badge badge-${kararCfg.badgeVariant}">${kararCfg.label}</span></td>
        </tr>`;
      }).join('\n');

      const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Mutabakat Matrisi Dosya Raporu - ${clientId} - ${periodCode}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #2E2E2E; padding: 40px; font-size: 11px; }
    .header { border-bottom: 3px solid #0078D0; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { font-size: 20px; color: #0049AA; }
    .header .meta { color: #969696; font-size: 11px; margin-top: 4px; }
    .section { margin-bottom: 24px; }
    .section h2 { font-size: 14px; color: #0049AA; border-bottom: 1px solid #E5E5E5; padding-bottom: 4px; margin-bottom: 12px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .kpi-card { border: 1px solid #E5E5E5; border-radius: 8px; padding: 12px; text-align: center; }
    .kpi-card .value { font-size: 24px; font-weight: 700; }
    .kpi-card .label { font-size: 10px; color: #969696; text-transform: uppercase; }
    .kpi-card.critical .value { color: #BF192B; }
    .kpi-card.success .value { color: #00804D; }
    .kpi-card.warning .value { color: #E67324; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #F5F6F8; color: #969696; text-transform: uppercase; font-size: 9px; padding: 6px 8px; text-align: left; border-bottom: 2px solid #E5E5E5; }
    td { padding: 6px 8px; border-bottom: 1px solid #E5E5E5; }
    .center { text-align: center; }
    .right { text-align: right; }
    .mono { font-family: 'Consolas', monospace; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 600; }
    .badge-success { background: #E6FFF0; color: #00804D; }
    .badge-error { background: #FFF0F0; color: #BF192B; }
    .badge-warning { background: #FFFBEB; color: #E67324; }
    .badge-info { background: #E6F9FF; color: #0049AA; }
    .badge-default { background: #F5F6F8; color: #5A5A5A; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 2px solid #E5E5E5; color: #969696; font-size: 9px; text-align: center; }
    .alert { background: #FFFBEB; border: 1px solid #FFE045; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
    .alert-title { font-weight: 600; color: #E67324; }
    @media print {
      body { padding: 20px; }
      @page { margin: 15mm; size: A4 landscape; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>MUTABAKAT MATRiSi DOSYA RAPORU</h1>
    <div class="meta">
      Mukellef: ${clientId} | Donem: ${periodCode} | Olusturma: ${dateStr} ${timeStr} | LYNTOS v2
    </div>
  </div>

  <div class="section">
    <h2>Ozet</h2>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="value">${summary.total_checks}</div>
        <div class="label">Toplam Kontrol</div>
      </div>
      <div class="kpi-card success">
        <div class="value">${summary.passed}</div>
        <div class="label">Basarili</div>
      </div>
      <div class="kpi-card critical">
        <div class="value">${summary.failed}</div>
        <div class="label">Basarisiz</div>
      </div>
      <div class="kpi-card warning">
        <div class="value">${summary.critical_issues + summary.high_issues}</div>
        <div class="label">Kritik/Yuksek</div>
      </div>
    </div>
  </div>

  ${kararBekleyen.length > 0 ? `
  <div class="alert">
    <div class="alert-title">Dikkat: ${kararBekleyen.length} kontrol icin SMMM karari bekleniyor</div>
  </div>` : ''}

  <div class="section">
    <h2>Detay Tablosu</h2>
    <table>
      <thead>
        <tr>
          <th>Kontrol</th>
          <th class="center">Durum</th>
          <th class="center">Ciddiyet</th>
          <th class="right">Kaynak</th>
          <th class="right">Hedef</th>
          <th class="right">Fark</th>
          <th class="center">Neden</th>
          <th class="center">Kanit</th>
          <th class="center">Guven</th>
          <th class="center">Karar</th>
        </tr>
      </thead>
      <tbody>
        ${checkRows}
      </tbody>
    </table>
  </div>

  ${criticalChecks.length > 0 ? `
  <div class="section">
    <h2>Kritik ve Yuksek Oncelikli Bulgular</h2>
    ${criticalChecks.map(c => `
    <div style="margin-bottom:8px; padding:8px; border:1px solid #E5E5E5; border-radius:6px;">
      <strong>${c.check_name_tr}</strong> - Fark: ${formatTL(c.difference)} TL (%${c.difference_percent.toFixed(1)})
      <br/>Neden: ${ROOT_CAUSE_CONFIG[c.rootCause.neden].label} | Oneri: ${c.recommendation || 'Yok'}
    </div>`).join('\n')}
  </div>` : ''}

  <div class="footer">
    Bu rapor LYNTOS Mali Analiz Platformu tarafindan otomatik olusturulmustur.<br/>
    Rapor ${dateStr} tarihinde ${timeStr} saatinde uretilmistir. Yazdirma icin Ctrl+P tuslayiniz.
  </div>
</body>
</html>`;

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');

      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } finally {
      setGenerating(false);
    }
  }, [summary, enrichedChecks, clientId, periodCode]);

  return (
    <button
      onClick={generateDossier}
      disabled={generating || enrichedChecks.length === 0}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#0049AA] text-white rounded-lg hover:bg-[#003D8F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {generating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileText className="w-4 h-4" />
      )}
      Dosya Raporu Olustur
    </button>
  );
}
