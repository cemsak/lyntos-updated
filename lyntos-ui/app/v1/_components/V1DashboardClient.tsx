'use client';

import { useState, useEffect, useMemo } from 'react';
import ExplainModal from './ExplainModal';

// ════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════

interface QuarterData {
  current_profit: number;
  annual_estimate: number;
  calculated_tax: number;
  payable: number;
  previous_payments?: number;
}

interface YearEndProjection {
  estimated_annual_profit: number;
  estimated_corporate_tax: number;
  quarterly_offset: number;
  estimated_payable_or_refund: number;
  confidence: string;
}

interface QuarterlyTax {
  Q1: QuarterData;
  Q2: QuarterData;
  year_end_projection: YearEndProjection;
}

interface CrossCheckItem {
  type: string;
  status: 'ok' | 'warning' | 'error';
  difference: number;
  reason: string;
  actions: string[];
  legal_basis: string;
}

interface CrossCheck {
  checks: CrossCheckItem[];
  summary: {
    total_checks: number;
    errors: number;
    warnings: number;
    ok: number;
    overall_status: string;
  };
}

interface CorporateTax {
  ticari_kar: { net_donem_kari: number };
  mali_kar: { mali_kar: number; kanunen_kabul_edilmeyen_giderler: number };
  kurumlar_vergisi_matrahi: number;
  hesaplanan_vergi: number;
  odenecek_vergi: number;
  r_and_d_indirimi: number;
  gecici_vergi_mahsubu: number;
}

interface Task {
  id: string;
  title: string;
  time_estimate: string;
  deadline: string;
}

interface RegWatchData {
  last_7_days: {
    changes: number;
    status: string;
    message?: string;
    sources: string[];
    last_check: string;
  };
  last_30_days: {
    changes: number;
    status: string;
  };
  sources: Array<{ id: string; name: string; url: string; frequency: string }>;
}

interface ExplainData {
  title: string;
  score?: number;
  reason: string;
  legal_basis: string;
  evidence_refs: string[];
  trust_score: number;
}

interface Props {
  contract?: any;
  ctx: { smmm: string; client: string; period: string };
}

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

function fmt(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '-';
  return new Intl.NumberFormat('tr-TR').format(Math.round(n));
}

// ════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════

