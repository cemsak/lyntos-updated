"use client";

import { Pill, SectionCard, JsonBox } from "@/components/v1/ui/Atoms";

type AnyObj = Record<string, any>;

function asArray(v: any): any[] {
  return Array.isArray(v) ? v : [];
}

function nfmt(v: any): string {
  const num = typeof v === "number" ? v : (v == null ? null : Number(v));
  if (num == null || Number.isNaN(num)) return "-";
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(num);
}

export default function R501View({ contract }: { contract: AnyObj }) {
  const risk = contract?.risk ?? {};
  const ev = risk?.evidence_details ?? {};

  const auditPack = ev?.audit_pack ?? {};
  const auditDossier = ev?.audit_dossier ?? {};

  // month_table olası yollar
  const monthTable =
    asArray(auditPack?.month_table).length ? asArray(auditPack?.month_table)
    : asArray(auditDossier?.evidence_pack?.month_table).length ? asArray(auditDossier?.evidence_pack?.month_table)
    : asArray(auditDossier?.month_table);

  // worst month olası yollar
  const worstMonth =
    auditPack?.worst_month ??
    auditDossier?.evidence_pack?.worst_month ??
    auditDossier?.worst_month ??
    null;

  const samples =
    auditPack?.samples_counts ??
    auditDossier?.evidence_pack?.samples_counts ??
    auditDossier?.samples_counts ??
    null;

  // reconciliation_plan asıl kritik: bazı payload’larda audit_dossier.reconciliation_plan’da geliyor
  const plan =
    asArray(auditDossier?.evidence_pack?.reconciliation_plan).length ? asArray(auditDossier?.evidence_pack?.reconciliation_plan)
    : asArray(auditDossier?.reconciliation_plan).length ? asArray(auditDossier?.reconciliation_plan)
    : asArray(ev?.reconciliation_plan);

  return (
    <div className="space-y-4">
      <SectionCard title="Özet">
        <div className="flex flex-wrap gap-2">
          <Pill label={`worst_month: ${worstMonth || "-"}`} />
          <Pill label={`samples: sales=${samples?.sales ?? "-"} | kdv=${samples?.kdv ?? "-"}`} />
        </div>
      </SectionCard>

      <SectionCard title="Ay Bazında Mutabakat Tablosu">
        {monthTable?.length ? (
          <div className="overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left">Ay</th>
                  <th className="py-2 text-right">KDV Matrah</th>
                  <th className="py-2 text-right">e-Defter Net Satış</th>
                  <th className="py-2 text-right">Delta</th>
                  <th className="py-2 text-right">Oran</th>
                </tr>
              </thead>
              <tbody>
                {monthTable.map((r: any, idx: number) => {
                  const isWorst = worstMonth && r?.month === worstMonth;
                  return (
                    <tr key={idx} className={"border-b " + (isWorst ? "bg-amber-50" : "")}>
                      <td className="py-2">{r?.month ?? "-"}</td>
                      <td className="py-2 text-right">{nfmt(r?.kdv_matrah)}</td>
                      <td className="py-2 text-right">{nfmt(r?.edefter_net_sales)}</td>
                      <td className="py-2 text-right">{nfmt(r?.delta_net_minus_kdv)}</td>
                      <td className="py-2 text-right">
                        {typeof r?.ratio_net_over_kdv === "number"
                          ? r.ratio_net_over_kdv.toFixed(4)
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-slate-600">
            Tablo bulunamadı. (audit_pack.month_table / audit_dossier.* yollarına bakıldı)
          </div>
        )}
      </SectionCard>

      <SectionCard title="Mutabakat Planı">
        {plan?.length ? (
          <ul className="list-disc space-y-2 pl-5 text-sm">
            {plan.map((p: any, i: number) => (
              <li key={i}>{String(p)}</li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-slate-600">Plan bulunamadı.</div>
        )}
      </SectionCard>

      <SectionCard title="Ham JSON (her zaman mevcut)">
        <JsonBox value={contract} />
      </SectionCard>
    </div>
  );
}
