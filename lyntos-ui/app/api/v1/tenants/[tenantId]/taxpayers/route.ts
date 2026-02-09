import { NextRequest } from "next/server";
import { proxyJson } from "../../../../_proxy/proxy";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;

  return proxyJson(req, `/api/v1/tenants/${tenantId}/taxpayers`, { method: "GET" });
}
