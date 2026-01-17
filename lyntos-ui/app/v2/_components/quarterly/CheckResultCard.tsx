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
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-500',
      textColor: 'text-green-700'
    },
    fail: {
      icon: XCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-500',
      textColor: 'text-red-700'
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
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      iconColor: 'text-gray-400',
      textColor: 'text-gray-600'
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
            <span className="text-xs font-mono text-gray-400">{result.ruleId}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              result.severity === 'critical' ? 'bg-red-100 text-red-700' :
              result.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-600'
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
            <p className="text-xs text-gray-500">Fark</p>
            <p className="font-mono font-bold text-red-600">
              {formatValue(result.difference)} TL
            </p>
          </div>
        )}

        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
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
                <p className="text-xs text-gray-500 mb-1">Beklenen</p>
                <p className="font-mono font-semibold text-gray-800">
                  {formatValue(result.expected)} {typeof result.expected === 'number' ? 'TL' : ''}
                </p>
              </div>
              <div className="bg-white/70 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Bulunan</p>
                <p className="font-mono font-semibold text-gray-800">
                  {formatValue(result.actual)} {typeof result.actual === 'number' ? 'TL' : ''}
                </p>
              </div>
            </div>
          )}

          {/* Evidence */}
          <div className="space-y-2 mb-4">
            <div className="flex items-start gap-2 text-xs">
              <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <span className="text-gray-500">Kaynak A:</span>{' '}
                <span className="font-medium text-gray-700">{result.evidenceA.source}</span>
                <span className="text-gray-400"> &rarr; </span>
                <span className="text-gray-600">{result.evidenceA.field}</span>
              </div>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <span className="text-gray-500">Kaynak B:</span>{' '}
                <span className="font-medium text-gray-700">{result.evidenceB.source}</span>
                <span className="text-gray-400"> &rarr; </span>
                <span className="text-gray-600">{result.evidenceB.field}</span>
              </div>
            </div>
          </div>

          {/* Suggestion */}
          {result.suggestion && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
              <p className="text-xs text-blue-700">
                <span className="font-semibold">Oneri:</span> {result.suggestion}
              </p>
            </div>
          )}

          {/* Legal basis */}
          {result.legalBasis && (
            <p className="text-xs text-gray-400">
              Yasal Dayanak: {result.legalBasis}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
