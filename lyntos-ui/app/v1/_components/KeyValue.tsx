export function KeyValue({ k, v }: { k: string; v: any }) {
  const vv = (v === null || v === undefined || v === "") ? "—" : String(v);
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-200 py-2">
      <div className="text-sm text-zinc-600">{k}</div>
      <div className="text-sm font-medium text-zinc-900 text-right">{vv}</div>
    </div>
  );
}
