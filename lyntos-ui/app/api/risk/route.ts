import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

/**
 * /api/risk is a legacy alias. We proxy to the real backend endpoint(s).
 * If backend is reachable but endpoints are wrong/missing, we return a clear error.
 */
export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const p = new URLSearchParams(u.search);

  // Backward compatible aliases:
  // firma -> client_id, donem -> period
  if (p.get("firma") && !p.get("client_id")) p.set("client_id", p.get("firma")!);
  if (p.get("donem") && !p.get("period")) p.set("period", p.get("donem")!);

  // If UI still uses entity naming:
  if (p.get("entity") && !p.get("client_id")) p.set("client_id", p.get("entity")!);

  const qs = p.toString();

  const tries = [
    `/v1/risk_model_v1?${qs}`, // <- REAL endpoint (your backend)
    `/api/analyze?${qs}`,
    `/analyze?${qs}`,
    `/v1/kurgan/analyze?${qs}`,
  ];

  let anyReachable = false;

  for (const t of tries) {
    try {
      const r = await fetch(`${BASE}${t}`, { cache: "no-store" });
      anyReachable = true;

      if (r.ok) {
        const data = await r.json();
        return NextResponse.json(
          { endpoint: "risk (alias)", source: t, ...data },
          { status: 200 }
        );
      }
    } catch {
      // network error -> keep trying
    }
  }

  if (anyReachable) {
    return NextResponse.json(
      { error: "backend_reachable_but_no_matching_endpoint", tried: tries, base: BASE },
      { status: 502 }
    );
  }

  return NextResponse.json({ error: "backend_unreachable", base: BASE }, { status: 502 });
}
