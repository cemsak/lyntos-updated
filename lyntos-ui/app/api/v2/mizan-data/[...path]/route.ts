/**
 * Proxy for /api/v2/mizan-data/* endpoints
 * Forwards requests to backend /api/v2/mizan-data/*
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getApiBase(): string {
  return (
    process.env.LYNTOS_BACKEND_BASE ??
    process.env.LYNTOS_API_BASE ??
    "http://127.0.0.1:8000"
  );
}

async function proxy(req: NextRequest, pathParts: string[]) {
  const apiBase = getApiBase();
  const inUrl = new URL(req.url);

  const target = new URL(`/api/v2/mizan-data/${pathParts.join("/")}`, apiBase);
  target.search = inUrl.search;

  // Forward headers
  const headers = new Headers(req.headers);
  try {
    headers.set("host", new URL(apiBase).host);
  } catch {}

  try {
    const upstream = await fetch(target.toString(), {
      method: req.method,
      headers,
      cache: "no-store",
    });

    // Response headers - remove content-encoding to avoid issues
    const outHeaders = new Headers(upstream.headers);
    outHeaders.delete("content-encoding");

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: outHeaders,
    });
  } catch (error) {
    console.error("[mizan-data proxy] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Backend connection failed" },
      { status: 502 }
    );
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, (await context.params).path || []);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, (await context.params).path || []);
}
