"use client";

export function JsonView({ data }: { data: any }) {
  return (
    <pre style={{
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      padding: 12,
      borderRadius: 12,
      background: "rgba(0,0,0,0.05)",
      fontSize: 12,
      lineHeight: 1.35
    }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
