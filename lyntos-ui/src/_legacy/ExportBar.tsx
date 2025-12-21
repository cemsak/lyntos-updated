"use client";
import { useState } from "react";
import JSZip from "jszip";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
function toCSV(rows: any[]) {
  if (!rows?.length) return "";
  const keys = Array.from(
    rows.reduce((s, r) => {
      Object.keys(r || {}).forEach((k) => s.add(k));
      return s;
    }, new Set<string>()),
  );
  const head = keys.join(",");
  const body = rows
    .map((r) => keys.map((k) => JSON.stringify(r?.[k] ?? "")).join(","))
    .join("\n");
  return head + "\n" + body + "\n";
}
export default function ExportBar({
  beyan = [],
  mizanTop5 = [],
  partners = [],
  evidence = [],
}: {
  beyan?: any[];
  mizanTop5?: any[];
  partners?: any[];
  evidence?: any[];
}) {
  const [busy, setBusy] = useState(false);
  const one = (name: string, rows: any[]) => {
    const blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
  };
  const all = async () => {
    setBusy(true);
    const zip = new JSZip();
    zip.file("beyan.csv", toCSV(beyan));
    zip.file("mizan_top5.csv", toCSV(mizanTop5));
    zip.file("partners.csv", toCSV(partners));
    zip.file("evidence.csv", toCSV(evidence));
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "lyntos_export.zip";
    a.click();
    setBusy(false);
  };
  const pdf = async () => {
    setBusy(true);
    const root = document.getElementById("dashboard-root")!;
    root.classList.add("h2c");
    const canvas = await html2canvas(root, {
      useCORS: true,
      backgroundColor: "#ffffff",
      scale: 2,
    });
    root.classList.remove("h2c");
    const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const scale = imgW / canvas.width;
    const imgH = canvas.height * scale;
    let yOff = 0;
    const sliceH = pageH - 40;
    while (yOff < imgH) {
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = Math.min(canvas.height, Math.ceil(sliceH / scale));
      const ctx = pageCanvas.getContext("2d")!;
      ctx.drawImage(
        canvas,
        0,
        yOff / scale,
        canvas.width,
        pageCanvas.height,
        0,
        0,
        canvas.width,
        pageCanvas.height,
      );
      const pageImg = pageCanvas.toDataURL("image/png");
      if (yOff > 0) pdf.addPage();
      const drawH = pageCanvas.height * scale;
      pdf.addImage(pageImg, "PNG", 0, 20, imgW, drawH, "", "FAST");
      yOff += sliceH;
    }
    pdf.save("lyntos-dashboard.pdf");
    setBusy(false);
  };
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => one("beyan.csv", beyan)}
        className="rounded-md border px-3 py-1.5 text-xs"
      >
        Beyan CSV
      </button>
      <button
        onClick={() => one("mizan_top5.csv", mizanTop5)}
        className="rounded-md border px-3 py-1.5 text-xs"
      >
        Mizan Top5 CSV
      </button>
      <button
        onClick={() => one("partners.csv", partners)}
        className="rounded-md border px-3 py-1.5 text-xs"
      >
        İş Ortakları CSV
      </button>
      <button
        onClick={() => one("evidence.csv", evidence)}
        className="rounded-md border px-3 py-1.5 text-xs"
      >
        Evidence CSV
      </button>
      <button
        onClick={all}
        disabled={busy}
        className="rounded-md border px-3 py-1.5 text-xs"
      >
        Tüm CSV (ZIP)
      </button>
      <button
        onClick={pdf}
        disabled={busy}
        className="rounded-md border px-3 py-1.5 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
      >
        PDF
      </button>
    </div>
  );
}
