import { api } from '../../_lib/api/client';
import type { MevzuatResult, Statistics } from './regwatch-types';

export async function searchMevzuat(params: {
  query?: string;
  types?: string[];
  kurumlar?: string[];
  limit?: number;
  offset?: number;
}): Promise<{ results: MevzuatResult[]; total: number }> {
  const qp: Record<string, string> = {};
  if (params.query) qp.q = params.query;
  if (params.types?.length) qp.types = params.types.join(',');
  if (params.kurumlar?.length) qp.kurumlar = params.kurumlar.join(',');
  if (params.limit) qp.limit = params.limit.toString();
  if (params.offset) qp.offset = params.offset.toString();

  const { data, error } = await api.get<{ results: MevzuatResult[]; total: number }>(
    '/api/v2/mevzuat/search',
    { params: qp }
  );
  if (error || !data) throw new Error(error || 'Arama başarısız');
  return { results: data.results, total: data.total };
}

export async function fetchStatistics(): Promise<Statistics> {
  const { data, error } = await api.get<Statistics>('/api/v2/mevzuat/statistics');
  if (error || !data) throw new Error(error || 'İstatistikler alınamadı');
  return data;
}

export async function fetchRecent(): Promise<MevzuatResult[]> {
  const { data, error } = await api.get<MevzuatResult[]>('/api/v2/mevzuat/recent', {
    params: { limit: 10 },
  });
  if (error || !data) throw new Error(error || 'Son mevzuatlar alınamadı');
  return data;
}

export async function fetchByType(
  type: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ results: MevzuatResult[]; total: number; type_label: string }> {
  const { data, error } = await api.get<{ results: MevzuatResult[]; total: number; type_label: string }>(
    `/api/v2/mevzuat/by-type/${type}`,
    { params: { limit, offset } }
  );
  if (error || !data) throw new Error(error || 'Mevzuat listesi alınamadı');
  return { results: data.results, total: data.total, type_label: data.type_label };
}
