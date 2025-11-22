"use client";
export default function NoData({ label = "Veri bulunamadı" }: { label?: string }) {
  return (
    <div className="flex h-48 w-full items-center justify-center rounded-xl border bg-card text-muted-foreground">
      {label}
    </div>
  );
}
