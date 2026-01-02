"use client";

import React from "react";

export function Pill(props: { label?: string; text?: string; children?: React.ReactNode }) {
  const content = props.label ?? props.text ?? props.children ?? null;
  if (!content) return null;
  return (
    <span className="inline-flex items-center rounded-full border px-3 py-1 text-sm">
      {content}
    </span>
  );
}

export function SectionCard(props: { title?: string; children?: React.ReactNode; className?: string }) {
  return (
    <section className={"rounded-2xl border p-5 " + (props.className ?? "")}>
      {props.title ? <h3 className="mb-3 text-lg font-semibold">{props.title}</h3> : null}
      {props.children}
    </section>
  );
}

export function ErrorBox(props: {
  title?: string;
  message?: string;
  detail?: string;
  children?: React.ReactNode;
}) {
  const msg = props.message ?? props.detail ?? "";
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
      {props.title ? <div className="font-semibold">{props.title}</div> : null}
      {msg ? <div className="mt-1 text-sm whitespace-pre-wrap">{msg}</div> : null}
      {props.children}
    </div>
  );
}

export function JsonBox(props: { data?: any; value?: any; className?: string }) {
  const v = props.value ?? props.data;
  return (
    <pre className={"mt-2 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100 " + (props.className ?? "")}>
      {JSON.stringify(v ?? null, null, 2)}
    </pre>
  );
}
