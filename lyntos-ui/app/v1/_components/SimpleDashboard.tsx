'use client';

import { useState, useEffect } from 'react';

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

export default function SimpleDashboard({
  smmmId,
  clientId,
  period
}: {
  smmmId: string;
  clientId: string;
  period: string;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams({
          smmm_id: smmmId,
          client_id: clientId,
          period: period
        });

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

  const handleEmailSend = (task: Task) => {
    if (task.email_template) {
      const mailto = `mailto:?subject=${encodeURIComponent(
        task.email_template.subject
      )}&body=${encodeURIComponent(task.email_template.body)}`;
      window.open(mailto);
    }
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
      {/* Ust Bar */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                LYNTOS Operasyon Konsolu
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {clientId} | {period} | SMMM: {smmmId}
              </p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                PDF Indir
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Yenile
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Ozet Kartlar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Genel Durum */}
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

          {/* Bugun Sure */}
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

          {/* Acil Gorev */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-t-4 border-red-500">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Acil Gorev</p>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-red-500 rounded-xl flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{data.summary.urgent_count}</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {data.summary.urgent_count > 0 ? 'Bekliyor' : 'Yok'}
                </p>
                <p className="text-xs text-slate-500">
                  {data.summary.urgent_count > 0 ? 'Hemen yapilmali' : 'Acil gorev yok'}
                </p>
              </div>
            </div>
          </div>

          {/* KURGAN Skor */}
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
            {/* Progress bar */}
            <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${kurganStyles.bg} transition-all duration-500`}
                style={{ width: `${data.summary.kurgan_score}%` }}
              />
            </div>
          </div>
        </div>

        {/* Gorev Listesi */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Bugun Yapilacaklar</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {data.tasks.length} gorev bekliyor
                </p>
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
                  <div
                    key={task.id}
                    className={`${priorityStyles.bg} border-l-4 ${priorityStyles.border}`}
                  >
                    {/* Gorev Basligi */}
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Numara */}
                        <div className={`w-10 h-10 ${priorityStyles.badge} rounded-lg flex items-center justify-center shrink-0`}>
                          <span className="text-lg font-bold text-white">{index + 1}</span>
                        </div>

                        {/* Icerik */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${priorityStyles.badge}`}>
                              {task.priority === 'HIGH' ? 'ACIL' : task.priority === 'MEDIUM' ? 'ORTA' : 'DUSUK'}
                            </span>
                            {task.deadline && (
                              <span className="text-xs text-slate-500">
                                Son: {formatDeadline(task.deadline)}
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-bold text-slate-900">{task.title}</h3>
                          <p className="text-sm text-slate-600 mt-1">{task.what}</p>
                        </div>

                        {/* Sure */}
                        <div className="shrink-0 text-right">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-200">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-semibold text-slate-700">{task.time_estimate}</span>
                          </div>
                        </div>
                      </div>

                      {/* Butonlar */}
                      <div className="flex items-center gap-2 mt-4 ml-14">
                        {task.buttons.map((btn, i) => (
                          <button
                            key={i}
                            onClick={() => btn.action === 'send_email' && handleEmailSend(task)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              i === 0
                                ? 'bg-slate-800 text-white hover:bg-slate-700'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
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
                          <svg
                            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Genisletilmis Detay */}
                    {isExpanded && (
                      <div className="px-5 pb-5 ml-14 space-y-3">
                        {/* Neden Onemli */}
                        <div className="bg-white rounded-lg p-4 border-l-4 border-orange-400">
                          <p className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-1">
                            Neden Onemli?
                          </p>
                          <p className="text-sm text-slate-700">{task.why_important}</p>
                        </div>

                        {/* Yapmazsaniz */}
                        {task.what_happens && (
                          <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-400">
                            <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">
                              Yapmazsaniz Ne Olur?
                            </p>
                            <p className="text-sm text-red-700">{task.what_happens}</p>
                          </div>
                        )}

                        {/* Ne Yapmali */}
                        <div className="bg-emerald-50 rounded-lg p-4 border-l-4 border-emerald-400">
                          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">
                            Ne Yapmalisiniz?
                          </p>
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

                        {/* Email Onizleme */}
                        {task.email_template && (
                          <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-400">
                            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">
                              Email Onizleme
                            </p>
                            <div className="bg-white rounded border border-blue-200 p-3">
                              <p className="text-xs text-slate-600 mb-2">
                                <span className="text-slate-400">Konu:</span>{' '}
                                <span className="font-medium">{task.email_template.subject}</span>
                              </p>
                              <p className="text-xs text-slate-600 whitespace-pre-line max-h-32 overflow-y-auto">
                                {task.email_template.body}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* KURGAN Etkisi */}
                        {task.kurgan_impact && (
                          <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-400 flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-purple-700">K</span>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">
                                KURGAN Etkisi
                              </p>
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

        {/* Detaylar Accordion */}
        <details className="bg-white rounded-xl shadow-lg overflow-hidden">
          <summary className="px-6 py-4 cursor-pointer hover:bg-slate-50 font-semibold text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Detayli Mali Bilgiler
            </span>
            <span className="text-xs text-slate-500">Tikla ac/kapat</span>
          </summary>
          <div className="px-6 py-6 bg-slate-50 border-t border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Veri Tamligi</p>
                <p className="text-2xl font-bold text-slate-800">{data.summary.completeness}%</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Orta Oncelik</p>
                <p className="text-2xl font-bold text-amber-600">{data.summary.medium_count}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Dusuk Oncelik</p>
                <p className="text-2xl font-bold text-blue-600">{data.summary.low_count}</p>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-4">
              KURGAN 13 kriter detayi, mizan analizi ve diger teknik bilgiler burada gosterilecek.
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}
