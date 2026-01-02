"use client";
import React from "react";

export default function SourceLink({
  kind,
  refId,
  href,
}: {
  kind: string;
  refId?: string;
  href?: string;
}) {
  if (!refId && !href) return null;

  const onClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    if (!href) return;
    if (href.startsWith("#")) {
      e.preventDefault();
      const id = href.slice(1);
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add("flash-target");
        setTimeout(() => el.classList.remove("flash-target"), 2000);
      }
    }
  };

  const isInternal = Boolean(href?.startsWith("#"));

  return (
    <a
      href={href || "#"}
      onClick={onClick}
      target={isInternal ? undefined : "_blank"}
      rel={isInternal ? undefined : "noreferrer"}
      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
      title={href ? "Kaynağa git" : "Referans"}
    >
      {kind} {refId ? `#${refId}` : ""}
    </a>
  );
}
