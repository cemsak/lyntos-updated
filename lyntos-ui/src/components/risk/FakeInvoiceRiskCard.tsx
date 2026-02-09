/**
 * FakeInvoiceRiskCard - Sahte Fatura Risk Kartı
 * LYNTOS V2 - Sprint 8
 *
 * Kompakt sahte fatura risk göstergesi
 */

import React from "react";
import { AlertTriangle, CheckCircle, Shield, ChevronRight } from "lucide-react";

interface Props {
  riskScore: number;
  riskFactors: string[];
  onViewDetails?: () => void;
  className?: string;
}

export default function FakeInvoiceRiskCard({
  riskScore,
  riskFactors,
  onViewDetails,
  className,
}: Props) {
  // Risk seviyesi belirleme
  const getRiskLevel = () => {
    if (riskScore >= 70) return { level: "critical", label: "Kritik", color: "red" };
    if (riskScore >= 50) return { level: "high", label: "Yüksek", color: "orange" };
    if (riskScore >= 30) return { level: "medium", label: "Orta", color: "yellow" };
    return { level: "low", label: "Düşük", color: "green" };
  };

  const risk = getRiskLevel();

  const colorClasses = {
    red: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700",
      badge: "bg-red-100 text-red-800",
      bar: "bg-red-500",
    },
    orange: {
      bg: "bg-orange-50",
      border: "border-orange-200",
      text: "text-orange-700",
      badge: "bg-orange-100 text-orange-800",
      bar: "bg-orange-500",
    },
    yellow: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-700",
      badge: "bg-yellow-100 text-yellow-800",
      bar: "bg-yellow-500",
    },
    green: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-700",
      badge: "bg-green-100 text-green-800",
      bar: "bg-green-500",
    },
  };

  const colors = colorClasses[risk.color as keyof typeof colorClasses];

  return (
    <div
      className={`rounded-xl border p-4 ${colors.bg} ${colors.border} ${
        className || ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {risk.level === "critical" || risk.level === "high" ? (
            <AlertTriangle className={`w-5 h-5 ${colors.text}`} />
          ) : risk.level === "medium" ? (
            <Shield className={`w-5 h-5 ${colors.text}`} />
          ) : (
            <CheckCircle className={`w-5 h-5 ${colors.text}`} />
          )}
          <span className="font-medium text-gray-900">Sahte Fatura Riski</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${colors.badge}`}>
          {risk.label}
        </span>
      </div>

      {/* Risk Score Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Risk Skoru</span>
          <span className={`font-medium ${colors.text}`}>{riskScore.toFixed(0)}/100</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${colors.bar} transition-all duration-500`}
            style={{ width: `${riskScore}%` }}
          />
        </div>
      </div>

      {/* Risk Factors */}
      {riskFactors.length > 0 && (
        <div className="space-y-1 mb-3">
          {riskFactors.slice(0, 3).map((factor, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-sm text-gray-600"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${colors.bar}`} />
              <span className="truncate">{factor}</span>
            </div>
          ))}
          {riskFactors.length > 3 && (
            <div className="text-xs text-gray-400 pl-3.5">
              +{riskFactors.length - 3} faktör daha
            </div>
          )}
        </div>
      )}

      {/* View Details Button */}
      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="w-full flex items-center justify-center gap-1 text-sm text-gray-600 hover:text-gray-900 pt-2 border-t border-gray-200"
        >
          Detayları Gör
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
