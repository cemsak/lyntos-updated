import V1DashboardClient from "./_components/V1DashboardClient";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function pick(sp: SearchParams, key: string, fallback: string): string {
  const v = sp?.[key];
  if (Array.isArray(v)) return v[0] || fallback;
  return (v as string) || fallback;
}

function backendBase(): string {
  return (
    process.env.LYNTOS_BACKEND_BASE ||
    process.env.BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_BASE ||
    "http://localhost:8000"
  );
}

async function getPortfolioContract() {
  const url = `${backendBase()}/api/v1/contracts/portfolio`;
  const res = await fetch(url, { cache: "no-store" });
  const txt = await res.text();
  if (!res.ok) {
    throw new Error(`portfolio contract failed: ${res.status} ${txt}`);
  }
  return JSON.parse(txt);
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

  const contract = await getPortfolioContract();

  return (
    <div className="mx-auto max-w-6xl p-4">
      <V1DashboardClient contract={contract} ctx={ctx} />
    </div>
  );
}
