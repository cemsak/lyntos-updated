import { NextRequest } from "next/server";
import { proxyJson } from "../../../../_proxy/proxy";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ axis: string }> }
) {
  const p = await ctx.params;
  const axis = encodeURIComponent(p.axis);

  const qs = req.nextUrl.searchParams.toString();
  const path = qs
    ? `/api/v1/contracts/axis/${axis}?${qs}`
    : `/api/v1/contracts/axis/${axis}`;

  return proxyJson(req, path, { method: "GET" });
}
