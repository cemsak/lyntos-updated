import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const base = process.env.LYNTOS_BACKEND_BASE ?? "http://127.0.0.1:8000";
  const u = new URL(req.url);
  const qs = u.searchParams.toString();

  // Query varsa: yeni gerçek endpoint (v1/dossier/bundle?smmm&client&period)
  // Query yoksa: geriye dönük uyum (/api/v1/dossier/bundle -> latest bundle)
  const url = qs ? `${base}/v1/dossier/bundle?${qs}` : `${base}/api/v1/dossier/bundle`;

  const res = await fetch(url, { cache: "no-store" });
  const buf = await res.arrayBuffer();

  const cd =
    res.headers.get("content-disposition") ??
    "attachment; filename=LYNTOS_DOSSIER_BUNDLE.zip";

  return new NextResponse(buf, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/zip",
      "content-disposition": cd,
      "cache-control": "no-store",
    },
  });
}
