"use client";
import * as React from "react";

type Detail = { title: string; content: React.ReactNode } | null;
const Ctx = React.createContext<{ open: (t: string, c: React.ReactNode) => void; close: () => void } | null>(null);

export function DetailsProvider({ children }: { children: React.ReactNode }) {
  const [d, setD] = React.useState<Detail>(null);
  const open = (title: string, content: React.ReactNode) => setD({ title, content });
  const close = () => setD(null);
  return (
    <Ctx.Provider value={{ open, close }}>
      {children}
      {/* Minimal dialog; shadcn Dialog yerine basit custom */}
      {d ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={close}>
          <div className="w-full max-w-2xl rounded-xl border bg-card text-foreground shadow-xl" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between border-b p-3">
              <div className="font-medium">{d.title}</div>
              <button onClick={close} className="rounded-md border px-2 py-1 text-sm">Kapat</button>
            </div>
            <div className="p-4">{d.content}</div>
          </div>
        </div>
      ) : null}
    </Ctx.Provider>
  );
}

export function useDetails() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useDetails must be used within DetailsProvider");
  return ctx;
}
