/**
 * TaxCertificateRiskPanel - Vergi Levhası Risk Analiz Paneli
 * LYNTOS V2 - Sprint 8
 *
 * Vergi levhasından çıkarılan verilere dayalı risk göstergeleri
 */

import React from "react";
import {
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Building2,
  MapPin,
  Calendar,
  FileText,
  Shield,
  Activity,
} from "lucide-react";

// Risk indicator tipi
export interface RiskIndicator {
  code: string;
  name: string;
  severity: "low" | "medium" | "high" | "critical";
  score: number;
  description: string;
  recommendation: string;
  data?: Record<string, any>;
}

// Risk analizi sonucu tipi
export interface TaxCertificateRiskAnalysis {
  vkn: string;
  company_name: string;
  overall_risk_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  indicators: RiskIndicator[];
  sector_comparison?: {
    sector_name?: string;
    benchmark_available?: boolean;
    avg_profit_margin?: number;
    sector_risk_level?: string;
    fake_invoice_risk?: string;
  };
  trend_analysis?: {
    matrah_changes?: Array<{
      from_year: number;
      to_year: number;
      change_pct: number;
    }>;
    tax_changes?: Array<{
      from_year: number;
      to_year: number;
      change_pct: number;
    }>;
  };
  recommendations: string[];
  analysis_date: string;
}

interface Props {
  analysis: TaxCertificateRiskAnalysis | null;
  loading?: boolean;
  className?: string;
}

// Risk seviyesine göre renk ve ikon
const getRiskStyle = (level: string) => {
  switch (level) {
    case "critical":
      return {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-700",
        badge: "bg-red-100 text-red-800 border-red-300",
        icon: XCircle,
        label: "Kritik Risk",
      };
    case "high":
      return {
        bg: "bg-orange-50",
        border: "border-orange-200",
        text: "text-orange-700",
        badge: "bg-orange-100 text-orange-800 border-orange-300",
        icon: AlertTriangle,
        label: "Yüksek Risk",
      };
    case "medium":
      return {
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        text: "text-yellow-700",
        badge: "bg-yellow-100 text-yellow-800 border-yellow-300",
        icon: AlertCircle,
        label: "Orta Risk",
      };
    default:
      return {
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-700",
        badge: "bg-green-100 text-green-800 border-green-300",
        icon: CheckCircle,
        label: "Düşük Risk",
      };
  }
};

// Risk skoru göstergesi (gauge)
const RiskGauge: React.FC<{ score: number; level: string }> = ({
  score,
  level,
}) => {
  const style = getRiskStyle(level);
  const rotation = (score / 100) * 180 - 90; // -90 to 90 degrees

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-16 overflow-hidden">
        {/* Background arc */}
        <div className="absolute w-32 h-32 rounded-full border-8 border-gray-200" />
        {/* Colored arc based on score */}
        <div
          className={`absolute w-32 h-32 rounded-full border-8 ${
            level === "critical"
              ? "border-red-500"
              : level === "high"
              ? "border-orange-500"
              : level === "medium"
              ? "border-yellow-500"
              : "border-green-500"
          }`}
          style={{
            clipPath: `polygon(0 100%, 50% 50%, ${
              50 + 50 * Math.cos(((rotation - 90) * Math.PI) / 180)
            }% ${50 + 50 * Math.sin(((rotation - 90) * Math.PI) / 180)}%, 0 0)`,
          }}
        />
        {/* Needle */}
        <div
          className="absolute bottom-0 left-1/2 w-1 h-12 bg-gray-800 rounded-full origin-bottom"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
        />
        {/* Center circle */}
        <div className="absolute bottom-0 left-1/2 w-4 h-4 bg-gray-800 rounded-full -translate-x-1/2 translate-y-1/2" />
      </div>
      <div className="mt-2 text-2xl font-bold">{score.toFixed(0)}</div>
      <div className={`text-sm font-medium ${style.text}`}>{style.label}</div>
    </div>
  );
};

