"use client";
export default function ErrorBox({ title = "Hata", message }: { title?: string; message: string }) {
  return (
    <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
      <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{message}</pre>
    </div>
  );
}
