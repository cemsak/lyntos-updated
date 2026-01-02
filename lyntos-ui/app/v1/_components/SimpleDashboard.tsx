'use client';

import { useState, useEffect } from 'react';

// ============================================================
// TYPES
// ============================================================

interface Task {
  id: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  what: string;
  why_important: string;
  what_happens: string;
  what_to_do: string[];
  buttons: Array<{ label: string; action: string }>;
  time_estimate: string;
  deadline: string;
  email_template?: { subject: string; body: string };
  kurgan_impact?: string;
}

interface DashboardData {
  summary: {
    overall_status: 'good' | 'warning' | 'critical';
    total_time: string;
    urgent_count: number;
    medium_count: number;
    low_count: number;
    kurgan_score: number;
    kurgan_level: string;
    completeness: number;
  };
  tasks: Task[];
}

interface TaxData {
  ticari_kar: { donem_kari: number; donem_zarari: number; net_donem_kari: number };
  mali_kar: { ticari_kar: number; kkeg: number; istisna_kazanclar: number; gecmis_zarar: number; mali_kar: number };
  indirimler: { r_and_d: number; yatirim: number; bagis: number; sponsorluk: number };
  matrah: number;
  vergi_orani: number;
  hesaplanan_vergi: number;
  mahsuplar: { gecici_vergi: number; yurtdisi_vergi: number };
  odenecek_vergi: number;
  iade_edilecek_vergi: number;
  kaynak: string;
  trust_score: number;
}

interface ForecastData {
  senaryo: string;
  tahmini_ciro: number;
  tahmini_kar: number;
  tahmini_vergi: number;
  tahmini_net_kar: number;
  buyume_oranlari: { ciro: number; kar: number };
  confidence: string;
  aciklama: string;
}

type TabId = 'ozet' | 'kurumlar_vergisi' | 'ongoru';

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
};

const formatDeadline = (deadline: string) => {
  const match = deadline.match(/(\d+)/);
  if (match) {
    const days = parseInt(match[1]);
    const date = new Date();
    date.setDate(date.getDate() + days);
    const gunler = ['Pazar', 'Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi'];
    const gun = date.getDate().toString().padStart(2, '0');
    const ay = (date.getMonth() + 1).toString().padStart(2, '0');
    const yil = date.getFullYear();
    return `${gun}.${ay}.${yil} ${gunler[date.getDay()]}`;
  }
  return deadline;
};

// ============================================================
// TABS CONFIG
// ============================================================

