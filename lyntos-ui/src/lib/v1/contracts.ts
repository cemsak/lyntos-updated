export async function getJson<T = any>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} :: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export function apiContracts(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `/api/v1/contracts${p}`;
}
