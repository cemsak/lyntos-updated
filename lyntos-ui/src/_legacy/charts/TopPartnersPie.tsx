"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
export default function TopPartnersPie({ rows }: { rows: any[] }) {
  const colors = [
    "#4f46e5",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
  ];
  const data = (rows || [])
    .slice(0, 6)
    .map((r: any) => ({ name: r.unvan, value: Number(r.fatura_sayisi || 1) }));
  return (
    <div className="w-full" style={{ minHeight: 220 }}>
      <ResponsiveContainer width="100%" height={220} minWidth={0}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={50}
            outerRadius={80}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
