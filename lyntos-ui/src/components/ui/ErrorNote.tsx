"use client";
import React from "react";
export default function ErrorNote({
  message = "Hata: veri alınamadı",
}: {
  message?: string;
}) {
  return (
    <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {message}
    </div>
  );
}
