"use client";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-background/60 border-b">
      <div className="flex h-14 items-center gap-3 px-4">
        <div className="font-semibold tracking-tight text-primary">LYNTOS</div>
        <div className="ml-auto flex items-center gap-3">
          <input
            placeholder="Ara…"
            className="w-48 md:w-72 h-9 px-3 rounded-md bg-card border"
          />
          <button
            onClick={() => setTheme(next)}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border"
            aria-label="Tema Değiştir"
            title="Tema Değiştir"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </button>
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs">
            CS
          </div>
        </div>
      </div>
    </header>
  );
}
