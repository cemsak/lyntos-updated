"use client";
export default function JsonBox({ data, label = "Ham JSON" }: { data: any; label?: string }) {
  return (
    <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{label}</div>
      <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
