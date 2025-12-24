import RiskDetailClient from "../../_components/RiskDetailClient";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function pick(sp: SearchParams, key: string, fallback: string): string {
  const v = sp?.[key];
  if (Array.isArray(v)) return v[0] || fallback;
  return (v as string) || fallback;
}

export default async function RiskPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const p = await params;
  const sp = (await searchParams) || {};

  const code = p.code;

  const smmm = pick(sp, "smmm", "HKOZKAN");
  const client = pick(sp, "client", "OZKAN_KIRTASIYE");
  const period = pick(sp, "period", "2025-Q2");

  return (
    <div className="mx-auto max-w-6xl p-4">
      <div className="mb-4">
        <a
          className="text-sm underline"
          href={`/v1?smmm=${encodeURIComponent(smmm)}&client=${encodeURIComponent(
            client
          )}&period=${encodeURIComponent(period)}`}
        >
          ← /v1 Dashboard
        </a>
      </div>
      <RiskDetailClient code={code} smmm={smmm} client={client} period={period} />
    </div>
  );
}
