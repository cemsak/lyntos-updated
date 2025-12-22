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

  // 1) önce detail kontratı al
  let detail: any = null;

  if (SOURCE === "api") {
    // Backend bunu destekliyorsa kullanırız:
    // GET /api/v1/contracts/risks/{code}
    // Şimdilik hata olursa local fallback'e düşer.
    try {
      detail = await fetchJsonAbsolute(`${API_BASE}/api/v1/contracts/risks/${encodeURIComponent(safe)}`);
    }
 catch {
      detail = null;
    }

  }


  if (!detail) {
    detail = await readPublicContractsJson(`risk_detail_${safe}.json`);
  }


  // 2) period_window / data_quality / kurgan signals detail'de yoksa,
  //    portfolio kontratından tamamla (ödüllük UX için kritik bağlam)
  try {
    const portfolio = await getPortfolioSummary();

    // portfolio içindeki risk listesinden aynı code'u bul
    const risks = extractRisks(portfolio);
    const match = risks.find((r: any) => String(r?.code || r?.rule_id || r?.risk_id || "").toUpperCase() === safe.toUpperCase());

    const pw =
      detail?.period_window ??
      detail?.periodWindow ??
      portfolio?.period_window ??
      portfolio?.periodWindow ??
      portfolio?.payload?.period_window ??
      portfolio?.data?.period_window ??
      null;

    const dq =
      detail?.data_quality ??
      detail?.dataQuality ??
      portfolio?.data_quality ??
      portfolio?.dataQuality ??
      portfolio?.payload?.data_quality ??
      portfolio?.data?.data_quality ??
      null;

    const ks =
      detail?.kurgan_criteria_signals ??
      detail?.kurganSignals ??
      match?.kurgan_criteria_signals ??
      match?.kurganSignals ??
      match?.kurgan_criteria?.signals ??
      null;

    if (pw && !detail?.period_window) {
      detail.period_window = pw;
    }

    if (dq && !detail?.data_quality) {
      detail.data_quality = dq;
    }

    if (ks && !detail?.kurgan_criteria_signals) {
      detail.kurgan_criteria_signals = ks;

  }
 catch {
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
