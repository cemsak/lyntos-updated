import { NextRequest } from "next/server";
import { proxyStream } from "../../../_proxy/proxy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const path = qs ? `/api/v1/dossier/pdf?${qs}` : "/api/v1/dossier/pdf";
  return proxyStream(req, path, { method: "GET" });
}
