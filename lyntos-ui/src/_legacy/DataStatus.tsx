"use client";
import Badge from "@/components/ui/badge";

export default function DataStatus({ data }: { data: any }) {
  // Esnek alan yakalama (senin gerçek JSON’unu da, normalize edilmiş şemayı da destekler)
  const riskLog = data?.kurgan?.risk_log ?? data?.risk_log ?? [];
  const beyanOzet =
    data?.kurgan?.beyanname_ozeti ?? data?.beyanname_ozeti ?? [];
  const smiybSkor =
    data?.sahte_fatura_riski?.skor ?? data?.smiyb?.skor ?? undefined;
  const radarSkor =
    data?.radar?.radar_risk_skoru ?? data?.radar?.skor ?? undefined;
  const mizanTop5 =
    data?.mizan?.top5 ??
    data?.luca?.mizan?.top5 ?? // senin örnek JSON’unda top5 yoktu; varsa yakalasın
    [];
  const partners = data?.partner_top5 ?? data?.partners ?? [];

  // SAHTE VERİ YASAK - Varsayılan true kaldırıldı
  // Veri yoksa false göster, SMMM'yi yanıltma
  const D: Record<string, boolean> = data?._demo_fill ?? {
    "kurgan.risk_log": false,
    "kurgan.beyanname_ozeti": false,
    "smiyb.skor": false,
    "radar.skor": false,
    "mizan.top5": false,
    partner_top5: false,
  };

  const items: Array<{ name: string; ok: boolean; demo: boolean }> = [
    {
      name: "Risk Log",
      ok: Array.isArray(riskLog) && riskLog.length > 0,
      demo: !!D["kurgan.risk_log"],
    },
    {
      name: "Beyan Özet",
      ok: Array.isArray(beyanOzet) && beyanOzet.length > 0,
      demo: !!D["kurgan.beyanname_ozeti"],
    },
    {
      name: "SMİYB",
      ok: typeof smiybSkor === "number",
      demo: !!D["smiyb.skor"],
    },
    {
      name: "RADAR",
      ok: typeof radarSkor === "number",
      demo: !!D["radar.skor"],
    },
    {
      name: "Mizan Top5",
      ok: Array.isArray(mizanTop5) && mizanTop5.length > 0,
      demo: !!D["mizan.top5"],
    },
    {
      name: "Partner Top5",
      ok: Array.isArray(partners) && partners.length > 0,
      demo: !!D["partner_top5"],
    },
  ];

  const variantFor = (ok: boolean, demo: boolean) =>
    ok ? (demo ? "secondary" : "default") : "outline";

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-slate-500">Veri Durumu:</span>
      {items.map((it, i) => (
        <Badge
          key={i}
          variant={variantFor(it.ok, it.demo)}
          className="px-2 py-0.5"
        >
          {it.name}
        </Badge>
      ))}
    </div>
  );
}
