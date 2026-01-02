"use client";

import * as React from "react";

export default function HeaderBar(props: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const { title = "LYNTOS", subtitle, right } = props;

  return (
    <div className="w-full border-b bg-white/50 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold">{title}</div>
          {subtitle ? (
            <div className="truncate text-sm text-neutral-600">{subtitle}</div>
          ) : null}
        </div>
        <div className="shrink-0">{right}</div>
      </div>
    </div>
  );
}