const TABS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: 'ozet', label: 'Ozet', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'kurumlar_vergisi', label: 'Kurumlar Vergisi', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { id: 'ongoru', label: 'Ongoru', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' }
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function SimpleDashboard({
  smmmId,
  clientId,
  period
}: {
  smmmId: string;
  clientId: string;
  period: string;
}) {
  const [activeTab, setActiveTab] = useState<TabId>('ozet');
  const [data, setData] = useState<DashboardData | null>(null);
  const [taxData, setTaxData] = useState<TaxData | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [selectedScenario, setSelectedScenario] = useState('base');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const params = new URLSearchParams({
    smmm_id: smmmId,
    client_id: clientId,
    period: period
  });

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksRes, kurganRes] = await Promise.all([
          fetch(`/api/v1/actionable-tasks?${params}`, { cache: 'no-store' }),
          fetch(`/api/v1/kurgan-risk?${params}`, { cache: 'no-store' })
        ]);

        if (!tasksRes.ok || !kurganRes.ok) {
          throw new Error('API hatasi');
        }

        const tasks = await tasksRes.json();
        const kurgan = await kurganRes.json();

        const overallStatus =
          tasks.summary.high_priority > 2
            ? 'critical'
            : tasks.summary.high_priority > 0
            ? 'warning'
            : 'good';

        setData({
          summary: {
            overall_status: overallStatus,
            total_time: tasks.summary.total_time || '0 dk',
            urgent_count: tasks.summary.high_priority || 0,
            medium_count: tasks.summary.medium_priority || 0,
            low_count: tasks.summary.low_priority || 0,
            kurgan_score: kurgan.kurgan_risk?.score || 0,
            kurgan_level: kurgan.kurgan_risk?.risk_level || 'Bilinmiyor',
            completeness: tasks.summary.completeness_score || 0
          },
          tasks: tasks.tasks || []
        });
      } catch (e) {
        console.error('Dashboard hatasi:', e);
        setError(e instanceof Error ? e.message : 'Bilinmeyen hata');
      } finally {
        setLoading(false);
      }
    };

    if (smmmId && clientId && period) {
      fetchData();
    }
  }, [smmmId, clientId, period]);

  // Fetch tax data when tab changes
  useEffect(() => {
    if (activeTab === 'kurumlar_vergisi' && !taxData) {
      fetchTaxData();
    }
  }, [activeTab]);

  // Fetch forecast when scenario changes
  useEffect(() => {
    if (activeTab === 'ongoru') {
      fetchForecast();
    }
  }, [activeTab, selectedScenario]);

  const fetchTaxData = async () => {
    try {
      const res = await fetch(`/api/v1/corporate-tax?${params}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setTaxData(data);
      }
    } catch (e) {
      console.error('Tax data hatasi:', e);
    }
  };

  const fetchForecast = async () => {
    try {
      const res = await fetch(`/api/v1/corporate-tax-forecast?${params}&scenario=${selectedScenario}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setForecastData(data);
      }
    } catch (e) {
      console.error('Forecast hatasi:', e);
    }
  };

  const handleEmailSend = (task: Task) => {
    if (task.email_template) {
      const mailto = `mailto:?subject=${encodeURIComponent(
        task.email_template.subject
      )}&body=${encodeURIComponent(task.email_template.body)}`;
      window.open(mailto);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-slate-600">Yukleniyor...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">!</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Hata Olustu</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Style helpers
  const getStatusStyles = () => {
    switch (data.summary.overall_status) {
      case 'critical':
        return { bg: 'bg-red-500', text: 'text-red-600', border: 'border-red-500', icon: '!', label: 'Acil' };
      case 'warning':
        return { bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-500', icon: '!', label: 'Dikkat' };
      default:
        return { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-500', icon: 'OK', label: 'Iyi' };
    }
  };

  const getKurganStyles = () => {
    const score = data.summary.kurgan_score;
    if (score >= 80) return { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-500' };
    if (score >= 60) return { bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-500' };
    if (score >= 40) return { bg: 'bg-orange-500', text: 'text-orange-600', border: 'border-orange-500' };
    return { bg: 'bg-red-500', text: 'text-red-600', border: 'border-red-500' };
  };

  const statusStyles = getStatusStyles();
  const kurganStyles = getKurganStyles();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">LYNTOS Operasyon Konsolu</h1>
              <p className="text-sm text-slate-500 mt-0.5">{clientId} | {period} | SMMM: {smmmId}</p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                PDF Indir
              </button>
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Yenile
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 -mb-4 border-b border-slate-200">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium rounded-t-lg flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 border-t border-x border-slate-200 -mb-px'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ============================================================ */}
        {/* OZET TAB */}
        {/* ============================================================ */}
        {activeTab === 'ozet' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <div className={`bg-white rounded-xl shadow-lg p-5 border-t-4 ${statusStyles.border}`}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Genel Durum</p>
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 ${statusStyles.bg} rounded-xl flex items-center justify-center`}>
                    <span className="text-2xl font-bold text-white">{statusStyles.icon}</span>
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${statusStyles.text}`}>{statusStyles.label}</p>
                    <p className="text-xs text-slate-500">Sistem ozeti</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-5 border-t-4 border-blue-500">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Bugun Sure</p>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{data.summary.total_time}</p>
                    <p className="text-xs text-slate-500">Toplam islem suresi</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-5 border-t-4 border-red-500">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Acil Gorev</p>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-red-500 rounded-xl flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">{data.summary.urgent_count}</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{data.summary.urgent_count > 0 ? 'Bekliyor' : 'Yok'}</p>
                    <p className="text-xs text-slate-500">{data.summary.urgent_count > 0 ? 'Hemen yapilmali' : 'Acil gorev yok'}</p>
                  </div>
                </div>
              </div>

              <div className={`bg-white rounded-xl shadow-lg p-5 border-t-4 ${kurganStyles.border}`}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">KURGAN Skor</p>
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 ${kurganStyles.bg} rounded-xl flex items-center justify-center`}>
                    <span className="text-xl font-bold text-white">{data.summary.kurgan_score}</span>
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${kurganStyles.text}`}>{data.summary.kurgan_level}</p>
                    <p className="text-xs text-slate-500">VDK risk skoru</p>
                  </div>
                </div>
                <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${kurganStyles.bg} transition-all duration-500`} style={{ width: `${data.summary.kurgan_score}%` }} />
                </div>
              </div>
            </div>

            {/* Task List */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
              <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Bugun Yapilacaklar</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{data.tasks.length} gorev bekliyor</p>
                  </div>
                  {data.tasks.length > 1 && (
                    <button className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm shadow-sm">
                      Hepsini Toplu Yap
                    </button>
                  )}
                </div>
              </div>

              {data.tasks.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Harika!</h3>
                  <p className="text-slate-600">Bugun yapilacak gorev yok. Her sey yolunda.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.tasks.map((task, index) => {
                    const isExpanded = expandedTask === task.id;
                    const priorityStyles =
                      task.priority === 'HIGH'
                        ? { bg: 'bg-red-50', border: 'border-l-red-500', badge: 'bg-red-600', text: 'text-red-700' }
                        : task.priority === 'MEDIUM'
                        ? { bg: 'bg-amber-50', border: 'border-l-amber-500', badge: 'bg-amber-600', text: 'text-amber-700' }
                        : { bg: 'bg-blue-50', border: 'border-l-blue-500', badge: 'bg-blue-600', text: 'text-blue-700' };

                    return (
                      <div key={task.id} className={`${priorityStyles.bg} border-l-4 ${priorityStyles.border}`}>
                        <div className="p-5">
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 ${priorityStyles.badge} rounded-lg flex items-center justify-center shrink-0`}>
                              <span className="text-lg font-bold text-white">{index + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${priorityStyles.badge}`}>
                                  {task.priority === 'HIGH' ? 'ACIL' : task.priority === 'MEDIUM' ? 'ORTA' : 'DUSUK'}
                                </span>
                                {task.deadline && <span className="text-xs text-slate-500">Son: {formatDeadline(task.deadline)}</span>}
                              </div>
                              <h3 className="text-lg font-bold text-slate-900">{task.title}</h3>
                              <p className="text-sm text-slate-600 mt-1">{task.what}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-200">
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm font-semibold text-slate-700">{task.time_estimate}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-4 ml-14">
                            {task.buttons.map((btn, i) => (
                              <button
                                key={i}
                                onClick={() => btn.action === 'send_email' && handleEmailSend(task)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  i === 0 ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {btn.label}
                              </button>
                            ))}
                            <button
                              onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                              className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 flex items-center gap-1"
                            >
                              {isExpanded ? 'Kapat' : 'Detay'}
                              <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-5 pb-5 ml-14 space-y-3">
                            <div className="bg-white rounded-lg p-4 border-l-4 border-orange-400">
                              <p className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-1">Neden Onemli?</p>
                              <p className="text-sm text-slate-700">{task.why_important}</p>
                            </div>
                            {task.what_happens && (
                              <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-400">
                                <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">Yapmazsaniz Ne Olur?</p>
                                <p className="text-sm text-red-700">{task.what_happens}</p>
                              </div>
                            )}
                            <div className="bg-emerald-50 rounded-lg p-4 border-l-4 border-emerald-400">
                              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">Ne Yapmalisiniz?</p>
                              <ol className="space-y-1.5">
                                {task.what_to_do.map((step, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-emerald-800">
                                    <span className="w-5 h-5 bg-emerald-200 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                      <span className="text-xs font-bold text-emerald-700">{i + 1}</span>
                                    </span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                            {task.email_template && (
                              <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-400">
                                <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">Email Onizleme</p>
                                <div className="bg-white rounded border border-blue-200 p-3">
                                  <p className="text-xs text-slate-600 mb-2">
                                    <span className="text-slate-400">Konu:</span> <span className="font-medium">{task.email_template.subject}</span>
                                  </p>
                                  <p className="text-xs text-slate-600 whitespace-pre-line max-h-32 overflow-y-auto">{task.email_template.body}</p>
                                </div>
                              </div>
                            )}
                            {task.kurgan_impact && (
                              <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-400 flex items-center gap-3">
                                <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-bold text-purple-700">K</span>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">KURGAN Etkisi</p>
                                  <p className="text-sm text-purple-800 font-medium">{task.kurgan_impact}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ============================================================ */}
        {/* KURUMLAR VERGISI TAB */}
        {/* ============================================================ */}
        {activeTab === 'kurumlar_vergisi' && (
          <div className="space-y-6">
            {!taxData ? (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Kurumlar Vergisi verisi yukleniyor...</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
                    <h2 className="text-xl font-bold text-white">Kurumlar Vergisi Beyani</h2>
                    <p className="text-blue-200 text-sm mt-1">
                      {taxData.kaynak} | Guvenilirlik: {(taxData.trust_score * 100).toFixed(0)}%
                    </p>
                  </div>

                  {/* Ticari -> Mali Kar */}
                  <div className="p-6">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center text-blue-600 text-xs font-bold">1</span>
                      Ticari Kar → Mali Kar Donusumu
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-3 px-4 bg-slate-50 rounded-lg">
                        <span className="text-slate-700">Ticari Kar (Gelir Tablosu)</span>
                        <span className="font-bold text-slate-900">{formatCurrency(taxData.ticari_kar.net_donem_kari)} TL</span>
                      </div>
                      <div className="flex justify-between items-center py-3 px-4 bg-orange-50 rounded-lg">
                        <div>
                          <span className="text-orange-700">+ KKEG (KVK Md. 11)</span>
                          <p className="text-xs text-orange-600">Para cezalari, ortulu sermaye, karsilik asimlari</p>
                        </div>
                        <span className="font-bold text-orange-600">+{formatCurrency(taxData.mali_kar.kkeg)} TL</span>
                      </div>
                      <div className="flex justify-between items-center py-3 px-4 bg-green-50 rounded-lg">
                        <span className="text-green-700">- Istisna Kazanclar</span>
                        <span className="font-bold text-green-600">-{formatCurrency(taxData.mali_kar.istisna_kazanclar)} TL</span>
                      </div>
                      <div className="flex justify-between items-center py-3 px-4 bg-green-50 rounded-lg">
                        <span className="text-green-700">- Gecmis Donem Zarari</span>
                        <span className="font-bold text-green-600">-{formatCurrency(taxData.mali_kar.gecmis_zarar)} TL</span>
                      </div>
                      <div className="flex justify-between items-center py-4 px-4 bg-blue-100 rounded-lg mt-2">
                        <span className="font-bold text-blue-900 text-lg">= MALI KAR</span>
                        <span className="text-2xl font-bold text-blue-900">{formatCurrency(taxData.mali_kar.mali_kar)} TL</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Indirimler */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 bg-green-100 rounded flex items-center justify-center text-green-600 text-xs font-bold">2</span>
                    Indirimler
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex justify-between items-center py-3 px-4 bg-green-50 rounded-lg">
                      <div>
                        <span className="text-green-700 font-medium">R&D Indirimi</span>
                        <p className="text-xs text-green-600">GVK Gecici 61 | %100 indirim</p>
                      </div>
                      <span className="font-bold text-green-600">{formatCurrency(taxData.indirimler.r_and_d)} TL</span>
                    </div>
                    <div className="flex justify-between items-center py-3 px-4 bg-slate-50 rounded-lg">
                      <span className="text-slate-600">Yatirim Indirimi</span>
                      <span className="font-bold text-slate-400">{formatCurrency(taxData.indirimler.yatirim)} TL</span>
                    </div>
                    <div className="flex justify-between items-center py-3 px-4 bg-slate-50 rounded-lg">
                      <span className="text-slate-600">Bagis Indirimi</span>
                      <span className="font-bold text-slate-400">{formatCurrency(taxData.indirimler.bagis)} TL</span>
                    </div>
                    <div className="flex justify-between items-center py-3 px-4 bg-slate-50 rounded-lg">
                      <span className="text-slate-600">Sponsorluk</span>
                      <span className="font-bold text-slate-400">{formatCurrency(taxData.indirimler.sponsorluk)} TL</span>
                    </div>
                  </div>
                </div>

                {/* Matrah ve Vergi */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 bg-red-100 rounded flex items-center justify-center text-red-600 text-xs font-bold">3</span>
                    Matrah ve Vergi Hesabi
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-3 px-4 bg-slate-50 rounded-lg">
                      <span className="text-slate-700">Kurumlar Vergisi Matrahi</span>
                      <span className="font-bold text-slate-900">{formatCurrency(taxData.matrah)} TL</span>
                    </div>
                    <div className="flex justify-between items-center py-3 px-4 bg-slate-50 rounded-lg">
                      <span className="text-slate-700">x Vergi Orani</span>
                      <span className="font-bold text-slate-900">%{(taxData.vergi_orani * 100).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 px-4 bg-red-50 rounded-lg">
                      <span className="text-red-700">= Hesaplanan Vergi</span>
                      <span className="font-bold text-red-600">{formatCurrency(taxData.hesaplanan_vergi)} TL</span>
                    </div>
                    <div className="flex justify-between items-center py-3 px-4 bg-green-50 rounded-lg">
                      <span className="text-green-700">- Gecici Vergi Mahsubu</span>
                      <span className="font-bold text-green-600">-{formatCurrency(taxData.mahsuplar.gecici_vergi)} TL</span>
                    </div>
                    <div className="flex justify-between items-center py-5 px-4 bg-red-100 rounded-lg mt-2">
                      <span className="font-bold text-red-900 text-lg">= ODENECEK VERGI</span>
                      <span className="text-3xl font-bold text-red-900">{formatCurrency(taxData.odenecek_vergi)} TL</span>
                    </div>
                    {taxData.iade_edilecek_vergi > 0 && (
                      <div className="flex justify-between items-center py-4 px-4 bg-green-100 rounded-lg">
                        <span className="font-bold text-green-900">IADE EDILECEK</span>
                        <span className="text-2xl font-bold text-green-900">{formatCurrency(taxData.iade_edilecek_vergi)} TL</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    PDF Beyanname
                  </button>
                  <button className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Excel Indir
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* ONGORU TAB */}
        {/* ============================================================ */}
        {activeTab === 'ongoru' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700">
                <h2 className="text-xl font-bold text-white">Vergi Ongorusu</h2>
                <p className="text-purple-200 text-sm mt-1">Gelecek donem projeksiyon modeli</p>
              </div>

              {/* Scenario Selection */}
              <div className="p-6">
                <h3 className="font-bold text-slate-900 mb-4">Senaryo Secimi</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'optimistic', label: 'Iyimser', desc: 'Buyume x1.2', color: 'emerald' },
                    { id: 'base', label: 'Baz', desc: 'Mevcut trend', color: 'blue' },
                    { id: 'pessimistic', label: 'Kotumser', desc: 'Buyume x0.8', color: 'orange' }
                  ].map((scenario) => (
                    <button
                      key={scenario.id}
                      onClick={() => setSelectedScenario(scenario.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        selectedScenario === scenario.id
                          ? scenario.color === 'emerald'
                            ? 'border-emerald-500 bg-emerald-50'
                            : scenario.color === 'blue'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-orange-500 bg-orange-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className={`font-bold ${
                        selectedScenario === scenario.id
                          ? scenario.color === 'emerald'
                            ? 'text-emerald-700'
                            : scenario.color === 'blue'
                            ? 'text-blue-700'
                            : 'text-orange-700'
                          : 'text-slate-700'
                      }`}>
                        {scenario.label}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{scenario.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Forecast Results */}
            {forecastData && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-bold text-slate-900 mb-4">Projeksiyon Sonuclari</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Tahmini Ciro</p>
                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(forecastData.tahmini_ciro)} TL</p>
                    <p className="text-xs text-slate-500 mt-1">Buyume: %{forecastData.buyume_oranlari.ciro.toFixed(1)}</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <p className="text-xs text-blue-600 uppercase tracking-wide mb-1">Tahmini Kar</p>
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(forecastData.tahmini_kar)} TL</p>
                    <p className="text-xs text-blue-500 mt-1">Buyume: %{forecastData.buyume_oranlari.kar.toFixed(1)}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-xl">
                    <p className="text-xs text-red-600 uppercase tracking-wide mb-1">Tahmini Vergi</p>
                    <p className="text-2xl font-bold text-red-700">{formatCurrency(forecastData.tahmini_vergi)} TL</p>
                    <p className="text-xs text-red-500 mt-1">%25 kurumlar vergisi</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-xl">
                    <p className="text-xs text-emerald-600 uppercase tracking-wide mb-1">Tahmini Net Kar</p>
                    <p className="text-2xl font-bold text-emerald-700">{formatCurrency(forecastData.tahmini_net_kar)} TL</p>
                    <p className="text-xs text-emerald-500 mt-1">Vergi sonrasi</p>
                  </div>
                </div>

                {/* Confidence */}
                <div className="mt-6 p-4 bg-slate-100 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Guven Seviyesi</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      forecastData.confidence === 'high'
                        ? 'bg-emerald-100 text-emerald-700'
                        : forecastData.confidence === 'medium'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {forecastData.confidence === 'high' ? 'YUKSEK' : forecastData.confidence === 'medium' ? 'ORTA' : 'DUSUK'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{forecastData.aciklama}</p>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-amber-700 font-bold">!</span>
                </div>
                <div>
                  <p className="font-medium text-amber-800">Ongoru Hakkinda</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Bu tahminler gecmis donem verilerine dayanmaktadir. Gercek sonuclar piyasa kosullari,
                    ekonomik gelismeler ve sektor dinamiklerine gore farklilik gosterebilir.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
