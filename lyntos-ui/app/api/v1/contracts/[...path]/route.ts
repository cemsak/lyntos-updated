import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  const base = process.env.LYNTOS_BACKEND_BASE ?? "http://127.0.0.1:8000";
  const url = `${base}/api/v1/contracts/${path.join("/")}`;

  const res = await fetch(url, { cache: "no-store" });
  const buf = await res.arrayBuffer();

  return new NextResponse(buf, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}
