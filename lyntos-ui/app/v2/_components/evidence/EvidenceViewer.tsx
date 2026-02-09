'use client';
import React, { useState, useEffect } from 'react';
import { Badge } from '../shared/Badge';
import { getAuthToken } from '../../_lib/auth';

interface EvidenceItem {
  id: string;
  title: string;
  kind: 'document' | 'bundle' | 'external';
  ref: string;
  url?: string;
  uploaded_at?: string;
  size?: string;
  page?: number;
}

interface EvidenceViewerProps {
  isOpen: boolean;
  onClose: () => void;
  evidenceRefs: EvidenceItem[];
  title?: string;
}

export function EvidenceViewer({ isOpen, onClose, evidenceRefs, title = 'Kanıt Dosyaları' }: EvidenceViewerProps) {
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Dosya URL'ini oluştur
  const getFileUrl = (item: EvidenceItem): string => {
    // Eğer item.url varsa ve /api ile başlıyorsa kullan
    if (item.url && item.url.startsWith('/api')) {
      return item.url;
    }
    // Yoksa evidence endpoint'inden al
    return `/api/v1/evidence/file/${encodeURIComponent(item.ref)}`;
  };

  // PDF'i yükle ve göster
  const loadPdfPreview = async (item: EvidenceItem) => {
    setError(null);
    setIsLoading(true);
    setPdfBlobUrl(null);

    const fileUrl = getFileUrl(item);

    try {
      const token = getAuthToken();
      if (!token) {
        setError('Oturum açmanız gerekiyor.');
        setIsLoading(false);
        return;
      }

      const response = await fetch(fileUrl, {
        headers: {
          'Authorization': token,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('Dosya sunucuda bulunamadı.');
        } else {
          setError(`Dosya yüklenemedi (HTTP ${response.status})`);
        }
        setIsLoading(false);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
    } catch (err) {
      setError('Dosya yüklenirken hata oluştu');
      console.error('[EvidenceViewer] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Seçili dosya değişince PDF'i yükle
  useEffect(() => {
    if (selectedEvidence) {
      loadPdfPreview(selectedEvidence);
    }
    return () => {
      // Cleanup blob URL
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [selectedEvidence?.id]);

  // Modal açılınca ilk dosyayı seç
  useEffect(() => {
    if (isOpen && evidenceRefs.length > 0 && !selectedEvidence) {
      setSelectedEvidence(evidenceRefs[0]);
    }
  }, [isOpen, evidenceRefs, selectedEvidence]);

  // Modal kapanınca temizle
  useEffect(() => {
    if (!isOpen) {
      setSelectedEvidence(null);
      setError(null);
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const getKindIcon = (kind: string) => {
    const icons: Record<string, string> = {
      document: '📄',
      bundle: '📦',
      external: '🔗',
    };
    return icons[kind] || '📁';
  };

  const getKindLabel = (kind: string) => {
    const labels: Record<string, string> = {
      document: 'Belge',
      bundle: 'Paket',
      external: 'Harici',
    };
    return labels[kind] || kind;
  };

  // Yeni sekmede aç
  const handleOpenInNewTab = () => {
    if (pdfBlobUrl) {
      window.open(pdfBlobUrl, '_blank');
    }
  };

  // İndir (opsiyonel)
  const handleDownload = () => {
    if (pdfBlobUrl && selectedEvidence) {
      const a = document.createElement('a');
      a.href = pdfBlobUrl;
      a.download = selectedEvidence.title || selectedEvidence.ref || 'dosya.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5] bg-[#F5F6F8]">
          <div>
            <h2 className="text-lg font-semibold text-[#2E2E2E]">{title}</h2>
            <p className="text-xs text-[#969696]">{evidenceRefs.length} dosya</p>
          </div>
          <button onClick={onClose} className="text-[#969696] hover:text-[#5A5A5A] text-2xl leading-none">&times;</button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="px-6 py-3 bg-[#FEF2F2] border-b border-[#FFC7C9]">
            <p className="text-sm text-[#BF192B]">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 flex overflow-hidden" style={{ minHeight: '500px' }}>
          {/* Left: File List */}
          <div className="w-1/4 border-r border-[#E5E5E5] overflow-y-auto bg-[#F5F6F8]">
            {evidenceRefs.length === 0 ? (
              <div className="p-6 text-center">
                <span className="text-4xl">📭</span>
                <p className="text-sm text-[#969696] mt-2">Kanıt dosyası bulunamadı</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E5E5E5]">
                {evidenceRefs.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setSelectedEvidence(item); setError(null); }}
                    className={`w-full text-left p-3 hover:bg-white transition-colors ${
                      selectedEvidence?.id === item.id ? 'bg-white border-l-4 border-[#0078D0]' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{getKindIcon(item.kind)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#2E2E2E] truncate">{item.title}</p>
                        <Badge variant="default" className="mt-1 text-[10px]">{getKindLabel(item.kind)}</Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: PDF Preview */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#F5F6F8]">
            {selectedEvidence ? (
              <>
                {/* Preview Header */}
                <div className="p-3 border-b border-[#E5E5E5] bg-white flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-[#2E2E2E] truncate">{selectedEvidence.title}</h3>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={handleOpenInNewTab}
                      disabled={!pdfBlobUrl || isLoading}
                      className="px-3 py-1.5 text-xs bg-[#0049AA] text-white rounded hover:bg-[#0049AA] transition-colors disabled:bg-[#B4B4B4] disabled:cursor-not-allowed"
                    >
                      Yeni Sekmede Aç
                    </button>
                    <button
                      onClick={handleDownload}
                      disabled={!pdfBlobUrl || isLoading}
                      className="px-3 py-1.5 text-xs border border-[#B4B4B4] text-[#5A5A5A] rounded hover:bg-[#F5F6F8] transition-colors disabled:bg-[#F5F6F8] disabled:cursor-not-allowed"
                    >
                      İndir
                    </button>
                  </div>
                </div>

                {/* PDF Preview Area */}
                <div className="flex-1 overflow-hidden">
                  {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0049AA] mx-auto"></div>
                        <p className="text-sm text-[#969696] mt-3">Dosya yükleniyor...</p>
                      </div>
                    </div>
                  ) : pdfBlobUrl ? (
                    <iframe
                      src={pdfBlobUrl}
                      className="w-full h-full border-0"
                      title={selectedEvidence.title}
                    />
                  ) : error ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center p-6">
                        <span className="text-5xl">⚠️</span>
                        <p className="text-sm text-[#5A5A5A] mt-3">{error}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-sm text-[#969696]">Dosya seçin</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-5xl">👈</span>
                  <p className="text-sm text-[#969696] mt-3">Görüntülemek için dosya seçin</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E5E5E5] bg-[#F5F6F8] flex items-center justify-between">
          <p className="text-xs text-[#969696]">
            Yüklenen kaynak belgeler - SMMM doğrulaması için
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-[#E5E5E5] text-[#5A5A5A] rounded-lg hover:bg-[#B4B4B4] transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
