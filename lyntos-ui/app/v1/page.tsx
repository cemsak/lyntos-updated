import V1DashboardClient from "./_components/V1DashboardClient";

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
    <div className="mx-auto max-w-5xl p-6">
      <V1DashboardClient
        contract={null}
        ctx={ctx}
      />
    </div>
  );
}
