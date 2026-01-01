import { proxyJson } from "../../../../_proxy/proxy";
export async function GET(req: Request) {
  return proxyJson(req, "/api/v1/contracts/regwatch", { method: "GET" });
}
