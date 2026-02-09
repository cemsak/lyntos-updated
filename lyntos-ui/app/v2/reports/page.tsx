'use client';

/**
 * Raporlar Sayfası - Orchestrator
 * Profesyonel rapor oluşturma ve indirme merkezi
 * Big 4 kalite raporlama sistemi
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Download,
  Upload,
  Clock,
  Plus,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDashboardScope, useScopeComplete } from '../_components/scope/useDashboardScope';
import { getAuthToken } from '../_lib/auth';
import { API_ENDPOINTS } from '../_lib/config/api';
import { useToast } from '../_components/shared/Toast';

// Types
import type { OlusturulanRapor } from './_types';

// Constants
import { RAPOR_TIPLERI, colorConfig, categoryLabels } from './_lib/constants';

// Components
import { ReportCard, GeneratedReportItem } from './_components';

export default function ReportsPage() {
  const router = useRouter();
  const { scope } = useDashboardScope();
  const scopeComplete = useScopeComplete();
  const { showToast } = useToast();
  const [olusturulanRaporlar, setOlusturulanRaporlar] = useState<OlusturulanRapor[]>([]);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);
  const [checkingData, setCheckingData] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check actual mizan data availability via backend (with retry)
  useEffect(() => {
    if (!scopeComplete || !scope.client_id || !scope.period) {
      setHasData(false);
      setCheckingData(false);
      return;
    }

    let cancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout>;

    const checkData = async (attempt = 1) => {
      if (cancelled) return;
      setCheckingData(true);

      try {
        const token = getAuthToken();
        const params = new URLSearchParams({ client_id: scope.client_id!, period_id: scope.period! });
        const res = await fetch(`${API_ENDPOINTS.mizanData.check}?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (cancelled) return;

        if (res.ok) {
          const json = await res.json();
          setHasData(json.exists === true);
          setCheckingData(false);
        } else if (attempt < 3) {
          // Backend might still be starting — retry after 2s
          retryTimeout = setTimeout(() => checkData(attempt + 1), 2000);
        } else {
          // After 3 attempts, assume data exists (fail-soft)
          setHasData(true);
          setCheckingData(false);
        }
      } catch {
        if (cancelled) return;
        if (attempt < 3) {
          retryTimeout = setTimeout(() => checkData(attempt + 1), 2000);
        } else {
          setHasData(true);
          setCheckingData(false);
        }
      }
    };

    checkData();

    return () => {
      cancelled = true;
      clearTimeout(retryTimeout);
    };
  }, [scopeComplete, scope.client_id, scope.period]);

  // Load previously generated reports from backend
  useEffect(() => {
    if (!scopeComplete || !scope.client_id) return;

    const loadReports = async () => {
      try {
        const token = getAuthToken();
        const params = new URLSearchParams();
        if (scope.client_id) params.set('client_id', scope.client_id);
        if (scope.period) params.set('period', scope.period);
        const url = `${API_ENDPOINTS.reports.list}?${params.toString()}`;
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const raporTipAdlari: Record<string, string> = {};
          RAPOR_TIPLERI.forEach(r => { raporTipAdlari[r.id] = r.name; });

          const mapped: OlusturulanRapor[] = json.data.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            raporTipiId: r.report_type as string,
            name: raporTipAdlari[r.report_type as string] || (r.report_type as string),
            createdAt: r.generated_at as string,
            donem: r.period_id as string,
            mukellef: r.client_id as string,
            format: ((r.format as string) || 'PDF').toUpperCase() as 'PDF' | 'Excel' | 'Word',
            size: r.file_size
              ? (r.file_size as number) > 1024 * 1024
                ? `${((r.file_size as number) / (1024 * 1024)).toFixed(1)} MB`
                : `${((r.file_size as number) / 1024).toFixed(0)} KB`
              : undefined,
            downloadUrl: API_ENDPOINTS.reports.download(r.id as string),
          }));
          setOlusturulanRaporlar(mapped);
        }
      } catch {
        // Silent fail — reports list is non-critical
      }
    };
    loadReports();
  }, [scopeComplete, scope.client_id, scope.period]);

  const handleGoruntuile = useCallback((raporId: string) => {
    const rapor = RAPOR_TIPLERI.find(r => r.id === raporId);
    if (!rapor) return;

    if (rapor.requiresData && !hasData) {
      showToast('warning', 'Bu raporu görüntülemek için önce mizan verilerinizi yüklemeniz gerekiyor.');
      router.push('/v2/upload');
      return;
    }

    if (rapor.viewPath) {
      router.push(rapor.viewPath);
    } else {
      showToast('info', 'Rapor sayfası hazırlanıyor...');
    }
  }, [hasData, router, showToast]);

  const handlePdfIndir = useCallback(async (raporId: string, format: 'PDF' | 'Excel' | 'Word') => {
    const rapor = RAPOR_TIPLERI.find(r => r.id === raporId);
    if (!rapor) return;

    if (rapor.requiresData && !hasData) {
      showToast('warning', 'Rapor oluşturmak için önce veri yüklemeniz gerekiyor.');
      router.push('/v2/upload');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      showToast('error', 'Oturum bulunamadı. Lütfen giriş yapın.');
      return;
    }

    setIsGenerating(rapor.id);

    try {
      // Step 1: Generate report via backend
      const response = await fetch(API_ENDPOINTS.reports.generate, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report_type: rapor.id,
          format: format.toLowerCase(),
          client_id: scope.client_id,
          period: scope.period,
          smmm_id: scope.smmm_id || '',
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error((errBody as Record<string, string>).detail || `HTTP ${response.status}`);
      }

      const json = await response.json();
      if (!json.success) {
        throw new Error(json.detail || 'Rapor üretim hatası');
      }

      const genData = json.data as {
        id: string;
        report_type: string;
        file_size: number;
        file_size_display: string;
        generated_at: string;
      };

      // Step 2: Trigger download via download endpoint
      const downloadUrl = API_ENDPOINTS.reports.download(genData.id);
      const dlRes = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (dlRes.ok) {
        const blob = await dlRes.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${rapor.id}_${scope.period || 'rapor'}.${format.toLowerCase() === 'pdf' ? 'pdf' : format.toLowerCase()}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      }

      const yeniRapor: OlusturulanRapor = {
        id: genData.id,
        raporTipiId: rapor.id,
        name: rapor.name,
        createdAt: genData.generated_at,
        donem: scope.period || '',
        mukellef: scope.client_id || '',
        format,
        size: genData.file_size_display,
        downloadUrl,
      };

      setOlusturulanRaporlar(prev => [yeniRapor, ...prev]);
      showToast('success', `${rapor.name} (${format}) oluşturuldu`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
      showToast('error', `Rapor oluşturulamadı: ${message}`);
    } finally {
      setIsGenerating(null);
    }
  }, [hasData, router, scope.client_id, scope.period, scope.smmm_id, showToast]);

  const handleDeleteRapor = useCallback((raporId: string) => {
    setDeleteConfirmId(raporId);
  }, []);

  const confirmDeleteRapor = useCallback(() => {
    if (deleteConfirmId) {
      setOlusturulanRaporlar(prev => prev.filter(r => r.id !== deleteConfirmId));
      showToast('info', 'Rapor silindi');
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, showToast]);

  const filteredRaporlar = activeCategory
    ? RAPOR_TIPLERI.filter(r => r.category === activeCategory)
    : RAPOR_TIPLERI;

  if (!mounted) return null;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0049AA] via-[#0049AA] to-[#BF192B] rounded-2xl p-6 text-white shadow-xl animate-slide-up">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>

        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Raporlar</h1>
                <p className="text-[#E6F9FF] text-sm">Profesyonel Raporlama Merkezi</p>
              </div>
            </div>
            <p className="text-[#E6F9FF] mt-3 max-w-xl">
              Finansal analiz, risk değerlendirme ve vergi raporlarınızı tek tıkla oluşturun.
              Big 4 kalitesinde çıktılar, müşterilerinize profesyonel sunum.
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <p className="text-3xl font-bold">{olusturulanRaporlar.length}</p>
              <p className="text-xs text-[#ABEBFF]">Oluşturulan</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <p className="text-3xl font-bold">{RAPOR_TIPLERI.length}</p>
              <p className="text-xs text-[#ABEBFF]">Rapor Tipi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={`
            px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
            ${activeCategory === null
              ? 'bg-[#2E2E2E] text-white shadow-md'
              : 'bg-white text-[#5A5A5A] border border-[#E5E5E5] hover:border-[#B4B4B4]'}
          `}
        >
          Tümü
        </button>
        {Object.entries(categoryLabels).map(([key, { label, color }]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`
              px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
              ${activeCategory === key
                ? `${colorConfig[color as keyof typeof colorConfig].button} shadow-md`
                : 'bg-white text-[#5A5A5A] border border-[#E5E5E5] hover:border-[#B4B4B4]'}
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Data Check Loading */}
      {checkingData && scopeComplete && (
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-4 animate-slide-up">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-[#0049AA] animate-spin flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-[#2E2E2E]">Veri Kontrolü</h4>
              <p className="text-sm text-[#969696] mt-0.5">
                {scope.period} dönemi için mevcut veriler kontrol ediliyor...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Data Warning — sadece kontrol tamamlandıysa ve veri yoksa göster */}
      {!hasData && !checkingData && (
        <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-xl p-4 animate-slide-up">
          <div className="flex items-start gap-3">
            <Upload className="w-5 h-5 text-[#0078D0] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-[#00287F]">Veri Yükleme Gerekli</h4>
              <p className="text-sm text-[#0049AA] mt-1">
                Raporları oluşturabilmek için önce dönem verilerinizi yüklemeniz gerekiyor.
              </p>
            </div>
            <button
              onClick={() => router.push('/v2/upload')}
              className="px-4 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#00287F] text-sm font-medium whitespace-nowrap"
            >
              Veri Yükle
            </button>
          </div>
        </div>
      )}

      {/* Report Types Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredRaporlar.map((rapor, index) => (
          <ReportCard
            key={rapor.id}
            rapor={rapor}
            isLoading={isGenerating === rapor.id}
            onView={() => handleGoruntuile(rapor.id)}
            onDownload={(format) => handlePdfIndir(rapor.id, format)}
            hasData={hasData}
            index={index}
          />
        ))}
      </div>

      {/* Generated Reports */}
      <div className="bg-white border border-[#E5E5E5] rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-[#E5E5E5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#00A651] to-[#00A651] rounded-xl flex items-center justify-center text-white">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#2E2E2E]">Son Oluşturulan Raporlar</h2>
              <p className="text-sm text-[#969696]">{olusturulanRaporlar.length} rapor</p>
            </div>
          </div>

          {olusturulanRaporlar.length > 0 && (
            <button
              onClick={() => setOlusturulanRaporlar([])}
              className="text-sm text-[#969696] hover:text-[#5A5A5A]"
            >
              Tümünü Temizle
            </button>
          )}
        </div>

        {olusturulanRaporlar.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-[#F5F6F8] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-[#969696]" />
            </div>
            <p className="text-[#5A5A5A] font-medium">Henüz rapor oluşturulmadı</p>
            <p className="text-sm text-[#969696] mt-1">
              Yukarıdaki rapor tiplerinden birini seçerek başlayın
            </p>
            {!hasData && (
              <button
                onClick={() => router.push('/v2/upload')}
                className="mt-4 px-5 py-2.5 bg-[#0049AA] text-white rounded-xl hover:bg-[#0049AA] font-medium flex items-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Veri Yükle
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#E5E5E5]">
            {olusturulanRaporlar.map((rapor) => (
              <GeneratedReportItem
                key={rapor.id}
                rapor={rapor}
                onView={() => handleGoruntuile(rapor.raporTipiId)}
                onDownload={() => {
                  if (rapor.downloadUrl) {
                    const token = getAuthToken();
                    fetch(rapor.downloadUrl, {
                      headers: token ? { Authorization: `Bearer ${token}` } : {},
                    })
                      .then(r => r.blob())
                      .then(blob => {
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = `${rapor.raporTipiId}_${rapor.donem}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      })
                      .catch(() => showToast('error', 'İndirme başarısız'));
                  }
                }}
                onDelete={() => handleDeleteRapor(rapor.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {hasData && (
        <div className="bg-gradient-to-r from-[#ECFDF5] to-[#ECFDF5] border border-[#AAE8B8] rounded-2xl p-5 animate-slide-up">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#00A651] rounded-xl flex items-center justify-center text-white">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[#005A46]">Hızlı Rapor Paketi</h3>
              <p className="text-sm text-[#00804D]">
                Tüm temel raporları tek tıkla oluşturun: Mizan Analizi, VDK Risk, Finansal Oranlar
              </p>
            </div>
            <button
              onClick={async () => {
                for (const rapor of RAPOR_TIPLERI.slice(0, 3)) {
                  await handlePdfIndir(rapor.id, 'PDF');
                }
              }}
              disabled={isGenerating !== null}
              className="px-5 py-2.5 bg-[#00804D] text-white rounded-xl hover:bg-[#00804D] font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Paket Oluştur
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
          onKeyDown={(e) => e.key === 'Escape' && setDeleteConfirmId(null)}
          tabIndex={-1}
        >
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm mx-4">
            <h3 id="delete-confirm-title" className="text-lg font-bold text-[#2E2E2E]">
              Raporu Sil
            </h3>
            <p className="text-sm text-[#5A5A5A] mt-2">
              Bu raporu silmek istediğinizden emin misiniz?
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm text-[#5A5A5A] hover:text-[#2E2E2E] border border-[#E5E5E5] rounded-lg"
              >
                İptal
              </button>
              <button
                onClick={confirmDeleteRapor}
                className="px-4 py-2 text-sm bg-[#BF192B] text-white rounded-lg hover:bg-[#980F30]"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
