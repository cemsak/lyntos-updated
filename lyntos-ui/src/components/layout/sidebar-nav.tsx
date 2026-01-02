import Link from "next/link";

const items: Array<{ href: string; label: string }> = [
  { href: "/dashboard", label: "Genel Bakış" },
  { href: "/dashboard/risks", label: "Riskler" },
  { href: "/dashboard/partners", label: "Karşı Taraflar" },
  { href: "/dashboard/reports", label: "Raporlar" },
];

export function SidebarNav() {
  return (
    <aside className="hidden md:flex md:w-64 lg:w-72 shrink-0 border-r bg-card/50">
      <div className="p-4 w-full">
        <div className="text-sm font-medium text-muted-foreground mb-2">Menü</div>
        <nav className="grid gap-1">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="rounded-md px-3 py-2 hover:bg-accent hover:text-accent-foreground text-sm"
            >
              {it.label}
            </Link>
          ))}
        </nav>
        <div className="my-4 h-px w-full bg-border" />
        <div className="text-xs text-muted-foreground">v1 • modern UI</div>
      </div>
    </aside>
  );
}
