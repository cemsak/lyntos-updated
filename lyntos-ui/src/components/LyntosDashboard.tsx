"use client";
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAnalyze, type PanelData } from "@/lib/api";
import FileUpload from "@/components/FileUpload";
import Modal from "@/components/Modal";
import { RadarChart, Card, InfoIcon } from "@/components/common";
import CompliancePanel from "@/components/panels/CompliancePanel";
import AIAnalysisPanel from "@/components/panels/AIAnalysisPanel";
import VDKExpertPanel from "@/components/panels/VDKExpertPanel";

// Dashboard constants
const PANEL_INFOS = {
  kurgan: "Kurgan Skoru, mali verilerdeki genel risk seviyesini belirler.",
  radar: "RADAR, sahte fatura ve beyannameler gibi sinyaller üzerinden risk analizi yapar.",
  uyum: "Uyum durumu, vergi beyannamelerinin mevzuat gerekliliklerine uygunluğunu analiz eder.",
};

// Main Dashboard Component
export default function LyntosDashboard() {
  const [filters, setFilters] = useState(() => ({
    firma: "OZKANLAR",
    donem: "2025-Q3",
  }));
  const [modalKey, setModalKey] = useState<string | null>(null);

  const { data, isError, isLoading } = useQuery<PanelData>({
    queryKey: ["analyze", filters.firma, filters.donem],
    queryFn: () => fetchAnalyze(filters),
  });

  const panels = useMemo(() => [
    { key: "radar", title: "RADAR Skoru", component: RadarChart, info: PANEL_INFOS.radar },
    { key: "kurgan", title: "KURGAN Analizi", component: Card, info: PANEL_INFOS.kurgan },
    { key: "uyum", title: "Uyum Durumu", component: CompliancePanel, info: PANEL_INFOS.uyum },
  ], []);

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <header className="dashboard-header">
        <h1>LYNTOS SMMM Paneli</h1>
        <FileUpload onUploaded={() => window.location.reload()} />
      </header>

      {/* Filters */}
      <div className="filters">
        <select
          value={filters.firma}
          onChange={(e) => setFilters({ ...filters, firma: e.target.value })}
        >
          <option value="OZKANLAR">OZKANLAR</option>
          <option value="YILMAZLAR">YILMAZLAR</option>
        </select>
        <select
          value={filters.donem}
          onChange={(e) => setFilters({ ...filters, donem: e.target.value })}
        >
          <option value="2025-Q3">2025-Q3</option>
          <option value="2025-Q4">2025-Q4</option>
        </select>
      </div>

      {/* Panels */}
      <section className="panels">
        {panels.map(({ key, title, component: Component, info }) => (
          <div className="panel-card" key={key}>
            <h2>{title}</h2>
            <InfoIcon description={info} />
            <Component data={data?.[key]} />
          </div>
        ))}
      </section>

      {/* AI Analysis */}
      <aside className="ai-analysis">
        <AIAnalysisPanel data={data?.ai} />
        <VDKExpertPanel data={data?.vdk} />
      </aside>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>LYNTOS © 2025 - Tüm Hakları Saklıdır.</p>
      </footer>
    </div>
  );
}
