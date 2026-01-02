import SimpleDashboard from "./_components/SimpleDashboard";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function pick(sp: SearchParams, key: string, fallback: string): string {
  const v = sp?.[key];
  if (Array.isArray(v)) return v[0] || fallback;
  return (v as string) || fallback;
}

export default async function V1Page({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = (await searchParams) || {};

  const ctx = {
    smmm: pick(sp, "smmm", "HKOZKAN"),
    client: pick(sp, "client", "OZKAN_KIRTASIYE"),
    period: pick(sp, "period", "2025-Q2"),
  };

  return (
    <SimpleDashboard
      smmmId={ctx.smmm}
      clientId={ctx.client}
      period={ctx.period}
    />
  );
}
