'use client';

/**
 * LYNTOS Mükellefler Sayfası - Orchestrator
 * Sprint 6: SMMM Şeffaflık - Veri durumu görünür olmalı
 *
 * - Backend API'den mükellef listesi çeker
 * - Her mükellef için veri durumu gösterir (Mizan ✓, Beyanname ✗)
 * - Dönem bazlı veri kontrolü
 *
 * Mükellef Ekleme Seçenekleri:
 * 1. Manuel tek mükellef girişi
 * 2. CSV/Excel toplu yükleme (muhasebe programından)
 * 3. Vergi Levhası PDF yükleme
 */

import React, { useState } from 'react';
import {
  Plus, Search, Users, Loader2, XCircle, FileText, Trash2,
} from 'lucide-react';
import { useDashboardScope } from '../_components/scope/ScopeProvider';
import { useLayoutContext } from '../_components/layout/useLayoutContext';
import { useToast } from '../_components/shared/Toast';
import { useClients } from './_hooks/useClients';
import {
  ClientRow,
  AddClientModal,
  DeleteClientModal,
  BulkDeleteModal,
} from './_components';
import type { Taxpayer } from './_types/client';

export default function ClientsPage() {
  const { user } = useDashboardScope();
  const { showToast } = useToast();
  const { refreshClients } = useLayoutContext();
  const smmmId = user?.id || '';

  // Hook for all client operations
  const clients = useClients(smmmId);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Taxpayer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // Delete handlers
  const handleDeleteClick = (client: Taxpayer) => {
    setClientToDelete(client);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;

    setDeleteLoading(true);
    try {
      await clients.deleteClient(clientToDelete.id);
      setShowDeleteModal(false);
      setClientToDelete(null);
      refreshClients(); // LayoutContext dropdown'ı da güncelle
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      showToast('error', errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleteLoading(true);
    try {
      const result = await clients.bulkDelete();
      setShowBulkDeleteModal(false);
      refreshClients(); // LayoutContext dropdown'ı da güncelle
      if (result.error > 0) {
        showToast('warning', `${result.success} mükellef silindi, ${result.error} hata oluştu.`);
      }
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const handleAddSuccess = () => {
    clients.refetch();
    refreshClients(); // LayoutContext dropdown'ı da güncelle
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2E2E2E]">Mükellefler</h1>
          <p className="text-[#5A5A5A] mt-1">
            Tüm mükelleflerinizi ve veri durumlarını görüntüleyin
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#00287F] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yeni Mükellef
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-[#0049AA] mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-[#00287F]">Veri Durumu Nedir?</h3>
            <p className="text-sm text-[#0049AA] mt-1">
              Her mükellef için hangi dönemde hangi verilerin yüklü olduğunu gösterir.
              <span className="text-[#00804D] font-medium"> ✓ Yeşil</span> = veri yüklü,
              <span className="text-[#969696] font-medium"> ✗ Gri</span> = veri yok.
              Analiz sonuçları sadece yüklü veriler üzerinden hesaplanır.
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#969696]" />
        <input
          type="text"
          placeholder="Mükellef ara (isim, VKN)..."
          value={clients.searchQuery}
          onChange={(e) => clients.setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0078D0]"
        />
      </div>

      {/* Content */}
      {clients.isLoading ? (
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#0078D0] animate-spin mb-4" />
          <p className="text-[#5A5A5A]">Mükellefler yükleniyor...</p>
        </div>
      ) : clients.error ? (
        <div className="bg-white rounded-xl border border-[#FFC7C9] p-12 flex flex-col items-center justify-center">
          <XCircle className="w-8 h-8 text-[#F0282D] mb-4" />
          <p className="text-[#BF192B]">{clients.error}</p>
        </div>
      ) : clients.filteredTaxpayers.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-12 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-[#F5F6F8] flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-[#969696]" />
          </div>
          <h3 className="text-lg font-semibold text-[#2E2E2E] mb-2">
            {clients.taxpayers.length === 0
              ? 'Henüz mükellef eklenmedi'
              : 'Sonuç bulunamadı'}
          </h3>
          <p className="text-[#5A5A5A] text-center max-w-md mb-6">
            {clients.taxpayers.length === 0
              ? 'Yeni mükellef eklemek için yukarıdaki "Yeni Mükellef" butonuna tıklayın.'
              : 'Arama kriterlerinize uygun mükellef bulunamadı.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
          {/* Toplu işlem çubuğu */}
          {clients.selectedIds.size > 0 && (
            <div className="bg-[#E6F9FF] border-b border-[#ABEBFF] px-6 py-3 flex items-center justify-between">
              <span className="text-sm text-[#0049AA] font-medium">
                {clients.selectedIds.size} mükellef seçildi
              </span>
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-[#BF192B] rounded-lg hover:bg-[#9E0F1F] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Seçilenleri Sil
              </button>
            </div>
          )}
          <table className="w-full">
            <thead className="bg-[#F5F6F8]">
              <tr>
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={clients.filteredTaxpayers.length > 0 && clients.selectedIds.size === clients.filteredTaxpayers.length}
                    onChange={clients.toggleSelectAll}
                    className="w-4 h-4 text-[#0049AA] border-[#B4B4B4] rounded focus:ring-[#0078D0]"
                  />
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#969696] uppercase tracking-wider">
                  Mükellef
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#969696] uppercase tracking-wider">
                  VKN
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#969696] uppercase tracking-wider">
                  Veri Durumu
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#969696] uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {clients.filteredTaxpayers.map((taxpayer) => (
                <ClientRow
                  key={taxpayer.id}
                  client={taxpayer}
                  onDelete={handleDeleteClick}
                  isSelected={clients.selectedIds.has(taxpayer.id)}
                  onToggleSelect={clients.toggleSelect}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Client Modal */}
      <AddClientModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddClient={clients.addClient}
        onBulkAdd={clients.bulkAdd}
        onPdfAdd={clients.pdfAdd}
        parseBulkFile={clients.parseBulkFile}
        parsePdfFile={clients.parsePdfFile}
        validateVKN={clients.validateVKN}
        onSuccess={handleAddSuccess}
      />

      {/* Delete Confirmation Modal */}
      <DeleteClientModal
        isOpen={showDeleteModal}
        client={clientToDelete}
        isLoading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteModal(false);
          setClientToDelete(null);
        }}
      />

      {/* Bulk Delete Confirmation Modal */}
      <BulkDeleteModal
        isOpen={showBulkDeleteModal}
        selectedCount={clients.selectedIds.size}
        isLoading={bulkDeleteLoading}
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDeleteModal(false)}
      />
    </div>
  );
}
