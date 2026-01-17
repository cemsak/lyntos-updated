'use client';

import { useState, useEffect } from 'react';

interface Source {
  id: string;
  kurum: string;
  tur: string;
  baslik: string;
  canonical_url: string;
  trust_class: string;
}

interface SourceLinkProps {
  refs: string[];
  compact?: boolean;
  smmm: string;
}

export default function SourceLink(props: SourceLinkProps) {
  const { refs, compact = false, smmm } = props;
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!refs || refs.length === 0) {
      setLoading(false);
      return;
    }

    const fetchSources = async () => {
      try {
        const results = await Promise.all(
          refs.map(async (id) => {
            const url = "/api/v1/contracts/sources/" + encodeURIComponent(id);
            const res = await fetch(url, {
              headers: { "Authorization": "DEV_" + smmm }
            });
            if (!res.ok) return null;
            const json = await res.json();
            return json.data as Source;
          })
        );
        setSources(results.filter((s): s is Source => s !== null));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchSources();
  }, [refs, smmm]);

  if (loading) {
    return <span className="text-xs text-gray-400">Yukleniyor...</span>;
  }
  
  if (sources.length === 0) {
    return <span className="text-xs text-gray-400">Kaynak bulunamadi</span>;
  }

  return (
    <div className="space-y-2">
      {sources.map((source) => {
        return (
          <div key={source.id} className="flex items-start gap-3 p-2 rounded-lg bg-gray-50">
            <span className="font-mono text-xs text-gray-500">{source.id}</span>
            <div className="flex-1">
              <a
                href={source.canonical_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                {source.baslik}
              </a>
              <div className="text-xs text-gray-500 mt-1">
                {source.kurum} | {source.tur}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
