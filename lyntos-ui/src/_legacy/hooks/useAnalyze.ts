import { normalizeAnalyze } from "@/lib/normalize";
import { useQuery } from "@tanstack/react-query";
import { fetchAnalyze } from "@/lib/api";
import type { AnalyzeResponse } from "@/domain/types";

export function useAnalyze(entity: string, period: string) {
  return useQuery<AnalyzeResponse>({
    queryKey: ["analyze", entity, period],
    queryFn: () => fetchAnalyze(entity, period),
    staleTime: 30_000,
  });
}
