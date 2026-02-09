'use client';

import React, { useState } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Database,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import type { Taxpayer } from '../_types/client';
import { DataStatusBadge } from './DataStatusBadge';
import { PeriodDataRow } from './PeriodDataRow';

interface ClientRowProps {
  client: Taxpayer;
  onDelete: (client: Taxpayer) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

export function ClientRow({
  client,
  onDelete,
  isSelected,
  onToggleSelect,
}: ClientRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="hover:bg-[#F5F6F8] border-b border-[#E5E5E5]">
        <td className="px-3 py-4 w-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(client.id)}
            className="w-4 h-4 text-[#0049AA] border-[#B4B4B4] rounded focus:ring-[#0078D0]"
          />
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E6F9FF] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#0049AA]" />
            </div>
            <div>
              <p className="font-medium text-[#2E2E2E]">{client.name}</p>
              <p className="text-xs text-[#969696]">{client.id}</p>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 text-[#5A5A5A] font-mono text-sm">
          {client.vkn}
        </td>
        <td className="px-6 py-4">
          <DataStatusBadge status={client.data_status} />
        </td>
        <td className="px-6 py-4">
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              client.active
                ? 'bg-[#ECFDF5] text-[#00804D]'
                : 'bg-[#F5F6F8] text-[#5A5A5A]'
            }`}
          >
            {client.active ? 'Aktif' : 'Pasif'}
          </span>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[#969696] hover:text-[#5A5A5A] transition-colors p-1"
              title="Dönem detayları"
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            <a
              href={`/v2?client_id=${client.id}`}
              className="text-[#0049AA] hover:text-[#00287F] text-sm font-medium"
            >
              Dashboard
            </a>
            <button
              onClick={() => onDelete(client)}
              className="text-[#969696] hover:text-[#F0282D] transition-colors ml-2"
              title="Mükellefi Sil"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="px-6 py-3 bg-[#F5F6F8]/50">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#969696] mb-2">
                <Database className="w-3.5 h-3.5" />
                <span className="font-medium">Dönem Bazlı Veri Durumu</span>
              </div>
              {client.data_status.periods.length === 0 ? (
                <div className="text-sm text-[#FA841E] py-2">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  Henüz dönem tanımlanmamış. Veri Yükleme sayfasından dönem ekleyin.
                </div>
              ) : (
                <div className="space-y-1">
                  {client.data_status.periods.map((period) => (
                    <PeriodDataRow key={period.id || period.period_id} period={period} />
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
