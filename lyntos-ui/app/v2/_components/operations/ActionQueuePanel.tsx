'use client';
import React from 'react';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { PanelState } from '../shared/PanelState';
import { useFailSoftFetch } from '../hooks/useFailSoftFetch';
import { ENDPOINTS } from '../contracts/endpoints';
import { normalizeToEnvelope } from '../contracts/map';
import type { PanelEnvelope } from '../contracts/envelope';

interface ActionTask {
  id: string;
  title: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  estimated_time?: string;
  deadline?: string;
  status: 'pending' | 'in_progress' | 'done';
}

interface ActionQueueResult {
  tasks: ActionTask[];
  total: number;
  high_priority: number;
  total_time?: string;
}

function normalizeActionQueue(raw: unknown): PanelEnvelope<ActionQueueResult> {
  return normalizeToEnvelope<ActionQueueResult>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;

    const tasksRaw = data?.tasks || data?.actions || data?.items || [];
    const tasks: ActionTask[] = Array.isArray(tasksRaw)
      ? tasksRaw.map((task: Record<string, unknown>, idx: number) => ({
          id: String(task.id || `task-${idx}`),
          title: String(task.title || task.description || task.name || 'Gorev'),
          priority: (task.priority || 'MEDIUM') as ActionTask['priority'],
          estimated_time: task.estimated_time ? String(task.estimated_time) : undefined,
          deadline: task.deadline ? String(task.deadline) : undefined,
          status: (task.status || 'pending') as ActionTask['status'],
        }))
      : [];

    const summary = data?.summary as Record<string, unknown> | undefined;
    const highPriority = typeof summary?.high_priority === 'number'
      ? summary.high_priority
      : tasks.filter(t => t.priority === 'HIGH').length;

    return {
      tasks: tasks.filter(t => t.status !== 'done'),
      total: tasks.length,
      high_priority: highPriority,
      total_time: summary?.total_time ? String(summary.total_time) : undefined,
    };
  });
}

export function ActionQueuePanel() {
  const envelope = useFailSoftFetch<ActionQueueResult>(ENDPOINTS.ACTIONABLE_TASKS, normalizeActionQueue);
  const { status, reason_tr, data } = envelope;

  const getPriorityBadge = (priority: ActionTask['priority']) => {
    const config = {
      HIGH: { variant: 'error' as const, label: 'ACIL' },
      MEDIUM: { variant: 'warning' as const, label: 'ORTA' },
      LOW: { variant: 'default' as const, label: 'DUSUK' },
    };
    return <Badge variant={config[priority].variant}>{config[priority].label}</Badge>;
  };

  return (
    <Card
      title="Aksiyon Kuyrugu"
      subtitle={data?.total_time ? `Toplam: ${data.total_time}` : 'Bugun yapilacaklar'}
      headerAction={
        data && data.high_priority > 0 && (
          <Badge variant="error">{data.high_priority} acil</Badge>
        )
      }
    >
      <PanelState status={status} reason_tr={reason_tr}>
        {data && data.tasks.length === 0 ? (
          <div className="text-center py-6">
            <span className="text-3xl">🎉</span>
            <p className="text-sm text-[#00804D] mt-2">Bekleyen gorev yok!</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data?.tasks.map((task, idx) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 bg-[#F5F6F8] rounded-lg border border-[#E5E5E5]"
              >
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#E5E5E5] rounded-full text-xs font-medium text-[#5A5A5A]">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#2E2E2E] truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.estimated_time && (
                      <span className="text-xs text-[#969696]">{task.estimated_time}</span>
                    )}
                    {task.deadline && (
                      <span className="text-xs text-[#969696]">{task.deadline}</span>
                    )}
                  </div>
                </div>
                {getPriorityBadge(task.priority)}
              </div>
            ))}
          </div>
        )}
      </PanelState>
    </Card>
  );
}
