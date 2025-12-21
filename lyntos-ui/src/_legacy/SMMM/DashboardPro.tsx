"use client";
import KpiGrid from "./KpiGrid";
import AnalystPanels from "./AnalystPanels";
import WhyIshikawa from "./WhyIshikawa";
import ChartBox from "@/components/ChartBox";
import KurganDonut from "@/components/KurganDonut";
import RadarContribs from "@/components/RadarContribs";
import CompactBars from "@/components/CompactBars";
import BankCard from "./blocks/BankCard";
import MizanCard from "./blocks/MizanCard";
import BeyanStatus from "./blocks/BeyanStatus";
import CounterpartyTable from "./blocks/CounterpartyTable";

export default function DashboardPro({ data }: { data: any }) {
  const radar = (data?.radarContribs || []).map((x: any) => ({
    label: x.label,
    value: Math.round(x.value),
  }));
  const bars = [
    { label: "SMİYB", value: Math.round(data?.parts?.smiyb ?? 0) },
    { label: "Beyan", value: Math.round(data?.parts?.beyan ?? 0) },
    { label: "Nakit", value: Math.round(data?.parts?.nakit ?? 0) },
    { label: "Diğer", value: Math.round(data?.parts?.diger ?? 0) },
  ];
  const bankLine = Array.isArray(data?.bankLine)
    ? data.bankLine
    : Array.isArray(data?.bankHeat)
      ? data.bankHeat
      : [];
  const bank = data?.bank || {};
  const book = data?.book || {};
  const returns = Array.isArray(data?.returns) ? data.returns : [];
  const counterparties = Array.isArray(data?.smiybPanel?.counterparties)
    ? data.smiybPanel.counterparties
    : [];

  return (
    <div className="space-y-6">
      <KpiGrid data={data} />

      {/* Donut + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartBox height={192} className="w-full">
          {({ width, height }) => (
            <KurganDonut width={width} height={height} data={data?.parts} />
          )}
        </ChartBox>
        <ChartBox height={224} className="w-full">
          {({ width, height }) => (
            <RadarContribs width={width} height={height} data={radar} />
          )}
        </ChartBox>
      </div>

      {/* CompactBars + Banka */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartBox height={160} className="w-full">
          {({ width, height }) => (
            <CompactBars width={width} height={height} data={bars} />
          )}
        </ChartBox>
        <BankCard bank={bank} line={bankLine} />
      </div>

      {/* Mizan + Beyan + Karşı Firma */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <MizanCard book={book} />
        <BeyanStatus items={returns} />
        <CounterpartyTable rows={counterparties} />
      </div>

      <AnalystPanels data={data} />
      <WhyIshikawa data={data} />
    </div>
  );
}
