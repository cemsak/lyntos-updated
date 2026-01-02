import React, { useEffect, useRef, useState } from "react";

type Size = { width: number; height: number };
type Props = {
  /** Sabit piksel yükseklik (default 224) */
  height?: number;
  className?: string;
  children: (size: Size) => React.ReactNode;
};

export default function ChartBox({ height = 224, className = "", children }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    let rafId: number | null = null;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(0, Math.floor(entry.contentRect.width));
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          setWidth((prev) => (prev === w ? prev : w));
        });
      }
    });

    ro.observe(el);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  const ready = width > 0 && height > 0;

  return (
    <div
      ref={ref}
      className={`min-w-0 ${className}`}
      style={{ height: `${height}px`, overflow: "hidden" }}
      data-lyntos-chartbox-src="/src/components/ChartBox.tsx"
    >
      {ready ? (
        children({ width, height })
      ) : (
        <div className="h-full w-full rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      )}
    </div>
  );
}
