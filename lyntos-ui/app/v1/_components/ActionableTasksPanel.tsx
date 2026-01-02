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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-50 border-red-300';
      case 'MEDIUM':
        return 'bg-amber-50 border-amber-300';
      default:
        return 'bg-blue-50 border-blue-300';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-600 text-white';
      case 'MEDIUM':
        return 'bg-amber-500 text-white';
      default:
        return 'bg-blue-500 text-white';
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
      <div className="rounded-2xl border p-6 bg-white">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 text-sm">Gorevler yukleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border p-6 bg-white">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800 font-medium text-sm">Hata: {error}</p>
          <button
            onClick={fetchTasks}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
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
    <div className="rounded-2xl border p-6 bg-white space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Bugun Yapmaniz Gerekenler</div>
          <div className="text-sm text-slate-600">{data.message}</div>
        </div>
        <button
          onClick={fetchTasks}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800"
        >
          Yenile
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="text-xs text-slate-500">Toplam Gorev</div>
          <div className="text-2xl font-bold">{data.summary.total_tasks}</div>
        </div>
        <div className="bg-red-50 rounded-xl p-3">
          <div className="text-xs text-red-600">Acil</div>
          <div className="text-2xl font-bold text-red-700">{data.summary.high_priority}</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-3">
          <div className="text-xs text-amber-600">Orta Oncelik</div>
          <div className="text-2xl font-bold text-amber-700">{data.summary.medium_priority}</div>
        </div>
        <div className="bg-green-50 rounded-xl p-3">
          <div className="text-xs text-green-600">Toplam Sure</div>
          <div className="text-2xl font-bold text-green-700">{data.summary.total_time}</div>
        </div>
      </div>

      {/* Tasks List */}
      {data.tasks.length === 0 ? (
        <div className="text-center py-8 bg-green-50 rounded-xl border border-green-200">
          <div className="text-green-700 font-medium">Her sey yolunda!</div>
          <div className="text-sm text-green-600 mt-1">Bugun yapilacak gorev yok.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {data.tasks.map((task, index) => (
            <div
              key={task.id}
              className={`border-2 rounded-xl p-4 ${getPriorityColor(task.priority)}`}
            >
              {/* Task Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="text-2xl">{task.icon || (task.priority === 'HIGH' ? '!' : '?')}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold ${getPriorityBadge(
                          task.priority
                        )}`}
                      >
                        {getPriorityLabel(task.priority)}
                      </span>
                      <span className="text-xs text-slate-500">#{index + 1}</span>
                    </div>
                    <div className="font-semibold">{task.title}</div>
                    <div className="text-sm text-slate-600 mt-1 whitespace-pre-line">{task.what}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-slate-500">Sure</div>
                  <div className="font-bold">{task.time_estimate}</div>
                  {task.deadline && (
                    <div className="text-xs text-slate-500 mt-1">Son: {task.deadline}</div>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedTask === task.id && (
                <div className="mt-4 space-y-3">
                  {/* Why Important */}
                  <div className="bg-white bg-opacity-70 rounded-lg p-3">
                    <div className="text-xs font-semibold text-slate-700 mb-1">Neden Onemli?</div>
                    <div className="text-sm text-slate-800">{task.why_important}</div>
                  </div>

                  {/* What Happens */}
                  <div className="bg-red-100 bg-opacity-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-red-800 mb-1">Yapmazsaniz Ne Olur?</div>
                    <div className="text-sm text-red-700">{task.what_happens}</div>
                  </div>

                  {/* What To Do */}
                  <div className="bg-green-100 bg-opacity-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-green-800 mb-2">Ne Yapmalisiniz?</div>
                    <ol className="text-sm text-green-700 space-y-1">
                      {task.what_to_do.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  {/* Email Preview */}
                  {task.email_template && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xs font-semibold text-blue-800 mb-2">Email Onizleme</div>
                      <div className="text-xs text-blue-700">
                        <strong>Konu:</strong> {task.email_template.subject}
                      </div>
                      <div className="text-xs text-blue-600 mt-2 whitespace-pre-line max-h-40 overflow-y-auto">
                        {task.email_template.body}
                      </div>
                    </div>
                  )}

                  {/* KURGAN Impact */}
                  {task.kurgan_impact && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <div className="text-sm font-semibold text-purple-800">
                        KURGAN Etkisi: {task.kurgan_impact}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mt-4">
                {task.buttons.map((button, i) => (
                  <button
                    key={i}
                    onClick={() => handleButtonClick(task, button.action)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      button.style === 'primary' || i === 0
                        ? 'bg-slate-900 text-white hover:bg-slate-800'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {button.label}
                  </button>
                ))}
                <button
                  onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  {expandedTask === task.id ? 'Kapat' : 'Detay'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
