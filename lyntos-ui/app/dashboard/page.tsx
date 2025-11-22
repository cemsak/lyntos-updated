"use client";
import DashboardShell from "@/components/layout/dashboard-shell";
import LyntosDashboard from "@/components/LyntosDashboard";

export default function Page() {
  return (
    <DashboardShell>
      <LyntosDashboard />
    </DashboardShell>
  );
}
