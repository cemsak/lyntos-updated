import { NextRequest } from "next/server";
import { proxyJson } from "../../_proxy/proxy";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Query string'i aynen backend'e taşıyoruz: ?smmm&client&period
  const qs = req.nextUrl.searchParams.toString();
  const path = qs ? `/api/v1/refresh?${qs}` : "/api/v1/refresh";
  return proxyJson(req, path, { method: "POST" });
}
