'use client';

import { useState, useEffect } from 'react';

interface QueueItem {
  id: string;
  tenant_id: string;
  legacy_filename: string;
  legacy_path: string;
  suggested_doc_type: string;
  suggested_period_id: string | null;
  confidence: number;
  reason: string;
  status: string;
  created_at: string;
}

interface MigrationReviewQueueProps {
  tenantId: string;
  onResolve: () => void;
}

export default function MigrationReviewQueue({ tenantId, onResolve }: MigrationReviewQueueProps) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  const authHeaders = { 'Authorization': `DEV_${tenantId}` };

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/documents/migration-review-queue?status=NEEDS_REVIEW`,
        { headers: authHeaders }
      );
      const data = await res.json();
      setItems(data.data?.items || []);
    } catch (error) {
      console.error('Queue fetch error:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQueue();
  }, [tenantId]);

  const handleResolve = async (item: QueueItem, decision: 'MIGRATE_OK' | 'REJECT') => {
    setResolving(item.id);
    try {
      const res = await fetch('http://localhost:8000/api/v1/documents/migration-review-resolve', {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          queue_id: item.id,
          decision: decision,
          client_id: 'OZKAN_KIRTASIYE',
          period_id: item.suggested_period_id || '2025-Q2',
          doc_type: item.suggested_doc_type,
          reason: decision === 'REJECT' ? 'User rejected' : '',
          actor: tenantId
        })
      });

      if (res.ok) {
        fetchQueue();
        onResolve();
      }
    } catch (error) {
      console.error('Resolve error:', error);
    }
    setResolving(null);
  };

  if (loading) {
    return <div className="p-4 text-gray-500">Yukleniyor...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg p-4 border">
        <p className="text-gray-500">Migration kuyrugu bos</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b">
        <h3 className="font-semibold text-gray-700">Migration Review Queue ({items.length})</h3>
      </div>

      <div className="divide-y">
        {items.map(item => (
          <div key={item.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.legacy_filename}</p>
                <div className="flex items-center gap-2 mt-1 text-sm">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                    {item.suggested_doc_type}
                  </span>
                  <span className="text-gray-500">
                    Donem: {item.suggested_period_id || 'Belirsiz'}
                  </span>
                  <span className={`px-2 py-0.5 rounded ${
                    item.confidence >= 0.8 ? 'bg-green-100 text-green-800' :
                    item.confidence >= 0.5 ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {(item.confidence * 100).toFixed(0)}% guven
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{item.reason}</p>
              </div>

              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleResolve(item, 'MIGRATE_OK')}
                  disabled={resolving === item.id}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                >
                  Onayla
                </button>
                <button
                  onClick={() => handleResolve(item, 'REJECT')}
                  disabled={resolving === item.id}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                >
                  Reddet
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
