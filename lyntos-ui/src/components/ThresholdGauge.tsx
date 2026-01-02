"use client";
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";

export default function ThresholdGauge({ value = 0 }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="h-56 min-w-0 relative">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="58%"
          innerRadius="70%"
          outerRadius="100%"
          data={[
            { name: "Max", value: 100 },
            { name: "Risk", value: v },
          ]}
          startAngle={220}
          endAngle={-40}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          {/* Gri arkaplan halka */}
          <RadialBar
            dataKey="value"
            cornerRadius={10}
            fill="#e5e7eb"
            background
            isAnimationActive={false}
          />
          {/* Skora göre renk: yeşil/amber/kırmızı */}
          <RadialBar
            dataKey="value"
            cornerRadius={10}
            fill={v >= 70 ? "#ef4444" : v >= 50 ? "#f59e0b" : "#10b981"}
          />
        </RadialBarChart>
      </ResponsiveContainer>

      {/* Ortadaki sayılar ve açıklama */}
      <div className="absolute inset-0 flex items-end justify-center pb-7">
        <div className="text-center">
          <div className="text-3xl font-semibold tabular-nums">{v}</div>
          <div className="text-[11px] text-slate-500">
            0–49 Düşük • 50–69 Orta • 70–100 Yüksek
          </div>
        </div>
      </div>
    </div>
  );
}
