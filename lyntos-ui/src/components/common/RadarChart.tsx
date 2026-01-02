"use client";
import React from "react";

type Props = { data?: any };

export default function RadarChart({ data }: Props) {
  return (
    <div style={{ padding: 12, border: "1px solid #e6e6e6", borderRadius: 8 }}>
      <strong>RadarChart (placeholder)</strong>
      <div style={{ marginTop: 8, color: "#666" }}>
        {data ? JSON.stringify(data).slice(0, 200) : "No data provided"}
      </div>
    </div>
  );
}