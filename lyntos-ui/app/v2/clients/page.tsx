'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Plus, Search, Users, Loader2 } from 'lucide-react';

// Client type - gerçek API'den gelecek
interface Client {
  id: string;
  name: string;
  vkn: string;
  status: 'active' | 'pending' | 'inactive';
  riskScore: number | null;
}

export default function ClientsPage() {
  // State - API'den gelecek veriler için
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // TODO: API'den mükellef listesi çek
    // GET /api/v2/clients
    const fetchClients = async () => {
      try {
        // API entegrasyonu yapılınca aktif edilecek
        // const response = await fetch('/api/v2/clients');
        // const data = await response.json();
        // setClients(data);
        setClients([]); // Şimdilik boş başlat
      } catch (error) {
        console.error('Mükellef listesi yüklenemedi:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, []);

  // Arama filtresi
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.vkn.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mükellefler</h1>
          <p className="text-slate-600 mt-1">
            Tüm mükelleflerinizi yönetin
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          Yeni Mükellef
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Mükellef ara (isim, VKN)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-slate-600">Mükellefler yükleniyor...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {clients.length === 0 ? 'Henüz mükellef eklenmedi' : 'Sonuç bulunamadı'}
          </h3>
          <p className="text-slate-600 text-center max-w-md mb-6">
            {clients.length === 0
              ? 'Yeni mükellef eklemek için yukarıdaki "Yeni Mükellef" butonuna tıklayın.'
              : 'Arama kriterlerinize uygun mükellef bulunamadı. Farklı bir arama yapmayı deneyin.'
            }
          </p>
          {clients.length === 0 && (
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              İlk Mükellefi Ekle
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
                  Mükellef
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  VKN
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
                      <span className="text-sm text-slate-400">Hesaplanmadı</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <a
                      href={`/v2?client_id=${client.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Detay
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
