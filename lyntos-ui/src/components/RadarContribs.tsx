"use client";
import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

export default function RadarContribs({
  data,
  width,
  height,
}: {
  data: Array<{ label: string; value: number }>;
  width?: number;
  height?: number;
}) {
  const w = Math.max(0, Math.floor(width ?? 320));
  const h = Math.max(0, Math.floor(height ?? 160));

  return (
    <div className="min-w-0 h-full" data-test="radar-contribs">
      <BarChart width={w} height={h} data={data ?? []}>
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} />
        <Tooltip />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#3b82f6" />
      </BarChart>
    </div>
  );
}
