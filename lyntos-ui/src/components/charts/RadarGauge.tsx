"use client";
import { ResponsiveContainer, RadialBarChart, RadialBar } from "recharts";
export default function RadarGauge({ value = 0 }: { value?: number }) {
  const v = Math.max(0, Math.min(100, value));
  const data = [
    {
      name: "Skor",
      value: v,
      fill: v >= 70 ? "#ef4444" : v >= 50 ? "#f59e0b" : "#10b981",
    },
  ];
  return (
    <div className="w-full" style={{ minHeight: 220 }}>
      <ResponsiveContainer width="100%" height={220} minWidth={0}>
        <RadialBarChart
          innerRadius="60%"
          outerRadius="100%"
          data={data}
          startAngle={180}
          endAngle={0}
        >
          <RadialBar minAngle={15} background clockWise dataKey="value" />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="mt-2 text-center text-sm font-medium">{v}</div>
    </div>
  );
}
