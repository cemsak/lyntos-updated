'use client';

import { useState, useEffect } from 'react';

interface Source {
  id: string;
  kurum: string;
  tur: string;
  baslik: string;
  canonical_url: string;
  trust_class: string;
  kapsam_etiketleri: string[];
}

interface SourceLinkProps {
  refs: string[];
  compact?: boolean;
}

export default function SourceLink({ refs, compact = false }: SourceLinkProps) {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSources = async () => {
      if (!refs || refs.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const responses = await Promise.all(
          refs.map(id =>
            fetch(`/api/v1/contracts/sources/${id}`)
              .then(r => {
                if (!r.ok) throw new Error(`Source ${id} not found`);
                return r.json();
              })
              .then(data => data.data)
              .catch(() => null)
          )
        );

        const validSources = responses.filter((s): s is Source => s !== null);
        setSources(validSources);
        setLoading(false);
      } catch (err) {
        console.error('Source fetch error:', err);
        setError('Kaynaklar yuklenemedi');
        setLoading(false);
      }
    };

    fetchSources();
  }, [refs]);

  if (loading) {
    return <span className="text-xs text-gray-400">Yukleniyor...</span>;
  }

  if (error) {
    return <span className="text-xs text-red-400">{error}</span>;
  }

  if (sources.length === 0) {
    return <span className="text-xs text-gray-400">Kaynak bulunamadi</span>;
  }

  // Compact mode: sadece ID'leri goster
  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {sources.map(source => (
          <a
            key={source.id}
            href={source.canonical_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono
              ${source.trust_class === 'A' ? 'bg-green-50 text-green-700 hover:bg-green-100' :
                source.trust_class === 'B' ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' :
                source.trust_class === 'C' ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' :
                'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
            title={source.baslik}
          >
            {source.id}
            <TrustBadge trust={source.trust_class} />
          </a>
        ))}
      </div>
    );
  }

  // Full mode: detayli goster
  return (
    <div className="space-y-2">
      {sources.map(source => (
        <div
          key={source.id}
          className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          {/* ID + Trust Badge */}
          <div className="flex flex-col items-center gap-1 min-w-[60px]">
            <span className="font-mono text-xs text-gray-500">{source.id}</span>
            <TrustBadge trust={source.trust_class} showLabel />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <a
              href={source.canonical_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline line-clamp-2"
            >
              {source.baslik}
            </a>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">{source.kurum}</span>
              <span className="text-xs text-gray-300">|</span>
              <span className="text-xs text-gray-500">{source.tur}</span>
            </div>
          </div>

          {/* External link icon */}
          <a
            href={source.canonical_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      ))}
    </div>
  );
}


// Trust Badge Sub-component
function TrustBadge({ trust, showLabel = false }: { trust: string; showLabel?: boolean }) {
  const config = {
    A: { bg: 'bg-green-100', text: 'text-green-800', label: 'Resmi' },
    B: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Yari-Resmi' },
    C: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Yorum' },
    D: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Diger' },
  }[trust] || { bg: 'bg-gray-100', text: 'text-gray-800', label: '?' };

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
      {trust}
      {showLabel && <span className="ml-1 text-[10px] opacity-75">{config.label}</span>}
    </span>
  );
}
