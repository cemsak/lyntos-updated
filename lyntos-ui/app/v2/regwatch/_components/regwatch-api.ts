import { API_BASE_URL } from '../../_lib/config/api';
import type { MevzuatResult, Statistics } from './regwatch-types';

export async function searchMevzuat(params: {
  query?: string;
  types?: string[];
  kurumlar?: string[];
  limit?: number;
  offset?: number;
}): Promise<{ results: MevzuatResult[]; total: number }> {
  const searchParams = new URLSearchParams();

  if (params.query) searchParams.set('q', params.query);
  if (params.types?.length) searchParams.set('types', params.types.join(','));
  if (params.kurumlar?.length) searchParams.set('kurumlar', params.kurumlar.join(','));
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());

  const res = await fetch(`${API_BASE_URL}/api/v2/mevzuat/search?${searchParams}`);
  const data = await res.json();

  if (!data.success) throw new Error('Arama başarısız');

  return {
    results: data.data.results,
    total: data.data.total
  };
}

export async function fetchStatistics(): Promise<Statistics> {
  const res = await fetch(`${API_BASE_URL}/api/v2/mevzuat/statistics`);
  const data = await res.json();
  if (!data.success) throw new Error('İstatistikler alınamadı');
  return data.data;
}

export async function fetchRecent(): Promise<MevzuatResult[]> {
  const res = await fetch(`${API_BASE_URL}/api/v2/mevzuat/recent?limit=10`);
  const data = await res.json();
  if (!data.success) throw new Error('Son mevzuatlar alınamadı');
  return data.data;
}

export async function fetchByType(
  type: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ results: MevzuatResult[]; total: number; type_label: string }> {
  const res = await fetch(
    `${API_BASE_URL}/api/v2/mevzuat/by-type/${type}?limit=${limit}&offset=${offset}`
  );
  const data = await res.json();
  if (!data.success) throw new Error('Mevzuat listesi alınamadı');
  return {
    results: data.data.results,
    total: data.data.total,
    type_label: data.data.type_label
  };
}
