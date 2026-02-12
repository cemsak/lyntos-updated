'use client';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { setSourceCache } from '../contracts/map';
import { API_ENDPOINTS } from '../../_lib/config/api';
import { api } from '../../_lib/api/client';

interface Source {
  id: string;
  baslik: string;
  url?: string;
  code?: string;
  kategori?: string;
}

interface SourcesContextValue {
  sources: Source[];
  isLoaded: boolean;
  getSource: (id: string) => Source | undefined;
}

const SourcesContext = createContext<SourcesContextValue | null>(null);

export function SourcesProvider({ children }: { children: ReactNode }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function fetchSources() {
      try {
        const { data: json, ok } = await api.get<Record<string, any>>(API_ENDPOINTS.contracts.sources);

        if (ok && json) {
          // api client auto-unwraps envelope {success, data}
          const sourceList = json.sources || [];

          // Map backend format to our interface
          const mapped: Source[] = sourceList.map((s: Record<string, unknown>) => ({
            id: String(s.id || ''),
            baslik: String(s.baslik || s.title || s.id || ''),
            url: s.canonical_url ? String(s.canonical_url) : s.url ? String(s.url) : undefined,
            code: s.tur ? String(s.tur) : s.code ? String(s.code) : undefined,
          }));

          setSources(mapped);

          // Populate the cache in map.ts
          setSourceCache(mapped);
        } else {
          console.error('[SourcesProvider] Failed to fetch sources');
        }
      } catch (error) {
        console.error('[SourcesProvider] Error:', error);
      } finally {
        setIsLoaded(true);
      }
    }

    fetchSources();
  }, []);

  const getSource = (id: string) => sources.find(s => s.id === id);

  return (
    <SourcesContext.Provider value={{ sources, isLoaded, getSource }}>
      {children}
    </SourcesContext.Provider>
  );
}

export function useSources() {
  const context = useContext(SourcesContext);
  if (!context) throw new Error('useSources must be used within SourcesProvider');
  return context;
}
