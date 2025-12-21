"use client";

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ margin: "18px 0" }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>{title}</div>
      {children}
    </section>
  );
}
