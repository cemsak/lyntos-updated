import fs from "node:fs/promises";
import path from "node:path";

type AnyObj = Record<string, any>;

function env(name: string): string | undefined {
  const v = process.env[name];
  return (typeof v === "string" && v.trim().length > 0) ? v.trim() : undefined;
}

/**
 * SOURCE:
 *  - "local": UI public/contracts/*.json dosyalarından okur (default)
 *  - "api"  : Backend API'den çeker (absolute URL ile)
 */
const SOURCE = (env("LYNTOS_CONTRACTS_SOURCE") || "local").toLowerCase();

/**
 * API base örnek:
 *  - http://127.0.0.1:8000
 */
const API_BASE =
  env("LYNTOS_API_BASE") ||
  env("NEXT_PUBLIC_LYNTOS_API_BASE") ||
  "http://127.0.0.1:8000";

async function readPublicContractsJson(filename: string): Promise<any> {
  const p = path.join(process.cwd(), "public", "contracts", filename);
  const raw = await fs.readFile(p, "utf-8");
  return JSON.parse(raw);
}

async function fetchJsonAbsolute(url: string): Promise<any> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`API fetch failed: ${res.status} ${res.statusText} :: ${txt.slice(0, 300)}`);
  }
  return res.json();
}

/** PORTFOLIO */
export async function getPortfolioSummary(): Promise<any> {
  if (SOURCE === "api") {
    // Backend: GET /api/v1/contracts/portfolio
    return fetchJsonAbsolute(`${API_BASE}/api/v1/contracts/portfolio`);
  }
  // Local: public/contracts/portfolio_customer_summary.json
  return readPublicContractsJson("portfolio_customer_summary.json");
}

/** MBR */
export async function getMbrView(): Promise<any> {
  if (SOURCE === "api") {
    // (isteğe bağlı) backend'e eklerseniz: GET /api/v1/contracts/mbr
    // Şimdilik local fallback.
  }
  return readPublicContractsJson("mbr_view.json");
}

/** RISK DETAIL (R-401A, R-501, vb.) */
export async function getRiskDetail(code: string): Promise<any> {
  const safe = String(code || "").trim();
  if (!safe) throw new Error("risk code boş");

  if (SOURCE === "api") {
    // (isteğe bağlı) backend'e eklerseniz: GET /api/v1/contracts/risks/{code}
    // Şimdilik local fallback.
  }
  return readPublicContractsJson(`risk_detail_${safe}.json`);
}

/** UI'da risks listesini olabildiğince toleranslı çekmek için yardımcı */
export function extractRisks(portfolio: any): AnyObj[] {
  if (!portfolio || typeof portfolio !== "object") return [];
  const p: AnyObj = portfolio as AnyObj;

  const candidates = [
    p.risks,
    p.items,
    p.data?.risks,
    p.payload?.risks,
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) return c.filter(Boolean);
  }
  return [];
}
