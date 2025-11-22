"use client";
import { useUI } from "@/state/store";
export default function PartnerDrawer({
  partners = [],
  evidence = [],
}: {
  partners: any[];
  evidence: any[];
}) {
  const { isOpen, closeDrawer } = useUI();
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={closeDrawer} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white p-5 shadow-2xl dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">İş Ortağı Detayı</div>
          <button
            onClick={closeDrawer}
            className="text-xs rounded-md border px-2 py-1"
          >
            Kapat
          </button>
        </div>
        <div className="text-xs">
          {partners?.slice(0, 6).map((p: any, i: number) => (
            <div key={i} className="border rounded-md p-2 mb-2">
              <div className="font-medium">{p.unvan}</div>
              <div>
                NACE: {p.nace || "—"} • Vergi No: {p.vergi_no || "—"} • Uyum:{" "}
                {p.uyum_puani ?? "—"}
              </div>
            </div>
          ))}
          <div className="mt-3 text-[11px] text-slate-500">
            İlgili Evidence listesi: ileriki sürüm.
          </div>
        </div>
      </div>
    </div>
  );
}
