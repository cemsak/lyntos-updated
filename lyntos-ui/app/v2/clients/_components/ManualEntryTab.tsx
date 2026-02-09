import React from 'react';
import type { NewClientForm } from '../_types/client';

interface ManualEntryTabProps {
  newClient: NewClientForm;
  setNewClient: React.Dispatch<React.SetStateAction<NewClientForm>>;
}

export function ManualEntryTab({ newClient, setNewClient }: ManualEntryTabProps) {
  return (
    <div className="space-y-4">
      <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-3">
        <p className="text-sm text-[#0049AA]">
          Tek bir mükellef bilgilerini manuel olarak girin.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#5A5A5A] mb-1">
          Firma Adı <span className="text-[#F0282D]">*</span>
        </label>
        <input
          type="text"
          value={newClient.name}
          onChange={(e) =>
            setNewClient((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="Örn: ABC Ticaret Ltd. Şti."
          className="w-full px-3 py-2 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0078D0]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#5A5A5A] mb-1">
          VKN / TCKN <span className="text-[#F0282D]">*</span>
        </label>
        <input
          type="text"
          value={newClient.vkn}
          onChange={(e) =>
            setNewClient((prev) => ({
              ...prev,
              vkn: e.target.value.replace(/\D/g, '').slice(0, 11),
            }))
          }
          placeholder="10 veya 11 haneli"
          className="w-full px-3 py-2 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0078D0]"
        />
        <p className="text-xs text-[#969696] mt-1">
          Tüzel kişiler için 10 haneli VKN, gerçek kişiler için 11 haneli TCKN
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#5A5A5A] mb-1">
          Şirket Türü
        </label>
        <select
          value={newClient.type}
          onChange={(e) =>
            setNewClient((prev) => ({
              ...prev,
              type: e.target.value as 'limited' | 'anonim' | 'sahis',
            }))
          }
          className="w-full px-3 py-2 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0078D0]"
        >
          <option value="limited">Limited Şirket (Ltd. Şti.)</option>
          <option value="anonim">Anonim Şirket (A.Ş.)</option>
          <option value="sahis">Şahıs Firması</option>
        </select>
      </div>
    </div>
  );
}
