"use client";

export async function fetchJson<T = any>(
  primaryUrl: string,
  fallbackUrl?: string
): Promise<T> {
  // 1) primary
  try {
    const r1 = await fetch(primaryUrl, { cache: "no-store" });
    if (r1.ok) return (await r1.json()) as T;
  } catch {}

  // 2) fallback
  if (fallbackUrl) {
    const r2 = await fetch(fallbackUrl, { cache: "no-store" });
    if (r2.ok) return (await r2.json()) as T;
  }

  throw new Error(`Fetch failed: ${primaryUrl}${fallbackUrl ? " (fallback tried)" : ""}`);
}
