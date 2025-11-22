import { NextResponse } from "next/server";

const BASE = process.env.BACKEND_URL ?? "http://127.0.0.1:8010";

export async function GET() {
  const paths = ["/health", "/api/health", "/healthz"];
  for (const p of paths) {
    try {
      const r = await fetch(`${BASE}${p}`, { cache: "no-store" });
      if (r.ok) {
        const txt = await r.text();
        let json: any;
        try {
          json = JSON.parse(txt);
        } catch {
          json = { raw: txt };
        }
        return NextResponse.json(
          { upstream: p, ok: true, ...json },
          { status: 200 },
        );
      }
    } catch {}
  }
  return NextResponse.json(
    { ok: false, error: "backend_health_unreachable" },
    { status: 502 },
  );
}
