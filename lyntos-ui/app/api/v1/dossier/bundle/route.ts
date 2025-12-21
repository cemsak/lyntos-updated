import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.LYNTOS_BACKEND_BASE ?? "http://127.0.0.1:8000";
  const url = `${base}/api/v1/dossier/bundle`;

  const res = await fetch(url, { cache: "no-store" });
  const buf = await res.arrayBuffer();

  // bundle indirme için content-disposition forward etmeye çalış
  const cd = res.headers.get("content-disposition") ?? "attachment; filename=LYNTOS_BUNDLE.zip";

  return new NextResponse(buf, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/zip",
      "content-disposition": cd,
      "cache-control": "no-store",
    },
  });
}
