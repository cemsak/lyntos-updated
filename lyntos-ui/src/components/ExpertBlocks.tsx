"use client";
import React from "react";
import { UserCheck2, Brain } from "lucide-react";

export default function ExpertBlocks({
  vdk,
  ai,
}: {
  vdk?: string;
  ai?: string;
}) {
  const Box = ({
    icon,
    title,
    body,
    grad,
  }: {
    icon: React.ReactNode;
    title: string;
    body?: string;
    grad: string;
  }) => (
    <div className="rounded-2xl border bg-white shadow-sm dark:bg-slate-900 dark:border-slate-700 overflow-hidden">
      <div className={`px-5 py-3 ${grad}`}>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          {icon}
          {title}
        </div>
      </div>
      <div className="p-5 text-sm leading-6 text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
        {body && body.trim().length > 0 ? body : "—"}
      </div>
    </div>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Box
        icon={<UserCheck2 className="w-4 h-4" />}
        title="VDK Uzmanı Analizi"
        body={vdk}
        grad="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950"
      />
      <Box
        icon={<Brain className="w-4 h-4" />}
        title="AI Analizi"
        body={ai}
        grad="bg-gradient-to-r from-indigo-50 to-sky-50 dark:from-indigo-950 dark:to-sky-950"
      />
    </div>
  );
}
