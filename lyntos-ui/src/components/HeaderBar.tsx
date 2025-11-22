"use client";
import React from "react";
import ThemeToggle from "@/components/ThemeToggle";
import ExportBar from "@/components/ExportBar";
export default function HeaderBar(props: any) {
  return (
    <div className="w-full border-b bg-white/80 backdrop-blur dark:bg-slate-900/80">
      <div className="mx-auto max-w-7xl px-4 py-2 flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
          Lyntos · DEV TOOLBAR
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ExportBar {...props} />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
