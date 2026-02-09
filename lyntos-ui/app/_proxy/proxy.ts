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

function filterHeaders(src: Headers | undefined): Headers {
  const out = new Headers();
  
  if (src) {
    src.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      // Skip problematic headers
      if (['host', 'connection', 'content-length', 'accept-encoding'].includes(lowerKey)) {
        return;
      }
      out.set(key, value);
    });
  }
  
  return out;
}

function buildUpstreamUrl(req: NextRequest | Request, upstreamPath: string): string {
  const base = backendBase().replace(/\/+$/g, "");
  const p = upstreamPath.startsWith("/") ? upstreamPath : `/${upstreamPath}`;
  let url = `${base}${p}`;

  try {
    const u = new URL((req as any).url);
    const qs = u.searchParams.toString();
    if (qs) url = url + (url.includes("?") ? "&" : "?") + qs;
  } catch {
    // ignore
  }

  return url;
}

export async function proxyJson(
  req: NextRequest | Request,
  upstreamPath: string,
  init?: RequestInit
): Promise<Response> {
  const upstreamUrl = buildUpstreamUrl(req, upstreamPath);
  const headers = filterHeaders((req as any).headers);

  try {
    const upstream = await fetch(upstreamUrl, {
      ...(init || {}),
      cache: "no-store",
      headers: headers,
    });

    const txt = await upstream.text();
    const respHeaders = new Headers();
    respHeaders.set("content-type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    respHeaders.set("x-lyntos-proxy-upstream", upstreamUrl);
    respHeaders.set("x-lyntos-proxy-status", String(upstream.status));

    return new Response(txt, { status: upstream.status, headers: respHeaders });
  } catch (e: any) {
    const respHeaders = new Headers();
    respHeaders.set("content-type", "application/json; charset=utf-8");
    respHeaders.set("x-lyntos-proxy-upstream", upstreamUrl);
    respHeaders.set("x-lyntos-proxy-status", "FETCH_ERROR");

    const body = {
      detail: "proxy fetch error",
      upstream: upstreamUrl,
      error: e && e.message ? String(e.message) : String(e),
    };
    return new Response(JSON.stringify(body), { status: 502, headers: respHeaders });
  }
}
