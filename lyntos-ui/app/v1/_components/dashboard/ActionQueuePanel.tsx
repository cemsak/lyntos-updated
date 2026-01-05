'use client';

import type { ActionableTasksData } from './types';
import { getHumanError, getSeverityStyles } from './utils/errorMessages';

// ════════════════════════════════════════════════════════════════════════════
// ACTION QUEUE PANEL - Aksiyonlar Kuyruğu
// ════════════════════════════════════════════════════════════════════════════

interface ActionQueuePanelProps {
  data: ActionableTasksData | null | undefined;
  error?: string;
}

function PriorityBadge({ priority }: { priority: string }) {
  switch (priority) {
    case 'HIGH':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
          YUKSEK
        </span>
      );
    case 'MEDIUM':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
          ORTA
        </span>
      );
    case 'LOW':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
          DUSUK
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
          —
        </span>
      );
  }
}

export function ActionQueuePanel({ data, error }: ActionQueuePanelProps) {
  if (error) {
    const humanError = getHumanError(error);
    const styles = getSeverityStyles(humanError.severity);
    return (
      <div className={`${styles.bg} border ${styles.border} rounded-lg p-4`}>
        <h3 className={`text-sm font-semibold ${styles.text} mb-2`}>Aksiyon Kuyrugu</h3>
        <p className={`text-sm ${styles.text} opacity-80`}>{humanError.message}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    );
  }

  const tasks = data.tasks || [];
  const summary = data.summary;

  if (tasks.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-green-800">Bekleyen aksiyon yok</span>
        </div>
      </div>
    );
  }

  const highPriority = tasks.filter(t => t.priority === 'HIGH');

  return (
    <div className={`border rounded-lg overflow-hidden ${highPriority.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between border-b ${highPriority.length > 0 ? 'bg-red-100 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${highPriority.length > 0 ? 'bg-red-600' : 'bg-orange-600'}`}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h3 className={`text-sm font-semibold ${highPriority.length > 0 ? 'text-red-900' : 'text-gray-900'}`}>
              {tasks.length} Aksiyon Bekliyor
            </h3>
            <p className={`text-xs ${highPriority.length > 0 ? 'text-red-600' : 'text-gray-500'}`}>
              {summary?.total_time || '—'} toplam sure
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {summary?.high > 0 && (
            <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">{summary.high} acil</span>
          )}
          {summary?.medium > 0 && (
            <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">{summary.medium} orta</span>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="divide-y divide-gray-100">
        {tasks.slice(0, 5).map((task, i) => (
          <div key={task.id || i} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition">
            <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{task.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">{task.time_estimate}</span>
                {task.deadline && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="text-xs text-gray-500">Son: {task.deadline}</span>
                  </>
                )}
              </div>
            </div>
            <PriorityBadge priority={task.priority} />
          </div>
        ))}
      </div>

      {/* Show More */}
      {tasks.length > 5 && (
        <div className="px-4 py-2 text-center border-t border-gray-200 bg-gray-50">
          <span className="text-xs text-gray-500">
            ve {tasks.length - 5} aksiyon daha...
          </span>
        </div>
      )}

      {/* Message */}
      {data.message && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
          <p className="text-xs text-blue-700">{data.message}</p>
        </div>
      )}
    </div>
  );
}

export default ActionQueuePanel;
