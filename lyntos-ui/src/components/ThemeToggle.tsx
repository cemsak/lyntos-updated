"use client";
import React from "react";
export default function ThemeToggle() {
  React.useEffect(() => {
    try {
      if (localStorage.getItem("theme") === "dark")
        document.documentElement.classList.add("dark");
    } catch {}
  }, []);
  const toggle = () => {
    const el = document.documentElement;
    const isDark = el.classList.toggle("dark");
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {}
  };
  return (
    <button onClick={toggle} className="rounded-md border px-3 py-1.5 text-xs">
      Tema
    </button>
  );
}
