"use client";
import * as React from "react";

type Size = { width: number; height: number };
type Props = {
  /** Grafiğin minimum yüksekliği (px) */
  minHeight?: number;
  className?: string;
  /** Recharts gibi width/height isteyen grafiklere render-prop ile ölçü verilebilir */
  children: React.ReactNode | ((size: Size) => React.ReactNode);
};

export default function ChartBox({ minHeight = 260, className, children }: Props) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [size, setSize] = React.useState<Size>({ width: 0, height: minHeight });

  React.useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    // İlk ölçüm
    const getH = () => Math.max(minHeight, el.clientHeight || minHeight);
    setSize({ width: el.clientWidth || 0, height: getH() });

    // ResizeObserver ile dinle
    const ro = new ResizeObserver(() => {
      setSize({ width: el.clientWidth || 0, height: getH() });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [minHeight]);

  const ready = size.width > 10 && size.height > 10;
  const content =
    typeof children === "function" ? (children as (s: Size) => React.ReactNode)(size) : children;

  return (
    <div ref={ref} className={`relative w-full ${className || ""}`} style={{ minHeight }}>
      {ready ? (
        content
      ) : (
        <div className="h-full w-full rounded-2xl bg-muted animate-pulse" />
      )}
    </div>
  );
}
