"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJson } from "./_lib/fetchJson";
import { JsonView } from "./_components/JsonView";
import { Section } from "./_components/Section";

export default function V1Home() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // primary: backend proxy
        const d = await fetchJson(
          "/api/v1/contracts/portfolio",
          "/contracts/portfolio_customer_summary.json"
        );
        setData(d);
      } catch (e: any) {
        setErr(e?.message || "unknown error");
      }
    })();
  }, []);

  return (
    <main style={{ padding: 18, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>LYNTOS V1</h1>
      <div style={{ opacity: 0.75, marginBottom: 14 }}>
        Contracts-driven UI (backend v1 API → fallback: public/contracts)
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <a
          href="/api/v1/dossier/bundle"
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.15)",
            textDecoration: "none",
          }}
        >
          Dossier Bundle İndir (ZIP)
        </a>
        <Link
          href="/v1/mbr"
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.15)",
            textDecoration: "none",
          }}
        >
          MBR Görünümü
        </Link>
      </div>

      {err && (
        <Section title="Hata">
          <div style={{ color: "crimson" }}>{err}</div>
        </Section>
      )}

      {!data && !err && <div>Yükleniyor…</div>}

      {data && (
        <>
          <Section title="Özet">
            <JsonView data={data} />
          </Section>

          <Section title="Risk Detaylarına Git">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {["R-401A", "R-501"].map((code) => (
                <Link
                  key={code}
                  href={`/v1/risks/${code}`}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.15)",
                    textDecoration: "none",
                  }}
                >
                  {code}
                </Link>
              ))}
            </div>
            <div style={{ opacity: 0.7, marginTop: 8, fontSize: 12 }}>
              Not: Risk endpoint’i backend’te yoksa otomatik olarak public/contracts içindeki risk_detail_*.json kullanır.
            </div>
          </Section>
        </>
      )}
    </main>
  );
}
