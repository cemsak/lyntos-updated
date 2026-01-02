import React from "react";

export type RiskNedeni = {
  neden: string;
  etki: string; // "Artırıcı" | "Azaltıcı" | "Nötr" (string geliyor)
  kanit?: string;
  oneri?: string; // DİKKAT: backend'de 'onerı' yazımı varsa UI'da map et
};

type Props = {
  title?: string;
  items: RiskNedeni[];
  className?: string;
};

const badgeColor = (etki?: string) => {
  const e = (etki || "").toLowerCase();
  if (e.includes("art")) return "bg-red-100 text-red-700 border-red-200";
  if (e.includes("azal")) return "bg-green-100 text-green-700 border-green-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
};

export default function RiskReasons({
  title = "Neden • Etki • Kanıt • Öneri",
  items,
  className,
}: Props) {
  if (!items || items.length === 0) {
    return (
      <div
        className={`rounded-2xl border p-4 bg-white shadow-sm ${className || ""}`}
      >
        <div className="text-sm text-gray-500">
          Gösterilecek neden bulunamadı.
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border p-5 bg-white shadow-sm ${className || ""}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="text-xs text-gray-500">{items.length} madde</span>
      </div>
      <div className="grid gap-4">
        {items.map((it, i) => {
          // Backend bazen "oneri" yerine "onerı" gönderebilir (ı/i farkı).
          const oneri = (it as any).oneri ?? (it as any).onerı ?? it.oneri;
          return (
            <div key={i} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="text-base font-medium">
                  {it.neden || "Neden (veri yok)"}
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full border ${badgeColor(it.etki)}`}
                >
                  {it.etki || "Nötr"}
                </span>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs font-semibold text-gray-500">
                    Kanıt
                  </div>
                  <div className="text-sm text-gray-700">{it.kanit ?? "—"}</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs font-semibold text-gray-500">
                    Öneri
                  </div>
                  <div className="text-sm text-gray-700">{oneri ?? "—"}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
