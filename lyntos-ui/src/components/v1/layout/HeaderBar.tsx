"use client";

export default function HeaderBar({
  title,
  backHref = "/v1",
  right,
}: {
  title: string;
  backHref?: string;
  right?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <a href={backHref} style={{ textDecoration: "underline" }}>← geri</a>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{title}</h1>
      </div>
      <div>{right}</div>
    </div>
  );
}
