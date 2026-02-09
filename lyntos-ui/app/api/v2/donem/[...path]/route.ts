/**
 * LYNTOS V2 - Dönem Data Proxy Route
 *
 * Next.js API route that proxies requests to the Python backend.
 * Handles: /api/v2/donem/{client_id}/{period}
 */

import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function getApiBase(): string {
  return (
    process.env.LYNTOS_API_BASE ||
    process.env.NEXT_PUBLIC_API_BASE ||
    "http://127.0.0.1:8000"
  );
}

async function proxy(req: NextRequest, pathParts: string[]) {
  const apiBase = getApiBase();
  const inUrl = new URL(req.url);

  // Build target URL: /api/v2/donem/{path parts}
  const target = new URL(`/api/v2/donem/${pathParts.join("/")}`, apiBase);
  target.search = inUrl.search;

  const method = req.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD" ? undefined : await req.arrayBuffer();

  // Set host header for backend
  const headers = new Headers(req.headers);
  try {
    headers.set("host", new URL(apiBase).host);
  } catch {}

  const upstream = await fetch(target.toString(), {
    method,
    headers,
    body,
    redirect: "manual",
    cache: "no-store",
  });

  // Preserve response headers; remove content-encoding to avoid issues
  const outHeaders = new Headers(upstream.headers);
  outHeaders.delete("content-encoding");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: outHeaders,
  });
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

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, (await context.params).path || []);
}
