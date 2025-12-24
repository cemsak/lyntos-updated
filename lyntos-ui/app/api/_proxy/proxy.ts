import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function backendBase(): string {
  return (
    process.env.LYNTOS_BACKEND_BASE ||
    process.env.BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_BASE ||
    "http://localhost:8000"
  );
}

function copyHeaders(src: Headers): Headers {
  const out = new Headers();
  src.forEach((v, k) => {
    const lk = k.toLowerCase();
    // Next serverless ortamında set-cookie forward bazen sorun çıkarır; burada ihtiyacımız yok.
    if (lk === "set-cookie") return;
    out.set(k, v);
  });
  return out;
}

export async function proxyJson(req: NextRequest, upstreamPath: string, init?: RequestInit) {
  const url = `${backendBase()}${upstreamPath}`;
  const upstream = await fetch(url, {
    ...init,
    // refresh/contract için cache istemiyoruz
    cache: "no-store",
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
  const upstream = await fetch(url, {
    ...init,
    cache: "no-store",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: copyHeaders(upstream.headers),
  });
}
