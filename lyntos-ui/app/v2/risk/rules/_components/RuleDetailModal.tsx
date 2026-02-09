/**
 * Kural Detay Modal Bileşeni
 * SMMM/YMM kullanıcıları için temiz, anlaşılır görünüm
 */

import { X, Scale, Shield, FileText } from 'lucide-react';
import type { Rule } from '../_types';
import { severityConfig, categoryLabels } from '../_lib/constants';

interface RuleDetailModalProps {
  rule: Rule;
  onClose: () => void;
}

export function RuleDetailModal({ rule, onClose }: RuleDetailModalProps) {
  // Güvenli category render — backend obje dönerse hata vermesin
  const categoryLabel = typeof rule.category === 'string'
    ? (categoryLabels[rule.category] || rule.category)
    : '';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b bg-[#F5F6F8]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-[#5A5A5A] bg-[#E5E5E5] px-2 py-1 rounded">
                {rule.rule_id}
              </span>
              <span className={`text-sm px-2 py-1 rounded border ${severityConfig[rule.severity]?.color}`}>
                {severityConfig[rule.severity]?.label}
              </span>
              {categoryLabel && (
                <span className="text-sm text-[#969696] bg-[#F5F6F8] px-2 py-1 rounded">
                  {categoryLabel}
                </span>
              )}
            </div>
            <button onClick={onClose} className="text-[#969696] hover:text-[#5A5A5A]">
              <X className="w-5 h-5" />
            </button>
          </div>
          <h2 className="text-xl font-bold text-[#2E2E2E]">{rule.name_tr || rule.name}</h2>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Açıklama */}
          {rule.description && (
            <div>
              <h4 className="text-sm font-medium text-[#5A5A5A] mb-2">Açıklama</h4>
              <p className="text-[#5A5A5A]">{rule.description}</p>
            </div>
          )}

          {/* Yasal Dayanak */}
          {rule.legal_refs && rule.legal_refs.length > 0 && (
            <div className="bg-[#E6F9FF] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Scale className="w-4 h-4 text-[#0049AA]" />
                <span className="font-medium text-[#00287F]">Yasal Dayanak</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {rule.legal_refs.map((ref, i) => (
                  <span key={i} className="text-sm bg-white/60 text-[#0049AA] px-3 py-1.5 rounded border border-[#ABEBFF]">
                    {typeof ref === 'string' ? ref : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Müfettiş Soruları */}
          {rule.inspector_questions && rule.inspector_questions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[#5A5A5A] mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Müfettiş Soruları ({rule.inspector_questions.length})
              </h4>
              <div className="space-y-2">
                {rule.inspector_questions.map((q, i) => (
                  <div key={i} className="bg-[#FEF2F2] border-l-4 border-[#FF555F] pl-3 py-2 text-sm text-[#980F30]">
                    {typeof q === 'string' ? q : ''}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gerekli Belgeler */}
          {rule.required_documents && rule.required_documents.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[#5A5A5A] mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Gerekli Belgeler
              </h4>
              <div className="flex flex-wrap gap-2">
                {rule.required_documents.map((doc, i) => (
                  <span key={i} className="text-sm bg-[#F5F6F8] text-[#5A5A5A] px-3 py-1.5 rounded border border-[#E5E5E5]">
                    {typeof doc === 'string' ? doc : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Meta Bilgiler — sadece güncelleme tarihi */}
          <div className="text-xs text-[#969696] pt-4 border-t">
            <span>Son güncelleme: {new Date(rule.updated_at).toLocaleDateString('tr-TR')}</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex gap-3 p-4 border-t bg-[#F5F6F8]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-[#E5E5E5] rounded-lg hover:bg-[#F5F6F8]"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
