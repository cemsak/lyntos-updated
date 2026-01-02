'use client';

import { useState, useEffect } from 'react';

interface TaskButton {
  label: string;
  action: string;
  style?: string;
}

interface Task {
  id: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  icon?: string;
  title: string;
  what: string;
  why_important: string;
  what_happens: string;
  what_to_do: string[];
  buttons: TaskButton[];
  time_estimate: string;
  deadline: string;
  kurgan_impact?: string;
  email_template?: {
    subject: string;
    body: string;
  };
}

interface ActionableTasksData {
  summary: {
    total_tasks: number;
    high_priority: number;
    medium_priority: number;
    low_priority: number;
    total_time: string;
    completeness_score: number;
    kurgan_score: number;
  };
  tasks: Task[];
  message: string;
}

interface ActionableTasksPanelProps {
  smmmId: string;
  clientId: string;
  period: string;
}

export default function ActionableTasksPanel({
  smmmId,
  clientId,
  period
}: ActionableTasksPanelProps) {
  const [data, setData] = useState<ActionableTasksData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const fetchTasks = async () => {
    if (!smmmId || !clientId || !period) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        smmm_id: smmmId,
        client_id: clientId,
        period: period
      });

      const res = await fetch(`/api/v1/actionable-tasks?${params}`, {
        cache: 'no-store'
      });

      if (!res.ok) {
        throw new Error(`API failed: ${res.status}`);
      }

      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [smmmId, clientId, period]);

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return {
          card: 'bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-l-red-500 border-y border-r border-slate-200',
          badge: 'bg-red-500',
          text: 'text-red-700'
        };
      case 'MEDIUM':
        return {
          card: 'bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-l-amber-500 border-y border-r border-slate-200',
          badge: 'bg-amber-500',
          text: 'text-amber-700'
        };
      default:
        return {
          card: 'bg-gradient-to-r from-blue-50 to-sky-50 border-l-4 border-l-blue-500 border-y border-r border-slate-200',
          badge: 'bg-blue-500',
          text: 'text-blue-700'
        };
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'ACIL';
      case 'MEDIUM':
        return 'ORTA';
      default:
        return 'DUSUK';
    }
  };

  const handleButtonClick = (task: Task, action: string) => {
    if (action === 'send_email' && task.email_template) {
      const mailtoLink = `mailto:?subject=${encodeURIComponent(
        task.email_template.subject
      )}&body=${encodeURIComponent(task.email_template.body)}`;
      window.open(mailtoLink);
    } else if (action === 'preview' && task.email_template) {
      setExpandedTask(expandedTask === task.id ? null : task.id);
    } else if (action === 'detail') {
      setExpandedTask(expandedTask === task.id ? null : task.id);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
          <p className="mt-4 text-sm text-slate-500">Gorevler yukleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-sm font-bold">!</span>
            </div>
            <span className="text-sm text-red-700">{error}</span>
          </div>
          <button
            onClick={fetchTasks}
            className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Gorev Listesi</h2>
            <p className="text-xs text-slate-500 mt-0.5">{data.message}</p>
          </div>
          <button
            onClick={fetchTasks}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors group"
            title="Yenile"
          >
            <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Task Count Pills */}
      <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs text-slate-600">
            <span className="font-semibold">{data.summary.high_priority}</span> acil
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-xs text-slate-600">
            <span className="font-semibold">{data.summary.medium_priority}</span> orta
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-xs text-slate-600">
            <span className="font-semibold">{data.summary.low_priority}</span> dusuk
          </span>
        </div>
        <div className="ml-auto text-xs text-slate-500">
          Tahmini sure: <span className="font-semibold text-slate-700">{data.summary.total_time}</span>
        </div>
      </div>

      {/* Tasks List */}
      {data.tasks.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-700">Her sey yolunda</p>
          <p className="text-xs text-slate-500 mt-1">Bugun yapilacak gorev yok</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {data.tasks.map((task, index) => {
            const styles = getPriorityStyles(task.priority);
            const isExpanded = expandedTask === task.id;

            return (
              <div key={task.id} className={`${styles.card} transition-all duration-200`}>
                {/* Task Header */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Priority Number */}
                    <div className={`w-7 h-7 ${styles.badge} rounded-lg flex items-center justify-center shrink-0`}>
                      <span className="text-xs font-bold text-white">{index + 1}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold ${styles.text} uppercase tracking-wide`}>
                          {getPriorityLabel(task.priority)}
                        </span>
                        {task.deadline && (
                          <span className="text-[10px] text-slate-400">
                            Son: {task.deadline}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-slate-800 leading-tight">{task.title}</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{task.what}</p>
                    </div>

                    {/* Time Badge */}
                    <div className="shrink-0 text-right">
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-md border border-slate-200">
                        <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-medium text-slate-700">{task.time_estimate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-3 ml-10">
                    {task.buttons.map((button, i) => (
                      <button
                        key={i}
                        onClick={() => handleButtonClick(task, button.action)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          i === 0
                            ? 'bg-slate-800 text-white hover:bg-slate-700'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {button.label}
                      </button>
                    ))}
                    <button
                      onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1"
                    >
                      {isExpanded ? 'Kapat' : 'Detay'}
                      <svg
                        className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 ml-10 space-y-3">
                    {/* Why Important */}
                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        Neden Onemli?
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{task.why_important}</p>
                    </div>

                    {/* What Happens */}
                    <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                      <div className="text-[10px] font-semibold text-red-600 uppercase tracking-wide mb-1">
                        Yapmazsaniz Ne Olur?
                      </div>
                      <p className="text-xs text-red-700 leading-relaxed">{task.what_happens}</p>
                    </div>

                    {/* What To Do */}
                    <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                      <div className="text-[10px] font-semibold text-green-600 uppercase tracking-wide mb-2">
                        Ne Yapmalisiniz?
                      </div>
                      <ol className="text-xs text-green-700 space-y-1">
                        {task.what_to_do.map((step, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="w-4 h-4 bg-green-200 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-[10px] font-bold text-green-700">{i + 1}</span>
                            </span>
                            <span className="leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Email Preview */}
                    {task.email_template && (
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                        <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-2">
                          Email Onizleme
                        </div>
                        <div className="bg-white rounded border border-blue-200 p-3">
                          <div className="text-xs text-slate-600 mb-2">
                            <span className="text-slate-400">Konu:</span>{' '}
                            <span className="font-medium">{task.email_template.subject}</span>
                          </div>
                          <div className="text-xs text-slate-600 whitespace-pre-line max-h-32 overflow-y-auto leading-relaxed">
                            {task.email_template.body}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* KURGAN Impact */}
                    {task.kurgan_impact && (
                      <div className="bg-purple-50 rounded-lg p-3 border border-purple-100 flex items-center gap-2">
                        <div className="w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-purple-700">K</span>
                        </div>
                        <div>
                          <div className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide">
                            KURGAN Etkisi
                          </div>
                          <div className="text-xs text-purple-700 font-medium">{task.kurgan_impact}</div>
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
  );
}
