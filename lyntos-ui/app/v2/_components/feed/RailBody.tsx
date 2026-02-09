'use client';

import React from 'react';
import Link from 'next/link';
import {
  FileText,
  ExternalLink,
  TrendingDown,
  Percent,
  Hash,
  Scale,
  HelpCircle,
} from 'lucide-react';
import {
  type FeedItem,
  type FeedImpact,
  type EvidenceRef,
  EVIDENCE_KIND_CONFIG,
} from './types';

function formatImpact(impact: FeedImpact): React.ReactNode {
  const parts: React.ReactNode[] = [];

  if (impact.amount_try !== undefined && impact.amount_try > 0) {
    const formatted = new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(impact.amount_try);
    parts.push(
      <span key="amount" className="flex items-center gap-1.5">
        <TrendingDown className="w-4 h-4 text-[#F0282D]" />
        <span className="font-semibold text-[#BF192B]">{formatted}</span>
      </span>
    );
  }

  if (impact.pct !== undefined && impact.pct > 0) {
    parts.push(
      <span key="pct" className="flex items-center gap-1.5">
        <Percent className="w-4 h-4 text-[#FFB114]" />
        <span className="font-semibold text-[#FA841E]">%{impact.pct.toFixed(1)}</span>
      </span>
    );
  }

  if (impact.points !== undefined && impact.points > 0) {
    parts.push(
      <span key="points" className="flex items-center gap-1.5">
        <Hash className="w-4 h-4 text-[#0078D0]" />
        <span className="font-semibold text-[#0049AA]">{impact.points} puan</span>
      </span>
    );
  }

  if (parts.length === 0) return null;

  return <div className="flex flex-wrap gap-4">{parts}</div>;
}

interface RailBodyProps {
  item: FeedItem;
  onAction?: (item: FeedItem, actionId: string) => void;
}

export function RailBody({ item, onAction }: RailBodyProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">
      {/* WHY Section - Explainability Contract */}
      {item.why && (
        <section>
          <h3 className="text-xs font-semibold text-[#969696] uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            Neden Çıktı?
          </h3>
          <div className="p-3 bg-[#FFFBEB] border border-[#FFFBEB] rounded-lg">
            <p className="text-sm text-[#E67324] leading-relaxed">
              {item.why}
            </p>
          </div>
        </section>
      )}

      {/* Impact Section */}
      {item.impact && formatImpact(item.impact) && (
        <section>
          <h3 className="text-xs font-semibold text-[#969696] uppercase tracking-wide mb-2">
            Etki
          </h3>
          <div className="p-3 bg-[#F5F6F8] rounded-lg">
            {formatImpact(item.impact)}
          </div>
        </section>
      )}

      {/* Evidence References - Structured */}
      {item.evidence_refs && item.evidence_refs.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-[#969696] uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Kanıtlar ({item.evidence_refs.length})
          </h3>
          <ul className="space-y-2">
            {item.evidence_refs.map((ref: EvidenceRef, idx: number) => {
              const kindConfig = EVIDENCE_KIND_CONFIG[ref.kind];
              return (
                <li
                  key={ref.ref || idx}
                  className="text-sm text-[#5A5A5A] p-2.5 bg-[#F5F6F8] rounded-lg border border-[#E5E5E5]"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base flex-shrink-0">{kindConfig?.icon || '📎'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[#5A5A5A] truncate">
                        {ref.label}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-[#969696]">
                        <span className="bg-[#F5F6F8] px-1.5 py-0.5 rounded">
                          {kindConfig?.label || ref.kind}
                        </span>
                        {ref.period && (
                          <span className="bg-[#E6F9FF] text-[#0049AA] px-1.5 py-0.5 rounded">
                            {ref.period}
                          </span>
                        )}
                        {ref.account_code && (
                          <span className="bg-[#E6F9FF] text-[#0049AA] px-1.5 py-0.5 rounded font-mono">
                            {ref.account_code}
                          </span>
                        )}
                        {ref.amount !== undefined && (
                          <span className="bg-[#ECFDF5] text-[#00804D] px-1.5 py-0.5 rounded">
                            {new Intl.NumberFormat('tr-TR').format(ref.amount)} TL
                          </span>
                        )}
                      </div>
                    </div>
                    {ref.href && (
                      <Link
                        href={ref.href}
                        className="text-[#0078D0] hover:text-[#0049AA] flex-shrink-0"
                        title="Detay"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Legal Basis (if exists) */}
      {item.legal_basis_refs && item.legal_basis_refs.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-[#969696] uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5" />
            Yasal Dayanak
          </h3>
          <ul className="space-y-1.5">
            {item.legal_basis_refs.map((ref, idx) => (
              <li
                key={idx}
                className="text-sm text-[#5A5A5A] p-2 bg-[#E6F9FF] rounded"
              >
                {ref}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Actions - Use id instead of deprecated action field */}
      {item.actions && item.actions.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-[#969696] uppercase tracking-wide mb-2">
            Önerilen Aksiyonlar
          </h3>
          <div className="flex flex-col gap-2">
            {item.actions.map((action, idx) => {
              const variant = action.variant || 'secondary';
              const baseClasses =
                'flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors';
              const variantClasses = {
                primary: 'bg-[#0049AA] text-white hover:bg-[#0049AA]',
                secondary: 'bg-[#F5F6F8] text-[#5A5A5A] hover:bg-[#E5E5E5]',
                danger: 'bg-[#BF192B] text-white hover:bg-[#BF192B]',
              };

              // Use action.id (new contract) or fallback to action.action (legacy)
              const actionId = action.id || action.action || '';

              return (
                <button
                  key={actionId || idx}
                  className={`${baseClasses} ${variantClasses[variant]}`}
                  onClick={() => {
                    onAction?.(item, actionId);
                  }}
                >
                  {action.label}
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Metadata */}
      <section className="pt-4 border-t border-[#E5E5E5]">
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-[#969696]">Kart ID</dt>
            <dd className="font-mono text-[#5A5A5A]">{item.id}</dd>
          </div>
          <div>
            <dt className="text-[#969696]">Skor</dt>
            <dd className="font-semibold text-[#5A5A5A]">{item.score}</dd>
          </div>
          {item.created_at && (
            <div className="col-span-2">
              <dt className="text-[#969696]">Oluşturulma</dt>
              <dd className="text-[#5A5A5A]">{item.created_at}</dd>
            </div>
          )}
        </dl>
      </section>
    </div>
  );
}
