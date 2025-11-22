"use client";
import React from "react";
export default function Empty({
  children = "— (kayıt yok)",
}: {
  children?: React.ReactNode;
}) {
  return <div className="text-sm text-slate-500">{children}</div>;
}
