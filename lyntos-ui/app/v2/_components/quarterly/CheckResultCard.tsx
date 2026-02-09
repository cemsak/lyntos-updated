/**
 * LYNTOS Check Result Card
 * Tekil capraz kontrol sonuc karti
 */

'use client';

import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, MinusCircle, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import type { EngineCheckResult } from '../../_lib/parsers/crosscheck/types';

interface CheckResultCardProps {
  result: EngineCheckResult;
}

export function CheckResultCard({ result }: CheckResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusConfig = {
    pass: {
      icon: CheckCircle2,
      bgColor: 'bg-[#ECFDF5]',
      borderColor: 'border-[#AAE8B8]',
      iconColor: 'text-[#00A651]',
      textColor: 'text-[#00804D]'
    },
    fail: {
      icon: XCircle,
      bgColor: 'bg-[#FEF2F2]',
      borderColor: 'border-[#FFC7C9]',
      iconColor: 'text-[#F0282D]',
      textColor: 'text-[#BF192B]'
    },
    partial: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-500',
      textColor: 'text-yellow-700'
    },
    skip: {
      icon: MinusCircle,
      bgColor: 'bg-[#F5F6F8]',
      borderColor: 'border-[#E5E5E5]',
      iconColor: 'text-[#969696]',
      textColor: 'text-[#5A5A5A]'
    }
  };

  const config = statusConfig[result.status];
  const Icon = config.icon;

  const formatValue = (val: number | string | null): string => {
    if (val === null) return '-';
    if (typeof val === 'number') {
      return val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return String(val);
  };

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/50 transition-colors"
      >
        <Icon className={`w-5 h-5 flex-shrink-0 ${config.iconColor}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#969696]">{result.ruleId}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              result.severity === 'critical' ? 'bg-[#FEF2F2] text-[#BF192B]' :
              result.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' :
              'bg-[#F5F6F8] text-[#5A5A5A]'
            }`}>
              {result.severity === 'critical' ? 'Kritik' :
               result.severity === 'warning' ? 'Uyari' : 'Bilgi'}
            </span>
          </div>
          <p className={`font-medium ${config.textColor} truncate`}>
            {result.ruleName}
          </p>
        </div>

        {result.difference !== undefined && result.status === 'fail' && (
          <div className="text-right">
            <p className="text-xs text-[#969696]">Fark</p>
            <p className="font-mono font-bold text-[#BF192B]">
              {formatValue(result.difference)} TL
            </p>
          </div>
        )}

        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-[#969696]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#969696]" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-white/50">
          {/* Message */}
          <p className={`text-sm mb-4 ${config.textColor}`}>
            {result.message}
          </p>

          {/* Values comparison */}
          {(result.expected !== null || result.actual !== null) && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white/70 rounded-lg p-3">
                <p className="text-xs text-[#969696] mb-1">Beklenen</p>
                <p className="font-mono font-semibold text-[#2E2E2E]">
                  {formatValue(result.expected)} {typeof result.expected === 'number' ? 'TL' : ''}
                </p>
              </div>
              <div className="bg-white/70 rounded-lg p-3">
                <p className="text-xs text-[#969696] mb-1">Bulunan</p>
                <p className="font-mono font-semibold text-[#2E2E2E]">
                  {formatValue(result.actual)} {typeof result.actual === 'number' ? 'TL' : ''}
                </p>
              </div>
            </div>
          )}

          {/* Evidence */}
          <div className="space-y-2 mb-4">
            <div className="flex items-start gap-2 text-xs">
              <FileText className="w-4 h-4 text-[#969696] mt-0.5" />
              <div>
                <span className="text-[#969696]">Kaynak A:</span>{' '}
                <span className="font-medium text-[#5A5A5A]">{result.evidenceA.source}</span>
                <span className="text-[#969696]"> &rarr; </span>
                <span className="text-[#5A5A5A]">{result.evidenceA.field}</span>
              </div>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <FileText className="w-4 h-4 text-[#969696] mt-0.5" />
              <div>
                <span className="text-[#969696]">Kaynak B:</span>{' '}
                <span className="font-medium text-[#5A5A5A]">{result.evidenceB.source}</span>
                <span className="text-[#969696]"> &rarr; </span>
                <span className="text-[#5A5A5A]">{result.evidenceB.field}</span>
              </div>
            </div>
          </div>

          {/* Suggestion */}
          {result.suggestion && (
            <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-3 mb-3">
              <p className="text-xs text-[#0049AA]">
                <span className="font-semibold">Oneri:</span> {result.suggestion}
              </p>
            </div>
          )}

          {/* Legal basis */}
          {result.legalBasis && (
            <p className="text-xs text-[#969696]">
              Yasal Dayanak: {result.legalBasis}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
