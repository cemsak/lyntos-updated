import React from "react";
export default function AIAnalysisPanel({ data }) {
  return (
    <div>
      <h2>AI Analiz Paneli</h2>
      <div>
        <b>Yapay Zeka Özet:</b> {data?.ai ?? <span className="text-gray-400">Veri yok.</span>}
      </div>
      {data?.explanation && <div><b>Detay:</b> {data.explanation}</div>}
      {data?.tavsiye && <div><b>AI Tavsiyesi:</b> {data.tavsiye}</div>}
    </div>
  );
}