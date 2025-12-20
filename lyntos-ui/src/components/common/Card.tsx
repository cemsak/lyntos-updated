"use client";
import React from "react";

type Props = { children?: React.ReactNode, title?: string };

export default function Card({ children, title }: Props) {
  return (
    <div style={{ padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", borderRadius: 8 }}>
      {title && <h3 style={{ margin: 0 }}>{title}</h3>}
      <div style={{ marginTop: 8 }}>{children}</div>
    </div>
  );
}