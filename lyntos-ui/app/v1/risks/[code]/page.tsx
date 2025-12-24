import RiskDetailClient from "@/components/v1/RiskDetailClient";

type SP = Record<string, string | string[] | undefined>;

function pick(sp: SP, key: string): string | undefined {
  const v = sp?.[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams?: Promise<SP> | SP;
}) {
  const { code } = await params;

  const sp: SP = (await Promise.resolve(searchParams ?? {})) as SP;

  const smmm = pick(sp, "smmm");
  const client = pick(sp, "client");
  const period = pick(sp, "period");

  return <RiskDetailClient code={code} smmm={smmm} client={client} period={period} />;
}
