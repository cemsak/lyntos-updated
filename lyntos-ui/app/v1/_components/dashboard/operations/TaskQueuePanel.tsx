'use client';

// ════════════════════════════════════════════════════════════════════════════
// TaskQueuePanel - Actionable tasks queue
// ════════════════════════════════════════════════════════════════════════════

import { Card } from '../shared/Card';
import { Badge, BadgeVariant } from '../shared/Badge';
import { StateWrapper } from '../shared/StateWrapper';

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string;
  category?: string;
  technicalId?: string;
}

interface TaskQueuePanelProps {
  tasks: Task[];
  loading?: boolean;
  error?: string | null;
  onTaskClick?: (taskId: string) => void;
  onRetry?: () => void;
  advancedMode?: boolean;
}

const priorityConfig: Record<TaskPriority, { variant: BadgeVariant; label: string }> = {
  critical: { variant: 'error', label: 'Kritik' },
  high: { variant: 'warning', label: 'Yuksek' },
  medium: { variant: 'info', label: 'Orta' },
  low: { variant: 'neutral', label: 'Dusuk' },
};

export function TaskQueuePanel({
  tasks,
  loading = false,
  error = null,
  onTaskClick,
  onRetry,
  advancedMode = false
}: TaskQueuePanelProps) {
  const criticalCount = tasks.filter(t => t.priority === 'critical').length;

  return (
    <Card
      title="Yapilacaklar"
      headerColor={criticalCount > 0 ? 'red' : tasks.length > 0 ? 'amber' : 'green'}
      headerRight={
        <Badge variant={criticalCount > 0 ? 'error' : tasks.length > 0 ? 'warning' : 'success'}>
          {tasks.length === 0 ? 'Tamam' : `${tasks.length} gorev`}
        </Badge>
      }
    >
      <StateWrapper
        loading={loading}
        error={error}
        empty={tasks.length === 0}
        emptyMessage="Bekleyen gorev yok"
        onRetry={onRetry}
      >
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {tasks.map((task) => {
            const config = priorityConfig[task.priority];
            return (
              <button
                key={task.id}
                onClick={() => onTaskClick?.(task.id)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant={config.variant}>{config.label}</Badge>
                      {task.category && (
                        <span className="text-xs text-gray-400">{task.category}</span>
                      )}
                    </div>
                  </div>
                  {task.dueDate && (
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {task.dueDate}
                    </span>
                  )}
                </div>
                {advancedMode && task.technicalId && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <span className="text-[10px] font-mono text-gray-400">{task.technicalId}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </StateWrapper>
    </Card>
  );
}

export default TaskQueuePanel;
