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
    smmm: pick(sp, "smmm", ""),
    client: pick(sp, "client", ""),
    period: pick(sp, "period", ""),
  };

  // Parametreler zorunlu
  if (!ctx.smmm || !ctx.client || !ctx.period) {
    return (
      <div className="mx-auto max-w-5xl p-6">
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
    <div className="mx-auto max-w-5xl p-6">
      <V1DashboardClient
        contract={null}
        ctx={ctx}
      />
    </div>
  );
}
