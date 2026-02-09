import React from 'react';
import {
  FileText,
  CheckCircle,
  Download,
  Eye,
  Activity,
} from 'lucide-react';
import type { AuditEntry } from './types';
import { formatDate } from './helpers';

interface AuditTrailPanelProps {
  auditTrail: AuditEntry[];
}

export function AuditTrailPanel({ auditTrail }: AuditTrailPanelProps) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
        <h2 className="font-semibold text-[#2E2E2E] flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#0049AA]" />
          Audit Trail (İz Kaydı)
        </h2>
        <span className="text-xs text-[#969696]">
          Tüm işlemler kayıt altına alınmaktadır
        </span>
      </div>
      <div className="divide-y divide-[#E5E5E5] max-h-64 overflow-y-auto">
        {auditTrail.length > 0 ? auditTrail.map((entry) => (
          <div key={entry.id} className="px-6 py-3 flex items-center gap-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              entry.action === 'create' ? 'bg-[#E6F9FF]' :
              entry.action === 'verify' ? 'bg-[#ECFDF5]' :
              entry.action === 'download' ? 'bg-[#E6F9FF]' :
              'bg-[#F5F6F8]'
            }`}>
              {entry.action === 'create' && <FileText className="w-4 h-4 text-[#0049AA]" />}
              {entry.action === 'verify' && <CheckCircle className="w-4 h-4 text-[#00804D]" />}
              {entry.action === 'download' && <Download className="w-4 h-4 text-[#0049AA]" />}
              {entry.action === 'view' && <Eye className="w-4 h-4 text-[#5A5A5A]" />}
            </div>
            <div className="flex-1">
              <p className="text-sm text-[#2E2E2E]">{entry.details}</p>
              <p className="text-xs text-[#969696] mt-0.5">
                {entry.user} • {formatDate(entry.timestamp)}
              </p>
            </div>
            {entry.ipAddress && (
              <span className="text-xs text-[#969696] font-mono">{entry.ipAddress}</span>
            )}
          </div>
        )) : (
          <div className="px-6 py-8 text-center text-[#969696] text-sm">
            Henüz audit kaydı bulunmuyor
          </div>
        )}
      </div>
    </div>
  );
}