// Risk göstergesi kartı
const IndicatorCard: React.FC<{ indicator: RiskIndicator }> = ({
  indicator,
}) => {
  const style = getRiskStyle(indicator.severity);
  const Icon = style.icon;

  return (
    <div className={`rounded-xl border p-4 ${style.bg} ${style.border}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${style.badge}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-gray-900 truncate">
              {indicator.name}
            </h4>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${style.badge}`}
            >
              {indicator.score.toFixed(0)}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">{indicator.description}</p>
          <div className="mt-2 p-2 rounded-lg bg-white/50">
            <div className="text-xs font-medium text-gray-500">Öneri:</div>
            <div className="text-sm text-gray-700">{indicator.recommendation}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Trend göstergesi
const TrendBadge: React.FC<{ change: number; label: string }> = ({
  change,
  label,
}) => {
  const isPositive = change > 0;
  const isSignificant = Math.abs(change) > 10;

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
      {isPositive ? (
        <TrendingUp
          className={`w-4 h-4 ${
            isSignificant ? "text-green-600" : "text-gray-500"
          }`}
        />
      ) : (
        <TrendingDown
          className={`w-4 h-4 ${
            isSignificant ? "text-red-600" : "text-gray-500"
          }`}
        />
      )}
      <span className="text-sm text-gray-600">{label}</span>
      <span
        className={`text-sm font-medium ${
          isPositive ? "text-green-600" : "text-red-600"
        }`}
      >
        {isPositive ? "+" : ""}
        {change.toFixed(1)}%
      </span>
    </div>
  );
};

// Sektör karşılaştırma kartı
const SectorComparisonCard: React.FC<{
  comparison?: TaxCertificateRiskAnalysis["sector_comparison"];
}> = ({ comparison }) => {
  if (!comparison || !comparison.benchmark_available) {
    return null;
  }

  const riskStyle = getRiskStyle(
    comparison.fake_invoice_risk === "very_high"
      ? "critical"
      : comparison.fake_invoice_risk === "high"
      ? "high"
      : comparison.fake_invoice_risk === "medium"
      ? "medium"
      : "low"
  );

  return (
    <div className="rounded-xl border p-4 bg-white">
      <div className="flex items-center gap-2 mb-3">
        <Building2 className="w-5 h-5 text-gray-500" />
        <h4 className="font-medium">Sektör Karşılaştırması</h4>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Sektör</span>
          <span className="text-sm font-medium">{comparison.sector_name}</span>
        </div>
        {comparison.avg_profit_margin && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Ort. Kar Marjı</span>
            <span className="text-sm font-medium">
              %{(comparison.avg_profit_margin * 100).toFixed(0)}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Sahte Fatura Riski</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${riskStyle.badge}`}>
            {comparison.fake_invoice_risk === "very_high"
              ? "Çok Yüksek"
              : comparison.fake_invoice_risk === "high"
              ? "Yüksek"
              : comparison.fake_invoice_risk === "medium"
              ? "Orta"
              : "Düşük"}
          </span>
        </div>
      </div>
    </div>
  );
};

// Ana bileşen
export default function TaxCertificateRiskPanel({
  analysis,
  loading,
  className,
}: Props) {
  if (loading) {
    return (
      <div
        className={`rounded-2xl border p-6 bg-white shadow-sm animate-pulse ${
          className || ""
        }`}
      >
        <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
        <div className="h-32 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className={`rounded-2xl border p-6 bg-white shadow-sm ${className || ""}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <Shield className="w-5 h-5" />
          <span>Risk analizi için vergi levhası yükleyin</span>
        </div>
      </div>
    );
  }

  const style = getRiskStyle(analysis.risk_level);
  const criticalIndicators = analysis.indicators.filter(
    (i) => i.severity === "critical" || i.severity === "high"
  );
  const otherIndicators = analysis.indicators.filter(
    (i) => i.severity === "medium" || i.severity === "low"
  );

  return (
    <div
      className={`rounded-2xl border p-6 bg-white shadow-sm ${className || ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${style.badge}`}>
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Vergi Levhası Risk Analizi</h3>
            <p className="text-sm text-gray-500">
              {analysis.company_name} • VKN: {analysis.vkn}
            </p>
          </div>
        </div>
        <div className="text-right">
          <RiskGauge
            score={analysis.overall_risk_score}
            level={analysis.risk_level}
          />
        </div>
      </div>

      {/* Kritik Göstergeler */}
      {criticalIndicators.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Dikkat Gerektiren Göstergeler ({criticalIndicators.length})
          </h4>
          <div className="grid gap-3">
            {criticalIndicators.map((indicator, i) => (
              <IndicatorCard key={i} indicator={indicator} />
            ))}
          </div>
        </div>
      )}

      {/* Trend Analizi */}
      {analysis.trend_analysis &&
        (analysis.trend_analysis.matrah_changes?.length ?? 0) > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              Trend Analizi
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {analysis.trend_analysis.matrah_changes?.map((change, i) => (
                <TrendBadge
                  key={i}
                  change={change.change_pct}
                  label={`Matrah ${change.from_year}→${change.to_year}`}
                />
              ))}
              {analysis.trend_analysis.tax_changes?.map((change, i) => (
                <TrendBadge
                  key={`tax-${i}`}
                  change={change.change_pct}
                  label={`Vergi ${change.from_year}→${change.to_year}`}
                />
              ))}
            </div>
          </div>
        )}

      {/* Grid: Sektör + Diğer göstergeler */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Sektör Karşılaştırması */}
        <SectorComparisonCard comparison={analysis.sector_comparison} />

        {/* Diğer Göstergeler */}
        {otherIndicators.length > 0 && (
          <div className="rounded-xl border p-4 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Diğer Göstergeler ({otherIndicators.length})
            </h4>
            <div className="space-y-2">
              {otherIndicators.slice(0, 3).map((indicator, i) => {
                const indStyle = getRiskStyle(indicator.severity);
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-white"
                  >
                    <span className="text-sm text-gray-700">
                      {indicator.name}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${indStyle.badge}`}
                    >
                      {indicator.score.toFixed(0)}
                    </span>
                  </div>
                );
              })}
              {otherIndicators.length > 3 && (
                <div className="text-xs text-gray-500 text-center pt-2">
                  +{otherIndicators.length - 3} daha
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Öneriler */}
      {analysis.recommendations.length > 0 && (
        <div className="rounded-xl border p-4 bg-blue-50 border-blue-200">
          <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Öneriler
          </h4>
          <ul className="space-y-1">
            {analysis.recommendations.map((rec, i) => (
              <li key={i} className="text-sm text-blue-700">
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 text-xs text-gray-400 text-right">
        Analiz tarihi:{" "}
        {new Date(analysis.analysis_date).toLocaleDateString("tr-TR")}
      </div>
    </div>
  );
}
