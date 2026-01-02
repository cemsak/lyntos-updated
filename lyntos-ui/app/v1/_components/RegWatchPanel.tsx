'use client';

import { useState, useEffect, useMemo } from 'react';

type RegwatchSource = {
  source_id: string;
  title_tr: string;
  kind: string;
  url: string;
  enabled?: boolean;
};

type RegwatchChange = {
  change_id: string;
  detected_at: string;
  change_type: 'new' | 'modified' | 'deprecated';
  doc_id: string;
  review_status: 'pending' | 'confirmed' | 'false_positive' | 'dismissed';
  diff_summary?: {
    type?: string;
    title?: string;
    category?: string[];
  };
};

type RegwatchDocument = {
  doc_id: string;
  source_name: string;
  doc_type: string;
  title_tr: string;
  publication_date: string;
  category: string[];
};

type RegwatchContract = {
  schema?: { name?: string; version?: string; generated_at?: string };
  status?: string;
  sources?: RegwatchSource[];
  documents?: RegwatchDocument[];
  changes?: RegwatchChange[];
  impact_map?: any[];
  notes_tr?: string;
};

interface RegWatchPanelProps {
  contract?: RegwatchContract | null;
  onRefresh?: () => void;
}

export default function RegWatchPanel({ contract, onRefresh }: RegWatchPanelProps) {
  const [timeRange, setTimeRange] = useState<7 | 30>(7);
  const [loading, setLoading] = useState(false);
  const [localContract, setLocalContract] = useState<RegwatchContract | null>(contract || null);

  useEffect(() => {
    if (contract) setLocalContract(contract);
  }, [contract]);

  const rw = localContract;

  const sources = useMemo(() => {
    const arr = rw && Array.isArray(rw.sources) ? rw.sources : [];
    return arr.filter((x) => x && typeof x === 'object' && typeof x.title_tr === 'string');
  }, [rw]);

  const changes = useMemo(() => {
    const arr = rw && Array.isArray(rw.changes) ? rw.changes : [];
    // Filter by time range
    const now = new Date();
    const cutoff = new Date(now.getTime() - timeRange * 24 * 60 * 60 * 1000);
    return arr.filter((c) => {
      if (!c.detected_at) return true;
      const d = new Date(c.detected_at);
      return d >= cutoff;
    });
  }, [rw, timeRange]);

  const documents = useMemo(() => {
    const arr = rw && Array.isArray(rw.documents) ? rw.documents : [];
    return arr;
  }, [rw]);

  const pendingReviewCount = useMemo(() => {
    return changes.filter((c) => c.review_status === 'pending').length;
  }, [changes]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/contracts/regwatch', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setLocalContract(data);
      }
      onRefresh?.();
    } catch (e) {
      console.error('RegWatch refresh failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'BOOTSTRAPPED':
        return 'bg-blue-100 text-blue-800';
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'ERROR':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const changeTypeLabel = (type: string) => {
    switch (type) {
      case 'new':
        return { label: 'YENİ', cls: 'bg-blue-600 text-white' };
      case 'modified':
        return { label: 'DEĞİŞTİ', cls: 'bg-amber-500 text-white' };
      case 'deprecated':
        return { label: 'KALDIRILDI', cls: 'bg-red-600 text-white' };
      default:
        return { label: type.toUpperCase(), cls: 'bg-slate-600 text-white' };
    }
  };

  const reviewStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Bekliyor', cls: 'bg-yellow-500 text-white' };
      case 'confirmed':
        return { label: 'Onaylandı', cls: 'bg-green-600 text-white' };
      case 'false_positive':
        return { label: 'Yanlış Pozitif', cls: 'bg-slate-500 text-white' };
      case 'dismissed':
        return { label: 'İptal', cls: 'bg-slate-400 text-white' };
      default:
        return { label: status, cls: 'bg-slate-600 text-white' };
    }
  };

  return (
    <div className="rounded-2xl border p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold flex items-center gap-2">
            RegWatch - Mevzuat İzleme
            {rw?.status && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(rw.status)}`}>
                {rw.status}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-600">
            Tier 1 resmi kaynaklardan 7/24 mevzuat takibi
            {rw?.schema?.generated_at && (
              <span className="ml-2">
                • Son güncelleme: {new Date(rw.schema.generated_at).toLocaleString('tr-TR')}
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTimeRange(7)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              timeRange === 7
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Son 7 Gün
          </button>
          <button
            onClick={() => setTimeRange(30)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              timeRange === 30
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Son 30 Gün
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-slate-400 transition-colors"
          >
            {loading ? 'Yükleniyor...' : 'Yenile'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
          <div className="text-xs text-blue-600 font-medium">Kaynak Sayısı</div>
          <div className="text-2xl font-bold text-blue-800">{sources.length}</div>
        </div>
        <div className="rounded-xl bg-green-50 border border-green-100 p-3">
          <div className="text-xs text-green-600 font-medium">Döküman</div>
          <div className="text-2xl font-bold text-green-800">{documents.length}</div>
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
          <div className="text-xs text-amber-600 font-medium">Değişiklik ({timeRange}g)</div>
          <div className="text-2xl font-bold text-amber-800">{changes.length}</div>
        </div>
        <div className="rounded-xl bg-purple-50 border border-purple-100 p-3">
          <div className="text-xs text-purple-600 font-medium">İnceleme Bekliyor</div>
          <div className="text-2xl font-bold text-purple-800">{pendingReviewCount}</div>
        </div>
      </div>

      {/* Sources Grid */}
      <div>
        <div className="text-sm font-semibold text-slate-700 mb-2">Resmi Kaynaklar (Tier 1)</div>
        {sources.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {sources.map((src, i) => (
              <div
                key={`${src.source_id}-${i}`}
                className={`rounded-lg border p-3 ${
                  src.enabled !== false
                    ? 'bg-green-50 border-green-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{src.title_tr}</div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      src.enabled !== false
                        ? 'bg-green-200 text-green-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {src.enabled !== false ? 'Aktif' : 'Kapalı'}
                  </span>
                </div>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline truncate block mt-1"
                >
                  {src.url}
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
            Kaynak listesi henüz yüklenmedi (fail-soft).
          </div>
        )}
      </div>

      {/* Changes Timeline */}
      <div>
        <div className="text-sm font-semibold text-slate-700 mb-2">
          Değişiklikler (Son {timeRange} gün)
        </div>
        {changes.length ? (
          <div className="space-y-2">
            {changes.map((change) => {
              const ct = changeTypeLabel(change.change_type);
              const rs = reviewStatusLabel(change.review_status);
              return (
                <div
                  key={change.change_id}
                  className="rounded-lg border border-amber-200 bg-amber-50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${ct.cls}`}>
                          {ct.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${rs.cls}`}>
                          {rs.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          {change.detected_at
                            ? new Date(change.detected_at).toLocaleDateString('tr-TR')
                            : '-'}
                        </span>
                      </div>
                      <div className="font-medium text-sm">
                        {change.diff_summary?.title || change.doc_id}
                      </div>
                      {change.diff_summary?.category?.length ? (
                        <div className="text-xs text-slate-600 mt-1">
                          Kategori: {change.diff_summary.category.join(', ')}
                        </div>
                      ) : null}
                    </div>

                    {change.review_status === 'pending' && (
                      <button
                        className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700"
                        onClick={() => {
                          // TODO: Open review modal
                          alert(`İnceleme: ${change.change_id}`);
                        }}
                      >
                        İncele
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 bg-green-50 rounded-lg border border-green-200">
            <div className="text-green-700 font-medium">
              Son {timeRange} günde değişiklik tespit edilmedi ✓
            </div>
            <div className="text-xs text-green-600 mt-1">
              Mevzuat kaynakları güncel.
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      {rw?.notes_tr && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
          <div className="text-xs font-medium text-blue-700">Not:</div>
          <div className="text-sm text-blue-800 whitespace-pre-line">{rw.notes_tr}</div>
        </div>
      )}
    </div>
  );
}
