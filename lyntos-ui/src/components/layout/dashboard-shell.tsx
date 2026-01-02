import * as React from "react";
import { Topbar } from "@/components/layout/topbar";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Topbar />
      <main className="w-full p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}