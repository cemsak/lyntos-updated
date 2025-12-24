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
  const CODE = String(code || "").trim();
  if (!CODE) throw new Error("Risk code boş olamaz.");

  // 1) Önce API (varsa) dene
  let detail: any = null;

  if (SOURCE === "api") {
    try {
      detail = await fetchJsonAbsolute(
        `${API_BASE}/api/v1/contracts/risks/${encodeURIComponent(CODE)}`
      );
    } catch {
      detail = null;
    }
  }

  // 2) Fallback: local/public contract (UI build / offline için)
  if (!detail) {
    detail = await readPublicContractsJson(`risk_detail_${CODE}.json`);
  }

  // 3) Context sabitleme: period_window / data_quality / kurgan sinyalleri (portfolio'dan)
  try {
    const portfolio: any = await getPortfolioSummary();
    const risks: any[] = extractRisks(portfolio);

    const match =
      Array.isArray(risks)
        ? risks.find((r: any) =>
            String(r?.code ?? r?.rule_id ?? r?.risk_id ?? "").toUpperCase() === CODE.toUpperCase()
          )
        : null;

    const pw =
      (detail as any)?.period_window ??
      (detail as any)?.enriched_data?.period_window ??
      portfolio?.period_window ??
      portfolio?.enriched_data?.period_window ??
      null;

    const dq =
      (detail as any)?.data_quality ??
      (detail as any)?.enriched_data?.data_quality ??
      portfolio?.data_quality ??
      portfolio?.enriched_data?.data_quality ??
      null;

    const ks =
      (detail as any)?.kurgan_criteria_signals ??
      (detail as any)?.enriched_data?.kurgan_criteria_signals ??
      (detail as any)?.risk?.kurgan_criteria_signals ??
      match?.kurgan_criteria_signals ??
      match?.enriched_data?.kurgan_criteria_signals ??
      null;

    if (pw && !(detail as any)?.period_window) (detail as any).period_window = pw;
    if (dq && !(detail as any)?.data_quality) (detail as any).data_quality = dq;
    if (ks && !(detail as any)?.kurgan_criteria_signals) (detail as any).kurgan_criteria_signals = ks;
  } catch {
    // sessiz geç: UI yine de detail'i gösterebilsin
  }

  return detail;
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
