"use client";
import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  Legend,
} from "recharts";

export function RiskLogLine({
  data = [] as { donem: string; skor: number }[],
}) {
  if (!data?.length)
    return <div className="text-sm text-slate-500">— (log yok)</div>;
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={data}>
          <XAxis dataKey="donem" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="skor" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopPartnersPie({
  rows = [] as { unvan: string; fatura_sayisi?: number }[],
}) {
  const data = rows
    .slice(0, 6)
    .map((r) => ({ name: r.unvan, value: r.fatura_sayisi ?? 0 }));
  if (!data.length)
    return <div className="text-sm text-slate-500">— (veri yok)</div>;
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius="80%">
            {data.map((_, i) => (
              <Cell key={i} />
            ))}
          </Pie>
          <Legend />
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RadarGauge({ value }: { value?: number }) {
  const v =
    typeof value === "number" ? Math.max(0, Math.min(100, value)) : null;
  const data = [
    {
      name: "RADAR",
      val: v ?? 0,
      fill:
        v == null
          ? "#CBD5E1"
          : v >= 70
            ? "#ef4444"
            : v >= 40
              ? "#f59e0b"
              : "#10b981",
    },
  ];
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <RadialBarChart
          data={data}
          innerRadius="60%"
          outerRadius="100%"
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar dataKey="val" cornerRadius={8} />
          <Legend />
          <Tooltip />
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  );
}
