import { normalizeAnalyze } from "./normalize";
export const revalidate = 0;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export async function fetchAnalyze(params: {
  firma: string;
  donem: string;
}): Promise<any> {
  try {
    const qs = new URLSearchParams(params as any);
    const url = API_BASE + "/api/analyze?" + qs.toString();
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      return normalizeAnalyze(json);
    }
  } catch (ex) {
    return {};
  }
  return {};
}