'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '../../_lib/auth';
import { API_BASE_URL } from '../../_lib/config/api';
import type {
  Taxpayer,
  ParsedTaxpayer,
  VergiLevhasiData,
  NewClientForm,
  BulkError,
} from '../_types/client';

interface UseClientsReturn {
  // Data
  taxpayers: Taxpayer[];
  isLoading: boolean;
  error: string | null;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredTaxpayers: Taxpayer[];

  // Selection
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  clearSelection: () => void;

  // CRUD operations
  addClient: (client: NewClientForm) => Promise<boolean>;
  deleteClient: (id: string) => Promise<boolean>;
  bulkDelete: () => Promise<{ success: number; error: number }>;

  // Bulk import
  parseBulkFile: (file: File) => Promise<ParsedTaxpayer[]>;
  bulkAdd: (items: ParsedTaxpayer[]) => Promise<{ success: number; errors: BulkError[] }>;

  // PDF import
  parsePdfFile: (file: File) => Promise<VergiLevhasiData>;
  pdfAdd: (items: VergiLevhasiData[]) => Promise<{ success: number; error: number }>;

  // VKN validation
  validateVKN: (vkn: string) => { valid: boolean; error?: string };

  // Refetch
  refetch: () => Promise<void>;
}

export function useClients(smmmId: string): UseClientsReturn {
  const [taxpayers, setTaxpayers] = useState<Taxpayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch taxpayers
  const fetchTaxpayers = useCallback(async () => {
    if (!smmmId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const token = getAuthToken();
      if (!token) {
        setError('Oturum bulunamadı');
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/tenants/${smmmId}/taxpayers`, {
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setTaxpayers(result.data?.taxpayers || []);
    } catch (err) {
      console.error('Mükellef listesi yüklenemedi:', err);
      setError('Mükellef listesi yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  }, [smmmId]);

  useEffect(() => {
    fetchTaxpayers();
  }, [fetchTaxpayers]);

  // VKN validation
  const validateVKN = useCallback((vkn: string): { valid: boolean; error?: string } => {
    if (!vkn || vkn.trim() === '') {
      return { valid: false, error: 'VKN zorunlu' };
    }
    const cleanVkn = vkn.replace(/\D/g, '');
    if (cleanVkn.length !== 10 && cleanVkn.length !== 11) {
      return { valid: false, error: 'VKN 10 veya 11 hane olmalı' };
    }
    if (taxpayers.some((t) => t.vkn_full === cleanVkn)) {
      return { valid: false, error: 'Bu VKN zaten kayıtlı' };
    }
    return { valid: true };
  }, [taxpayers]);

  // Filtered taxpayers
  const filteredTaxpayers = taxpayers.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.vkn.includes(searchQuery)
  );

  // Selection handlers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredTaxpayers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTaxpayers.map(t => t.id)));
    }
  }, [selectedIds.size, filteredTaxpayers]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Add client
  const addClient = useCallback(async (client: NewClientForm): Promise<boolean> => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/tenants/${smmmId}/taxpayers`, {
        method: 'POST',
        headers: {
          Authorization: token || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: client.name.trim(),
          vkn: client.vkn.replace(/\D/g, ''),
          type: client.type,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.data?.taxpayer) {
        setTaxpayers((prev) => [...prev, result.data.taxpayer]);
      }
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      throw new Error(`Mükellef eklenemedi: ${errorMessage}`);
    }
  }, [smmmId]);

  // Delete client
  const deleteClient = useCallback(async (id: string): Promise<boolean> => {
    try {
      const token = getAuthToken();
      const response = await fetch(
        `${API_BASE_URL}/api/v1/tenants/${smmmId}/taxpayers/${id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: token || '',
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${response.status}`);
      }

      setTaxpayers((prev) => prev.filter((t) => t.id !== id));
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      throw new Error(`Mükellef silinemedi: ${errorMessage}`);
    }
  }, [smmmId]);

  // Bulk delete
  const bulkDelete = useCallback(async (): Promise<{ success: number; error: number }> => {
    let successCount = 0;
    let errorCount = 0;

    for (const id of selectedIds) {
      try {
        const token = getAuthToken();
        const response = await fetch(
          `${API_BASE_URL}/api/v1/tenants/${smmmId}/taxpayers/${id}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: token || '',
              'Content-Type': 'application/json',
            },
          }
        );
        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    if (successCount > 0) {
      setTaxpayers(prev => prev.filter(t => !selectedIds.has(t.id)));
    }
    setSelectedIds(new Set());

    return { success: successCount, error: errorCount };
  }, [selectedIds, smmmId]);

  // Parse bulk file (CSV/Excel)
  const parseBulkFile = useCallback(async (file: File): Promise<ParsedTaxpayer[]> => {
    const text = await file.text();
    const lines = text.split('\n').filter((line) => line.trim());

    const hasHeader = lines[0]?.toLowerCase().includes('vkn') ||
                      lines[0]?.toLowerCase().includes('unvan') ||
                      lines[0]?.toLowerCase().includes('firma');

    const dataLines = hasHeader ? lines.slice(1) : lines;

    return dataLines.map((line) => {
      const parts = line.includes('\t') ? line.split('\t') : line.split(/[,;]/);

      if (parts.length < 2) {
        return { name: '', vkn: '', valid: false, error: 'Geçersiz satır formatı' };
      }

      let vkn = '';
      let name = '';

      for (const part of parts) {
        const cleaned = part.trim().replace(/\D/g, '');
        if (cleaned.length === 10 || cleaned.length === 11) {
          vkn = cleaned;
          break;
        }
      }

      for (const part of parts) {
        const cleaned = part.trim();
        if (cleaned && cleaned.replace(/\D/g, '').length !== cleaned.length) {
          if (cleaned.length > name.length) {
            name = cleaned;
          }
        }
      }

      const validation = validateVKN(vkn);
      return {
        name: name || 'İsimsiz',
        vkn,
        valid: validation.valid && name.length > 0,
        error: !name ? 'Firma adı bulunamadı' : validation.error,
      };
    });
  }, [validateVKN]);

  // Bulk add
  const bulkAdd = useCallback(async (items: ParsedTaxpayer[]): Promise<{ success: number; errors: BulkError[] }> => {
    const validItems = items.filter((p) => p.valid);
    let successCount = 0;
    const errors: BulkError[] = [];

    // Add already invalid items to errors
    items.forEach((item, idx) => {
      if (!item.valid) {
        errors.push({ satir: idx + 1, vkn: item.vkn || '-', hata: item.error || 'Geçersiz veri' });
      }
    });

    for (let i = 0; i < validItems.length; i++) {
      const item = validItems[i];
      const originalIdx = items.indexOf(item);
      try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/api/v1/tenants/${smmmId}/taxpayers`, {
          method: 'POST',
          headers: {
            Authorization: token || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: item.name,
            vkn: item.vkn,
            type: item.type || 'limited',
          }),
        });

        if (response.ok) {
          successCount++;
        } else {
          const errData = await response.json().catch(() => ({}));
          errors.push({
            satir: originalIdx + 1,
            vkn: item.vkn,
            hata: errData.detail || `HTTP ${response.status}`,
          });
        }
      } catch (err) {
        errors.push({
          satir: originalIdx + 1,
          vkn: item.vkn,
          hata: err instanceof Error ? err.message : 'Bağlantı hatası',
        });
      }
    }

    return { success: successCount, errors };
  }, [smmmId]);

  // Parse PDF file
  const parsePdfFile = useCallback(async (file: File): Promise<VergiLevhasiData> => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/tax-certificate/parse`,
        {
          method: 'POST',
          headers: {
            Authorization: token || '',
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        return {
          unvan: file.name,
          vkn: '',
          valid: false,
          error: errData.detail || `HTTP ${response.status}`,
        };
      }

      const result = await response.json();
      const data = result.data;

      if (data.success && data.parsed_data) {
        const parsed = data.parsed_data;
        const existingVkn = taxpayers.some(t => t.vkn_full === parsed.vkn);
        return {
          unvan: parsed.company_name || file.name,
          vkn: parsed.vkn || '',
          vergiDairesi: parsed.tax_office,
          faaliyet: parsed.nace_description,
          valid: !!parsed.vkn && parsed.vkn.length >= 10 && !existingVkn,
          error: !parsed.vkn ? 'VKN okunamadı' : existingVkn ? 'Bu VKN zaten kayıtlı' : undefined,
        };
      } else {
        return {
          unvan: file.name,
          vkn: '',
          valid: false,
          error: data.message || 'PDF okunamadı',
        };
      }
    } catch (err) {
      return {
        unvan: file.name,
        vkn: '',
        valid: false,
        error: err instanceof Error ? err.message : 'Bağlantı hatası',
      };
    }
  }, [taxpayers]);

  // PDF add
  const pdfAdd = useCallback(async (items: VergiLevhasiData[]): Promise<{ success: number; error: number }> => {
    const validItems = items.filter((p) => p.valid);
    let successCount = 0;
    let errorCount = 0;

    for (const item of validItems) {
      try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/api/v1/tenants/${smmmId}/taxpayers`, {
          method: 'POST',
          headers: {
            Authorization: token || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: item.unvan,
            vkn: item.vkn,
            type: 'limited',
          }),
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    return { success: successCount, error: errorCount };
  }, [smmmId]);

  return {
    taxpayers,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    filteredTaxpayers,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    addClient,
    deleteClient,
    bulkDelete,
    parseBulkFile,
    bulkAdd,
    parsePdfFile,
    pdfAdd,
    validateVKN,
    refetch: fetchTaxpayers,
  };
}
