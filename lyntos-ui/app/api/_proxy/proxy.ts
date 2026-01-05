import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function backendBase(): string {
  return (
    process.env.LYNTOS_BACKEND_BASE ||
    process.env.BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_BASE ||
    "http://127.0.0.1:8000"
  );
}

function forwardHeaders(src: Headers): Headers {
  const out = new Headers();
  src.forEach((value, key) => {
    const lk = key.toLowerCase();
    // Skip headers that cause issues when proxying
    if (['host', 'connection', 'content-length', 'accept-encoding', 'set-cookie'].includes(lk)) {
      return;
    }
    out.set(key, value);
  });
  return out;
}

export async function proxyJson(req: NextRequest, upstreamPath: string, init?: RequestInit) {
  const url = `${backendBase()}${upstreamPath}`;
  
  // Forward headers from incoming request (including Authorization)
  const headers = forwardHeaders(req.headers);
  
  const upstream = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: headers,
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: new Headers({
      "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
    }),
  });
}

export async function proxyStream(req: NextRequest, upstreamPath: string, init?: RequestInit) {
  const url = `${backendBase()}${upstreamPath}`;
  
  // Forward headers from incoming request
  const headers = forwardHeaders(req.headers);
  
  const upstream = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: headers,
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: new Headers({
      "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
    }),
  });
}
