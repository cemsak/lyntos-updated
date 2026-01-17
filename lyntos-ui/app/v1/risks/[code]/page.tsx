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

  const smmm = pick(sp, "smmm", "");
  const client = pick(sp, "client", "");
  const period = pick(sp, "period", "");

  // Parametreler zorunlu
  if (!smmm || !client || !period) {
    return (
      <div className="mx-auto max-w-6xl p-4">
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Parametre Eksik</h2>
          <p className="text-slate-600 mb-4">
            Lutfen URL parametrelerini belirtin: ?smmm=XXX&amp;client=YYY&amp;period=2025-Q1
          </p>
          <a href="/v2" className="text-blue-600 hover:underline">V2 Dashboard&apos;a Git</a>
        </div>
      </div>
    );
  }

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
