import React from "react";
export default function ChartBox({
  children,
  h = 260,
  className = "",
}: {
  children: React.ReactNode;
  h?: number;
  className?: string;
}) {
  return (
    <div
      className={`w-full min-w-0 ${className}`}
      style={{ height: h, overflow: "hidden" }}
    >
      <div style={{ height: "100%", width: "100%", minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
