'use client';
import React from 'react';
import { useDashboardScope } from './ScopeProvider';

export function ScopeSelector() {
  const { scope, setScope } = useDashboardScope();
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500">SMMM:</label>
        <input
          type="text"
          value={scope.smmm_id}
          onChange={e => setScope({ smmm_id: e.target.value })}
          className="px-2 py-1 text-sm border border-slate-300 rounded w-32"
          placeholder="SMMM ID"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500">Mukellef:</label>
        <input
          type="text"
          value={scope.client_id}
          onChange={e => setScope({ client_id: e.target.value })}
          className="px-2 py-1 text-sm border border-slate-300 rounded w-40"
          placeholder="Client ID"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500">Donem:</label>
        <input
          type="text"
          value={scope.period}
          onChange={e => setScope({ period: e.target.value })}
          className="px-2 py-1 text-sm border border-slate-300 rounded w-24"
          placeholder="2025-Q2"
        />
      </div>
    </div>
  );
}
