export function Badge({ text }: { text: string }) {
  const t = (text || "—").toUpperCase();
  const cls =
    t === "CRITICAL" ? "bg-red-600 text-white" :
    t === "HIGH" ? "bg-orange-600 text-white" :
    t === "MEDIUM" ? "bg-yellow-500 text-black" :
    t === "LOW" ? "bg-green-600 text-white" :
    "bg-zinc-200 text-zinc-900";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{t}</span>;
}
