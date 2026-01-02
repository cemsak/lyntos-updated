"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/fetchJson";
import { JsonView } from "../_components/JsonView";
import { Section } from "../_components/Section";

export default function MbrPage() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await fetchJson(
          "/api/v1/contracts/mbr",
          "/contracts/mbr_view.json"
        );
        setData(d);
      } catch (e: any) {
        setErr(e?.message || "unknown error");
      }
    })();
  }, []);

  return (
    <main style={{ padding: 18, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>MBR View</h1>

      {err && (
        <Section title="Hata">
          <div style={{ color: "crimson" }}>{err}</div>
        </Section>
      )}
      {!data && !err && <div>Yükleniyor…</div>}

      {data && (
        <Section title="Ham JSON">
          <JsonView data={data} />
        </Section>
      )}
    </main>
  );
}
