import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.BACKEND_URL ?? "http://127.0.0.1:8010";

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const p = new URLSearchParams(u.search);
  if (p.get("firma") && !p.get("entity")) p.set("entity", p.get("firma")!);
  if (p.get("donem") && !p.get("period")) p.set("period", p.get("donem")!);
  const qs = p.toString();
  const tries = [
    `/api/analyze?${qs}`,
    `/analyze?${qs}`,
    `/v1/kurgan/analyze?${qs}`,
  ];
  for (const t of tries) {
    try {
      const r = await fetch(`${BASE}${t}`, { cache: "no-store" });
      if (r.ok) {
        const data = await r.json();
        return NextResponse.json(
          { endpoint: "risk (alias)", source: t, ...data },
          { status: 200 },
        );
      }
    } catch {}
  }
  return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
}
