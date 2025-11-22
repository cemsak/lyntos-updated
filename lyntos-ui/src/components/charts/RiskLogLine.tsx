"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
export default function RiskLogLine({ data }: { data: any[] }) {
  return (
    <div className="w-full" style={{ minHeight: 220 }}>
      <ResponsiveContainer width="100%" height={220} minWidth={0}>
        <LineChart
          data={data || []}
          margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
        >
          <XAxis dataKey="donem" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="skor"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
