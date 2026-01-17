'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Plus, Search, Users, Loader2, X } from 'lucide-react';

// Client type
interface Client {
  id: string;
  name: string;
  vkn: string;
  type: 'limited' | 'anonim' | 'sahis';
  status: 'active' | 'pending' | 'inactive';
  riskScore: number | null;
  createdAt: string;
}

export default function ClientsPage() {
  // State
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newClient, setNewClient] = useState<{
    name: string;
    vkn: string;
    type: 'limited' | 'anonim' | 'sahis';
  }>({
    name: '',
    vkn: '',
    type: 'limited'
  });

  // Sayfa yuklendiginde localStorage'dan oku
  useEffect(() => {
    const stored = localStorage.getItem('lyntos_clients');
    if (stored) {
      try {
        setClients(JSON.parse(stored));
      } catch (e) {
        console.error('Client parse error:', e);
      }
    }
    setIsLoading(false);
  }, []);

  const handleAddClient = () => {
    // Validasyon
    if (!newClient.name.trim()) {
      alert('Firma adi zorunludur');
      return;
    }

    if (!newClient.vkn.trim()) {
      alert('VKN/TCKN zorunludur');
      return;
    }

    if (newClient.vkn.length !== 10 && newClient.vkn.length !== 11) {
      alert('VKN 10, TCKN 11 haneli olmalidir');
      return;
    }

    // Duplicate kontrolu
    if (clients.some(c => c.vkn === newClient.vkn)) {
      alert('Bu VKN ile kayitli mukellef zaten var');
      return;
    }

    const client: Client = {
      id: `client-${Date.now()}`,
      name: newClient.name.trim(),
      vkn: newClient.vkn.trim(),
      type: newClient.type,
      status: 'active',
      riskScore: null,
      createdAt: new Date().toISOString()
    };

    const updatedClients = [...clients, client];
    setClients(updatedClients);

    // localStorage'a kaydet
    localStorage.setItem('lyntos_clients', JSON.stringify(updatedClients));

    // Formu sifirla ve modali kapat
    setNewClient({ name: '', vkn: '', type: 'limited' });
    setShowAddModal(false);
  };

  const handleDeleteClient = (id: string) => {
    if (!confirm('Bu mukellefi silmek istediginize emin misiniz?')) return;

    const updatedClients = clients.filter(c => c.id !== id);
    setClients(updatedClients);
    localStorage.setItem('lyntos_clients', JSON.stringify(updatedClients));
  };

  // Arama filtresi
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.vkn.includes(searchQuery)
  );

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'limited': return 'Ltd. Sti.';
      case 'anonim': return 'A.S.';
      case 'sahis': return 'Sahis';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mukellefler</h1>
          <p className="text-slate-600 mt-1">
            Tum mukelleflerinizi yonetin
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yeni Mukellef
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Mukellef ara (isim, VKN)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-slate-600">Mukellefler yukleniyor...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {clients.length === 0 ? 'Henuz mukellef eklenmedi' : 'Sonuc bulunamadi'}
          </h3>
          <p className="text-slate-600 text-center max-w-md mb-6">
            {clients.length === 0
              ? 'Yeni mukellef eklemek icin yukaridaki "Yeni Mukellef" butonuna tiklayin.'
              : 'Arama kriterlerinize uygun mukellef bulunamadi. Farkli bir arama yapmayi deneyin.'
            }
          </p>
          {clients.length === 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ilk Mukellefi Ekle
            </button>
          )}
        </div>
      ) : (
        /* Client List */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Mukellef
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  VKN
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Tur
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Risk Skoru
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{client.name}</p>
                        <p className="text-sm text-slate-500">{client.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-mono">
                    {client.vkn}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                      {getTypeLabel(client.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      client.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : client.status === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {client.status === 'active' ? 'Aktif' : client.status === 'pending' ? 'Beklemede' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {client.riskScore !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              client.riskScore >= 90 ? 'bg-green-500' :
                              client.riskScore >= 70 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${client.riskScore}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                          {client.riskScore}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">Hesaplanmadi</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/v2?client_id=${client.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Detay
                      </a>
                      <button
                        onClick={() => handleDeleteClient(client.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors ml-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold text-slate-900">Yeni Mukellef Ekle</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Firma Adi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newClient.name}
                  onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Orn: ABC Ticaret Ltd. Sti."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  VKN / TCKN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newClient.vkn}
                  onChange={(e) => setNewClient(prev => ({
                    ...prev,
                    vkn: e.target.value.replace(/\D/g, '').slice(0, 11)
                  }))}
                  placeholder="10 veya 11 haneli"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Tuzel kisiler icin 10 haneli VKN, gercek kisiler icin 11 haneli TCKN
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Sirket Turu
                </label>
                <select
                  value={newClient.type}
                  onChange={(e) => setNewClient(prev => ({ ...prev, type: e.target.value as 'limited' | 'anonim' | 'sahis' }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="limited">Limited Sirket (Ltd. Sti.)</option>
                  <option value="anonim">Anonim Sirket (A.S.)</option>
                  <option value="sahis">Sahis Firmasi</option>
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-4 border-t bg-slate-50 rounded-b-xl">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Iptal
              </button>
              <button
                onClick={handleAddClient}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
