"use client";
import React from "react";
export default function SkeletonBox({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} />
  );
}
