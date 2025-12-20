"use client";
import React from "react";

type Props = { description?: string };

export default function InfoIcon({ description }: Props) {
  return (
    <span title={description} style={{ marginLeft: 8, color: "#888" }}>
      ℹ️
    </span>
  );
}