export default function V1DashboardClient({ contract, ctx }: Props) {
  // State
  const [corporateTax, setCorporateTax] = useState<CorporateTax | null>(null);
  const [quarterlyTax, setQuarterlyTax] = useState<QuarterlyTax | null>(null);
  const [crossCheck, setCrossCheck] = useState<CrossCheck | null>(null);
  const [regwatch, setRegwatch] = useState<RegWatchData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<ExplainData | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Derived values from contract
  const c = useMemo(() => contract || {}, [contract]);
  const kpis = useMemo(() => c.kpis || {}, [c]);

  const kurganScore = useMemo(() => {
    return typeof kpis.kurgan_risk_score === 'number' ? kpis.kurgan_risk_score : 0;
  }, [kpis]);

  const vergiUyum = useMemo(() => {
    return typeof kpis.vergi_uyum_puani === 'number' ? kpis.vergi_uyum_puani : 0;
  }, [kpis]);

  const dqScore = useMemo(() => {
    return typeof kpis.dq_in_period_pct === 'number' ? kpis.dq_in_period_pct : 0;
  }, [kpis]);

  const compliance = useMemo(() => {
    return typeof kpis.inflation_compliance_score === 'number' ? kpis.inflation_compliance_score : 0;
  }, [kpis]);

  // Fetch additional data
  useEffect(() => {
    let alive = true;
    const fetchData = async () => {
      try {
        const params = `smmm_id=${ctx.smmm}&client_id=${ctx.client}&period=${ctx.period}`;

        const [taxRes, quarterlyRes, crossRes, tasksRes, regwatchRes] = await Promise.all([
          fetch(`/api/v1/contracts/corporate-tax?${params}`),
          fetch(`/api/v1/contracts/quarterly-tax?${params}`),
          fetch(`/api/v1/contracts/cross-check?${params}`),
          fetch(`/api/v1/contracts/actionable-tasks?${params}`),
          fetch(`/api/v1/contracts/regwatch-status`)
        ]);

        if (alive) {
          if (taxRes.ok) setCorporateTax(await taxRes.json());
          if (quarterlyRes.ok) setQuarterlyTax(await quarterlyRes.json());
          if (crossRes.ok) setCrossCheck(await crossRes.json());
          if (regwatchRes.ok) setRegwatch(await regwatchRes.json());
          if (tasksRes.ok) {
            const t = await tasksRes.json();
            setTasks(t.tasks || []);
          }
        }
      } catch (e: any) {
        if (alive) setError(e?.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchData();
    return () => { alive = false; };
  }, [ctx.smmm, ctx.client, ctx.period]);

  // PDF download handler
  const handlePdfDownload = async () => {
    setPdfLoading(true);
    try {
      const params = `smmm_id=${ctx.smmm}&client_id=${ctx.client}&period=${ctx.period}`;
      const res = await fetch(`/api/v1/contracts/export-pdf?${params}`);
      if (!res.ok) throw new Error('PDF indirilemedi');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LYNTOS_${ctx.client}_${ctx.period}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('PDF indirme hatasi: ' + (e?.message || e));
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">LYNTOS Operasyon Konsolu</h1>
          <p className="text-sm text-gray-600">
            {ctx.period} | {ctx.client} | {ctx.smmm}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePdfDownload}
            disabled={pdfLoading}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
          >
            {pdfLoading ? 'Yukleniyor...' : 'PDF Indir'}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-800"
          >
            Yenile
          </button>
        </div>
      </div>

      {/* KPI BAR */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition">
          <p className="text-xs text-gray-500 mb-1">KURGAN RISK</p>
          <p className="text-3xl font-mono font-bold text-gray-900">{kurganScore}</p>
          <p className="text-xs text-gray-500 mt-1">VDK 13 kriter</p>
          <button
            onClick={() => setShowModal({
              title: 'KURGAN Risk',
              score: kurganScore,
              reason: 'VDK 13 kriter bazli risk degerlendirmesi. Kriterlerin agirlikli ortalamasi alinir.',
              legal_basis: 'VDK Genelgesi E-55935724-010.06-7361',
              evidence_refs: ['mizan.csv', 'kdv_beyan.pdf', 'banka_ekstresi.pdf'],
              trust_score: 1.0
            })}
            className="text-xs text-blue-600 hover:underline mt-2"
          >
            Neden?
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition">
          <p className="text-xs text-gray-500 mb-1">VERGI UYUM</p>
          <p className="text-3xl font-mono font-bold text-gray-900">{vergiUyum}</p>
          <p className="text-xs text-gray-500 mt-1">Risk + kalite</p>
          <button
            onClick={() => setShowModal({
              title: 'Vergi Uyum',
              score: vergiUyum,
              reason: 'KURGAN risk skoru ve veri kalitesi bazli uyum puani. 100 - (risk * 0.75) - (100-dq) * 0.25',
              legal_basis: '5520 KVK + VUK 227',
              evidence_refs: ['portfolio_kpis.json'],
              trust_score: 1.0
            })}
            className="text-xs text-blue-600 hover:underline mt-2"
          >
            Neden?
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition">
          <p className="text-xs text-gray-500 mb-1">VERI KALITESI</p>
          <p className="text-3xl font-mono font-bold text-gray-900">{dqScore}%</p>
          <p className="text-xs text-gray-500 mt-1">Tamlik skoru</p>
          <button
            onClick={() => setShowModal({
              title: 'Veri Kalitesi',
              score: dqScore,
              reason: 'Donem icindeki banka satiri sayisi / toplam banka satiri sayisi. Eksik veri orani gosterir.',
              legal_basis: 'VUK Madde 219',
              evidence_refs: ['banka_ekstresi.csv', 'data_quality_report.json'],
              trust_score: 1.0
            })}
            className="text-xs text-blue-600 hover:underline mt-2"
          >
            Neden?
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition">
          <p className="text-xs text-gray-500 mb-1">UYUMLULUK</p>
          <p className="text-3xl font-mono font-bold text-gray-900">{compliance}</p>
          <p className="text-xs text-gray-500 mt-1">TMS 29</p>
          <button
            onClick={() => setShowModal({
              title: 'Uyumluluk',
              score: compliance,
              reason: 'TMS 29 Yuksek Enflasyonlu Ekonomilerde Finansal Raporlama standardi uyum skoru.',
              legal_basis: 'TMS 29 + VUK Gecici 33',
              evidence_refs: ['enflasyon_hesap.json', 'tms29_kontrol.pdf'],
              trust_score: 1.0
            })}
            className="text-xs text-blue-600 hover:underline mt-2"
          >
            Neden?
          </button>
        </div>
      </div>

      {/* AKSIYON PANELI */}
      {tasks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="font-bold text-red-900 mb-3">
            {tasks.length} Acil Gorev Bekliyor
          </p>
          <div className="space-y-2">
            {tasks.slice(0, 3).map(task => (
              <div key={task.id} className="border-l-4 border-red-600 pl-3 py-2 bg-white rounded">
                <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                <p className="text-xs text-gray-600">{task.time_estimate} - {task.deadline}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DONEM OZETI */}
      {quarterlyTax && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Q2 2025 Donem Ozeti</h2>
            <span className="text-xs text-gray-500">Gecici Vergi Donemi</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-1">Cari Kar (Q2)</p>
              <p className="text-xl font-mono font-bold text-gray-900">
                {fmt(quarterlyTax.Q2.current_profit)} TL
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Yillik Tahmin</p>
              <p className="text-xl font-mono font-bold text-gray-900">
                {fmt(quarterlyTax.Q2.annual_estimate)} TL
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Hesaplanan Vergi</p>
              <p className="text-xl font-mono font-bold text-red-600">
                {fmt(quarterlyTax.Q2.calculated_tax)} TL
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Mahsup (Q1)</p>
              <p className="text-xl font-mono font-bold text-green-600">
                -{fmt(quarterlyTax.Q2.previous_payments)} TL
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">Q2 ODENECEK</span>
              <span className="text-2xl font-mono font-bold text-red-700">
                {fmt(quarterlyTax.Q2.payable)} TL
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ACCORDION DETAYLAR */}
      <div className="space-y-3">
        {/* Gecici Vergi Tablosu */}
        {quarterlyTax && (
          <details className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 font-semibold text-gray-900 flex items-center justify-between">
              <span>Gecici Vergi Tablosu (2025)</span>
              <span className="text-xs text-gray-500">5520 KVK Md. 32</span>
            </summary>
            <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2 font-semibold text-gray-700">Donem</th>
                    <th className="text-right py-2 font-semibold text-gray-700">Cari Kar</th>
                    <th className="text-right py-2 font-semibold text-gray-700">Yil Tahmin</th>
                    <th className="text-right py-2 font-semibold text-gray-700">Gec. Vergi</th>
                    <th className="text-right py-2 font-semibold text-gray-700">Mahsup</th>
                    <th className="text-right py-2 font-semibold text-gray-700">Odenecek</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  <tr className="border-b border-gray-200">
                    <td className="py-2">Q1</td>
                    <td className="text-right">{fmt(quarterlyTax.Q1.current_profit)}</td>
                    <td className="text-right">{fmt(quarterlyTax.Q1.annual_estimate)}</td>
                    <td className="text-right text-red-600">{fmt(quarterlyTax.Q1.calculated_tax)}</td>
                    <td className="text-right">0</td>
                    <td className="text-right font-bold">{fmt(quarterlyTax.Q1.payable)}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2">Q2</td>
                    <td className="text-right">{fmt(quarterlyTax.Q2.current_profit)}</td>
                    <td className="text-right">{fmt(quarterlyTax.Q2.annual_estimate)}</td>
                    <td className="text-right text-red-600">{fmt(quarterlyTax.Q2.calculated_tax)}</td>
                    <td className="text-right text-green-600">-{fmt(quarterlyTax.Q2.previous_payments)}</td>
                    <td className="text-right font-bold">{fmt(quarterlyTax.Q2.payable)}</td>
                  </tr>
                  <tr className="border-b border-gray-200 bg-gray-100">
                    <td className="py-2">Q3</td>
                    <td className="text-right text-gray-400">-</td>
                    <td className="text-right text-gray-400">-</td>
                    <td className="text-right text-gray-400">-</td>
                    <td className="text-right text-gray-400">-</td>
                    <td className="text-right text-gray-400">-</td>
                  </tr>
                  <tr className="bg-gray-100">
                    <td className="py-2">Q4</td>
                    <td className="text-right text-gray-400" colSpan={5}>
                      Kurumlar vergisinde mahsup edilir
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        )}

        {/* KV Projeksiyonu */}
        {quarterlyTax && (
          <details className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 font-semibold text-gray-900">
              Yil Sonu Kurumlar Vergisi Projeksiyonu
            </summary>
            <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
              <table className="w-full text-sm font-mono">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-700">Tahmini Yillik Kar</td>
                    <td className="text-right text-gray-900">
                      {fmt(quarterlyTax.year_end_projection.estimated_annual_profit)} TL
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-700">Tahmini KV</td>
                    <td className="text-right text-red-600">
                      {fmt(quarterlyTax.year_end_projection.estimated_corporate_tax)} TL
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-700">Gecici Vergi Mahsubu</td>
                    <td className="text-right text-green-600">
                      -{fmt(quarterlyTax.year_end_projection.quarterly_offset)} TL
                    </td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td className="py-3 font-bold text-blue-900">
                      {quarterlyTax.year_end_projection.estimated_payable_or_refund >= 0 ? 'ODENECEK' : 'IADE'}
                    </td>
                    <td className="text-right font-bold text-blue-900 text-lg">
                      {fmt(Math.abs(quarterlyTax.year_end_projection.estimated_payable_or_refund))} TL
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-gray-600 mt-3">
                Guven: {quarterlyTax.year_end_projection.confidence}
              </p>
            </div>
          </details>
        )}

        {/* Kurumlar Vergisi */}
        {corporateTax && (
          <details className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 font-semibold text-gray-900 flex items-center justify-between">
              <span>Kurumlar Vergisi Beyani</span>
              <span className="text-xs text-gray-500">5520 Sayili KVK</span>
            </summary>
            <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
              <table className="w-full text-sm font-mono">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-700">Ticari Kar</td>
                    <td className="text-right text-gray-900">{fmt(corporateTax.ticari_kar?.net_donem_kari)}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-700">+ KKEG</td>
                    <td className="text-right text-orange-600">+{fmt(corporateTax.mali_kar?.kanunen_kabul_edilmeyen_giderler)}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 font-bold text-gray-900">= Mali Kar</td>
                    <td className="text-right font-bold text-gray-900">{fmt(corporateTax.mali_kar?.mali_kar)}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-700">- R&D Indirimi</td>
                    <td className="text-right text-green-600">-{fmt(corporateTax.r_and_d_indirimi)}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 font-bold text-gray-900">= Matrah</td>
                    <td className="text-right font-bold text-gray-900">{fmt(corporateTax.kurumlar_vergisi_matrahi)}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-700">x %25</td>
                    <td className="text-right"></td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-700">= Hesaplanan</td>
                    <td className="text-right text-red-600">{fmt(corporateTax.hesaplanan_vergi)}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 text-gray-700">- Gecici Vergi</td>
                    <td className="text-right text-green-600">-{fmt(corporateTax.gecici_vergi_mahsubu)}</td>
                  </tr>
                  <tr className="bg-red-50">
                    <td className="py-3 font-bold text-red-900">ODENECEK</td>
                    <td className="text-right font-bold text-red-900 text-lg">{fmt(corporateTax.odenecek_vergi)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        )}

        {/* Capraz Kontrol */}
        {crossCheck && (
          <details className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 font-semibold text-gray-900 flex items-center justify-between">
              <span>Capraz Kontrol Matrisi</span>
              <span className={`text-xs px-2 py-1 rounded ${
                crossCheck.summary.errors > 0 ? 'bg-red-100 text-red-800' :
                crossCheck.summary.warnings > 0 ? 'bg-orange-100 text-orange-800' :
                'bg-green-100 text-green-800'
              }`}>
                {crossCheck.summary.errors} hata - {crossCheck.summary.warnings} uyari
              </span>
            </summary>
            <div className="px-4 py-4 bg-gray-50 border-t border-gray-200 space-y-3">
              {crossCheck.checks.map((check, i) => (
                <div
                  key={i}
                  className={`border-l-4 pl-3 py-2 rounded ${
                    check.status === 'error' ? 'border-red-500 bg-red-50' :
                    check.status === 'warning' ? 'border-orange-500 bg-orange-50' :
                    'border-green-500 bg-green-50'
                  }`}
                >
                  <p className="font-semibold text-sm text-gray-900">{check.reason}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Fark: {fmt(Math.abs(check.difference))} TL
                  </p>
                  {check.actions.length > 0 && (
                    <ul className="mt-2 text-xs space-y-1">
                      {check.actions.map((action, j) => (
                        <li key={j} className="text-gray-700">- {action}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}

        {/* RegWatch Panel */}
        <details className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 font-semibold text-gray-900 flex items-center justify-between">
            <span>RegWatch - Mevzuat Izleme</span>
            <span className="text-xs text-gray-500">7/24 Otomatik Takip</span>
          </summary>
          <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
            {regwatch ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Son 7 Gun</p>
                    <p className="text-3xl font-mono font-bold text-gray-900">
                      {regwatch.last_7_days.changes}
                    </p>
                    <p className="text-xs text-gray-500">degisiklik</p>
                    {regwatch.last_7_days.status === 'BOOTSTRAPPED' && (
                      <p className="text-xs text-orange-600 mt-2">
                        {regwatch.last_7_days.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Son 30 Gun</p>
                    <p className="text-3xl font-mono font-bold text-gray-900">
                      {regwatch.last_30_days.changes}
                    </p>
                    <p className="text-xs text-gray-500">degisiklik</p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Izlenen Kaynaklar</p>
                  <ul className="space-y-1">
                    {regwatch.sources.map((src, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        {src.name} ({src.url}) - {src.frequency}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="text-xs text-gray-500">
                  Son kontrol: {new Date(regwatch.last_7_days.last_check).toLocaleString('tr-TR')}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">Yukleniyor...</p>
            )}
          </div>
        </details>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="text-center text-gray-500 text-sm py-4">
          Veriler yukleniyor...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
          Hata: {error}
        </div>
      )}

      {/* Explain Modal */}
      {showModal && (
        <ExplainModal
          {...showModal}
          onClose={() => setShowModal(null)}
        />
      )}
    </div>
  );
}
