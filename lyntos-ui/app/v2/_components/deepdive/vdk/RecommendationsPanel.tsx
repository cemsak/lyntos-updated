'use client';

import React from 'react';

interface Recommendation {
  code: string;
  text: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
}

const PRIORITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  if (recommendations.length === 0) {
    return null;
  }

  // Sort by severity
  const sorted = [...recommendations].sort(
    (a, b) => PRIORITY_ORDER.indexOf(a.severity) - PRIORITY_ORDER.indexOf(b.severity)
  );

  return (
    <div className="mt-6 bg-[#E6F9FF] rounded-lg p-4">
      <h3 className="font-semibold text-[#00287F] mb-3 flex items-center gap-2">
        <span>Oneriler ({recommendations.length})</span>
      </h3>
      <ol className="space-y-2">
        {sorted.map((rec, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="bg-[#ABEBFF] text-[#00287F] rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0">
              {i + 1}
            </span>
            <span className="text-[#00287F]">
              <span className="font-medium">[{rec.code}]</span> {rec.text}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
