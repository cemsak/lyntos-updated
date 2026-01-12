'use client';
import React, { useState, useEffect } from 'react';
import { Badge } from '../shared/Badge';

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

export function EvidenceViewer({ isOpen, onClose, evidenceRefs, title = 'Kanit Dosyalari' }: EvidenceViewerProps) {
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);

  useEffect(() => {
    if (isOpen && evidenceRefs.length > 0 && !selectedEvidence) {
      setSelectedEvidence(evidenceRefs[0]);
    }
  }, [isOpen, evidenceRefs, selectedEvidence]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedEvidence(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const getKindIcon = (kind: string) => {
    const icons: Record<string, string> = {
      document: 'D',
      bundle: 'B',
      external: 'E',
    };
    return icons[kind] || 'F';
  };

  const getKindLabel = (kind: string) => {
    const labels: Record<string, string> = {
      document: 'Belge',
      bundle: 'Paket',
      external: 'Harici',
    };
    return labels[kind] || kind;
  };

  // Check if item is demo/mock data
  const isDemoItem = (item: EvidenceItem): boolean => {
    // Demo indicators: no url, ref starts with demo/mock, or ref looks like placeholder
    if (!item.url && item.ref) {
      const ref = item.ref.toLowerCase();
      if (ref.startsWith('demo') || ref.startsWith('mock') || ref.includes('sample')) {
        return true;
      }
      // Check if it's a placeholder ref like "SRC-0001" or "DOC-xxx"
      if (/^[A-Z]{2,4}-\d+$/.test(item.ref)) {
        return true;
      }
    }
    return false;
  };

  // Create demo download file
  const downloadDemoFile = (item: EvidenceItem) => {
    const demoContent = `
╔══════════════════════════════════════════════════════════════╗
║                    LYNTOS Demo Dosyası                        ║
╚══════════════════════════════════════════════════════════════╝

Dosya Bilgileri
───────────────
Başlık:    ${item.title}
Referans:  ${item.ref}
Tür:       ${getKindLabel(item.kind)}
${item.size ? `Boyut:     ${item.size}` : ''}
${item.uploaded_at ? `Tarih:     ${new Date(item.uploaded_at).toLocaleString('tr-TR')}` : ''}

─────────────────────────────────────────────────────────────────

Bu dosya demo amaçlıdır.

Gerçek sistemde:
• Orijinal belge PDF/Excel formatında indirilecektir
• Belge içeriği tam olarak görüntülenebilecektir
• Sayfa referansları ile doğrudan ilgili bölüme gidilebilecektir

Mevcut durumda demo veriler kullanılmaktadır.
Gerçek veri yüklendiğinde bu dosyalara erişim sağlanacaktır.

─────────────────────────────────────────────────────────────────
LYNTOS - Muhasebe ve Vergi Analiz Platformu
`;

    const blob = new Blob([demoContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_DEMO.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownload = (item: EvidenceItem) => {
    // If item has a real URL, open it
    if (item.url && item.url.startsWith('http')) {
      window.open(item.url, '_blank');
      return;
    }

    // Check if this is demo data
    if (isDemoItem(item) || !item.url) {
      downloadDemoFile(item);
      return;
    }

    // For real API URLs, open in new tab (auth will be handled by cookies if available)
    const downloadUrl = item.url || `/api/v1/documents/document/${item.ref}`;
    window.open(downloadUrl, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500">{evidenceRefs.length} dosya</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: File List */}
          <div className="w-1/3 border-r border-slate-200 overflow-y-auto">
            {evidenceRefs.length === 0 ? (
              <div className="p-6 text-center">
                <span className="text-4xl">O</span>
                <p className="text-sm text-slate-500 mt-2">Kanit dosyasi bulunamadi</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {evidenceRefs.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedEvidence(item)}
                    className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                      selectedEvidence?.id === item.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl font-bold text-slate-400">{getKindIcon(item.kind)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                          {isDemoItem(item) && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded flex-shrink-0">
                              Demo
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="default">{getKindLabel(item.kind)}</Badge>
                          {item.size && <span className="text-xs text-slate-400">{item.size}</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Preview/Details */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedEvidence ? (
              <>
                {/* Preview Header */}
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{selectedEvidence.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{selectedEvidence.ref}</p>
                    </div>
                    <button
                      onClick={() => handleDownload(selectedEvidence)}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <span>İndir</span>
                    </button>
                  </div>
                </div>

                {/* Preview Area */}
                <div className="flex-1 overflow-auto p-6 bg-slate-100">
                  <div className="bg-white rounded-lg shadow-sm p-8 min-h-[300px] flex flex-col items-center justify-center">
                    <span className="text-6xl font-bold text-slate-300 mb-4">{getKindIcon(selectedEvidence.kind)}</span>
                    <p className="text-lg font-medium text-slate-900">{selectedEvidence.title}</p>
                    <p className="text-sm text-slate-500 mt-1">{getKindLabel(selectedEvidence.kind)}</p>

                    {selectedEvidence.uploaded_at && (
                      <p className="text-xs text-slate-400 mt-4">
                        Yuklenme: {new Date(selectedEvidence.uploaded_at).toLocaleString('tr-TR')}
                      </p>
                    )}

                    {selectedEvidence.page && (
                      <p className="text-xs text-slate-400 mt-1">
                        Referans Sayfa: {selectedEvidence.page}
                      </p>
                    )}

                    {/* Demo Mode Warning */}
                    {isDemoItem(selectedEvidence) && (
                      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-center max-w-md">
                        <p className="text-sm text-amber-800">
                          <strong>Demo Modu:</strong> Bu dosya gercek sistemde acilacaktir.
                          Simdilik ornek dosya indirebilirsiniz.
                        </p>
                      </div>
                    )}

                    <div className="mt-6 flex gap-3">
                      <button
                        onClick={() => handleDownload(selectedEvidence)}
                        className="px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        {isDemoItem(selectedEvidence) ? 'Demo İndir' : 'Dosyayi Ac'}
                      </button>
                      {selectedEvidence.url && selectedEvidence.url.startsWith('http') && (
                        <a
                          href={selectedEvidence.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          Kaynaga Git
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-slate-100">
                <p className="text-sm text-slate-500">Goruntlemek icin dosya secin</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Bu dosyalar analiz icin kullanilan kaynaklerdir.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
