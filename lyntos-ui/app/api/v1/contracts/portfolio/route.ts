import { NextRequest } from "next/server";
import { proxyJson } from "../../../../_proxy/proxy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return proxyJson(req, "/api/v1/contracts/portfolio", { method: "GET" });
}
