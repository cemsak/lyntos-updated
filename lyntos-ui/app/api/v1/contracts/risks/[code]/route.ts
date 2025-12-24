import { NextRequest } from "next/server";
import { proxyJson } from "../../../../_proxy/proxy";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> }
) {
  const p = await ctx.params;
  const code = encodeURIComponent(p.code);
  return proxyJson(req, `/api/v1/contracts/risks/${code}`, { method: "GET" });
}
