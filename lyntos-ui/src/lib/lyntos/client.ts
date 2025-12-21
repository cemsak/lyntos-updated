type Portfolio = unknown;
type Mbr = unknown;
type RiskDetail = unknown;

function mode(): "contracts" | "api" {
  const m = process.env.NEXT_PUBLIC_LYNTOS_MODE;
  return m === "api" ? "api" : "contracts";
}

function basePath(): string {
  // contracts: public/contracts/*
  // api: next proxy /api/v1/contracts/*
  return mode() === "api" ? "/api/v1/contracts" : "/contracts";
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${url}`);
  return (await res.json()) as T;
}

export async function getPortfolio(): Promise<Portfolio> {
  return getJson(`${basePath()}/portfolio`);
}

export async function getMbr(): Promise<Mbr> {
  return getJson(`${basePath()}/mbr`);
}

export async function getRiskDetail(code: string): Promise<RiskDetail> {
  return getJson(`${basePath()}/risks/${encodeURIComponent(code)}`);
}

export function getBundleDownloadUrl(): string {
  // her modda da UI içinden bundle indirelim:
  return "/api/v1/dossier/bundle";
}
