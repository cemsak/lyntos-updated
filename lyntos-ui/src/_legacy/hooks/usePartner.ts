import { useQuery } from "@tanstack/react-query";
import { fetchPartnerSummary } from "@/lib/api";

export function usePartner(id?: string, enabled = true) {
  return useQuery({
    enabled: Boolean(id) && enabled,
    queryKey: ["partner", id],
    queryFn: () => fetchPartnerSummary(id!),
    staleTime: 60_000,
  });
}
