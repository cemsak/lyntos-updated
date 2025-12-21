"use client";
import * as React from "react";
import ChartBox from "@/components/charts/ChartBox";
import NoData from "@/components/common/NoData";
import { seriesColor } from "@/components/charts/colors";
import { PieChart, Pie, Cell, Tooltip } from "recharts";

type DonutDatum = { name: string; value: number };

export default function KurganDonut({
  data = [],
  width,
  height,
  innerRadius = 50,
  outerRadius = 90,
  nameKey = "name",
  valueKey = "value",
}: {
  data?: DonutDatum[];
  width?: number;
  height?: number;
  innerRadius?: number | string;
  outerRadius?: number | string;
  nameKey?: string;
  valueKey?: string;
}) {
  const hasData = Array.isArray(data) && data.length > 0;

  const renderChart = (w: number, h: number) => (
    <PieChart width={w} height={h}>
      <Pie
        dataKey={valueKey}
        nameKey={nameKey}
        data={data as any}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        paddingAngle={2}
        isAnimationActive={false}
      >
        {(data as any).map((d: any, i: number) => (
          <Cell key={i} fill={seriesColor(String(d?.[nameKey] ?? i), i)} />
        ))}
      </Pie>
      <Tooltip />
    </PieChart>
  );

  if (!hasData) {
    return <NoData label="Veri bulunamadı" />;
  }

  // width/height verilmişse onları kullan; yoksa ChartBox ile ölç.
  if (width && height) {
    return <div className="min-w-0 h-full">{renderChart(width, height)}</div>;
  }

  return (
    <div className="min-w-0 h-full" data-test="kurgan-donut">
      <ChartBox minHeight={260}>{({ width, height }) => renderChart(width, height)}</ChartBox>
    </div>
  );
}
