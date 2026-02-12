'use client';

/**
 * Inspector Questions Panel
 * Birleşik müfettiş soruları: Simulator alarm soruları + Kategori bazlı sorular
 * Her soruda "Cevap hazırla" butonu → VDK Inspector Agent
 */

import React, { useState } from 'react';
import {
  MessageSquare,
  Loader2,
  ChevronDown,
  ChevronUp,
  Brain,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { KurganAlarm } from '../../../../_components/vdk-simulator/types';
import type { VdkFullAnalysisData } from '../../../../_hooks/useVdkFullAnalysis';
import { api } from '../../../../_lib/api/client';

// Birleşik soru tipi
export interface MergedQuestion {
  id: string;
  question: string;
  source: 'simulator' | 'category';
  alarm_code?: string;
  category?: string;
  severity: string;
  topic: string;
}

interface InspectorQuestionsPanelProps {
  alarms: KurganAlarm[];
  categoryAnalysis: VdkFullAnalysisData['category_analysis'];
  ttk376: VdkFullAnalysisData['ttk_376'];
  clientId: string;
  period: string;
  onNavigateToAi?: (topic: string) => void;
}

export function InspectorQuestionsPanel({
  alarms,
  categoryAnalysis,
  ttk376,
  clientId,
  period,
  onNavigateToAi,
}: InspectorQuestionsPanelProps) {
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loadingQuestion, setLoadingQuestion] = useState<string | null>(null);
  const [answerErrors, setAnswerErrors] = useState<Record<string, string>>({});

  // Soruları birleştir
  const mergedQuestions = mergeQuestions(alarms, categoryAnalysis, ttk376);

  const handleAskQuestion = async (q: MergedQuestion) => {
    // Toggle expand
    if (expandedQuestion === q.id) {
      setExpandedQuestion(null);
      return;
    }

    setExpandedQuestion(q.id);

    // Eğer zaten cevap varsa tekrar çağırma
    if (answers[q.id]) return;

    setLoadingQuestion(q.id);
    setAnswerErrors((prev) => ({ ...prev, [q.id]: '' }));

    try {
      const params = new URLSearchParams({
        client_id: clientId,
        period: period,
        question: q.question,
      });
      if (q.alarm_code) params.set('alarm_code', q.alarm_code);
      if (q.category) params.set('category', q.category);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await api.post<any>(`/api/v1/vdk-inspector/answer`, null, {
        params: Object.fromEntries(params),
      });

      if (!res.ok) {
        throw new Error(res.error || 'HTTP hatası');
      }

      if (res.data?.answer) {
        setAnswers((prev) => ({ ...prev, [q.id]: res.data.answer }));
      } else {
        throw new Error('Beklenmeyen yanıt');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Hata oluştu';
      setAnswerErrors((prev) => ({ ...prev, [q.id]: msg }));
    } finally {
      setLoadingQuestion(null);
    }
  };

  if (mergedQuestions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#2E2E2E] flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#E67324]" />
          Müfettiş Soruları
        </h3>
        <span className="text-sm text-[#969696]">
          {mergedQuestions.length} soru
        </span>
      </div>

      <div className="space-y-2">
        {mergedQuestions.map((q) => {
          const isExpanded = expandedQuestion === q.id;
          const isLoading = loadingQuestion === q.id;
          const answer = answers[q.id];
          const error = answerErrors[q.id];

          return (
            <div
              key={q.id}
              className="border border-[#E5E5E5] rounded-lg overflow-hidden"
            >
              {/* Soru Başlığı */}
              <button
                onClick={() => handleAskQuestion(q)}
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-[#F5F6F8] transition-colors"
              >
                <MessageSquare
                  className="w-4 h-4 flex-shrink-0 mt-0.5"
                  style={{
                    color:
                      q.severity === 'critical'
                        ? '#BF192B'
                        : q.severity === 'high'
                          ? '#E67324'
                          : '#F5A623',
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#2E2E2E]">{q.question}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {q.alarm_code && (
                      <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#FEF2F2] text-[#BF192B] rounded">
                        {q.alarm_code}
                      </span>
                    )}
                    {q.category && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#E6F9FF] text-[#0049AA] rounded">
                        {q.category}
                      </span>
                    )}
                    <span className="text-[10px] text-[#969696]">
                      {q.source === 'simulator' ? 'KURGAN Simülatör' : 'Kategori Analizi'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!answer && !isLoading && (
                    <span className="flex items-center gap-1 text-xs text-[#0049AA]">
                      <Sparkles className="w-3 h-3" />
                      Cevap hazırla
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#969696]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#969696]" />
                  )}
                </div>
              </button>

              {/* AI Cevap Paneli */}
              {isExpanded && (
                <div className="border-t border-[#E5E5E5] bg-[#F8FAFC] p-4">
                  {isLoading && (
                    <div className="flex items-center gap-3 text-sm text-[#5A5A5A]">
                      <Loader2 className="w-4 h-4 animate-spin text-[#0049AA]" />
                      <span>
                        5 uzman perspektifinden cevap hazırlanıyor...
                      </span>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-start gap-2 text-sm text-[#BF192B]">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Hata: {error}</span>
                    </div>
                  )}

                  {answer && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-4 h-4 text-[#0049AA]" />
                        <span className="text-xs font-medium text-[#0049AA]">
                          VDK Inspector Agent - 5 Uzman Perspektifi
                        </span>
                      </div>
                      <div className="text-sm text-[#2E2E2E] whitespace-pre-wrap leading-relaxed">
                        {answer}
                      </div>
                      {onNavigateToAi && (
                        <button
                          onClick={() => onNavigateToAi(q.topic)}
                          className="mt-2 text-xs text-[#0049AA] hover:text-[#00287F] flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          Tam AI analizi için AI Danışman tab&apos;ına git
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// SORU BİRLEŞTİRME FONKSİYONU
// ============================================================================

function mergeQuestions(
  alarms: KurganAlarm[],
  categoryAnalysis: VdkFullAnalysisData['category_analysis'],
  ttk376: VdkFullAnalysisData['ttk_376'],
): MergedQuestion[] {
  const questions: MergedQuestion[] = [];
  const seen = new Set<string>();

  // 1. Simulator alarm soruları (daha spesifik, önce gelir)
  const triggeredAlarms = (alarms || []).filter((a) => a.triggered);
  for (const alarm of triggeredAlarms) {
    for (const q of alarm.inspector_questions || []) {
      const key = q.toLowerCase().slice(0, 50);
      if (seen.has(key)) continue;
      seen.add(key);

      questions.push({
        id: `sim-${alarm.rule_id}-${questions.length}`,
        question: q,
        source: 'simulator',
        alarm_code: alarm.rule_id,
        severity: alarm.severity,
        topic: alarm.rule_id.toLowerCase(),
      });
    }
  }

  // 2. Kategori bazlı sorular
  if (categoryAnalysis?.likidite) {
    const lik = categoryAnalysis.likidite;
    if ((lik.kritik_sayisi || 0) > 0) {
      const q = 'Kasa bakiyeniz neden bu kadar yüksek? Kasa sayım tutanakları var mı?';
      const key = q.toLowerCase().slice(0, 50);
      if (!seen.has(key)) {
        seen.add(key);
        questions.push({
          id: 'cat-likidite',
          question: q,
          source: 'category',
          category: 'Likidite',
          severity: 'high',
          topic: 'kasa',
        });
      }
    }
  }

  if (categoryAnalysis?.ortaklar) {
    const ort = categoryAnalysis.ortaklar;
    if ((ort.kritik_sayisi || 0) > 0) {
      const q = 'Ortaklara verilen borçlar için faiz hesaplanmış mı? TCMB emsal faiz oranı uygulandı mı?';
      const key = q.toLowerCase().slice(0, 50);
      if (!seen.has(key)) {
        seen.add(key);
        questions.push({
          id: 'cat-ortaklar',
          question: q,
          source: 'category',
          category: 'Ortaklar',
          severity: 'high',
          topic: 'ortaklar',
        });
      }
    }
  }

  if (categoryAnalysis?.kdv) {
    const kdv = categoryAnalysis.kdv;
    if ((kdv.uyari_sayisi || 0) > 0) {
      const q = 'Neden uzun süredir KDV devretmektesiniz? KDV iade talebiniz oldu mu?';
      const key = q.toLowerCase().slice(0, 50);
      if (!seen.has(key)) {
        seen.add(key);
        questions.push({
          id: 'cat-kdv',
          question: q,
          source: 'category',
          category: 'KDV',
          severity: 'medium',
          topic: 'kdv',
        });
      }
    }
  }

  if (ttk376 && ttk376.durum !== 'NORMAL') {
    const q = 'Sermaye kaybı durumu için ne gibi önlemler aldınız? TTK 376 uyarınca genel kurul kararı var mı?';
    const key = q.toLowerCase().slice(0, 50);
    if (!seen.has(key)) {
      seen.add(key);
      questions.push({
        id: 'cat-ttk376',
        question: q,
        source: 'category',
        category: 'TTK 376',
        severity: 'high',
        topic: 'ttk376',
      });
    }
  }

  // Fallback: minimum 3 soru
  if (questions.length < 3) {
    const fallbackQ = 'İlişkili taraf işlemleri nasıl fiyatlandırılıyor? Transfer fiyatlandırması dokümantasyonunuz var mı?';
    const key = fallbackQ.toLowerCase().slice(0, 50);
    if (!seen.has(key)) {
      questions.push({
        id: 'cat-transfer',
        question: fallbackQ,
        source: 'category',
        category: 'Transfer Fiyatlandırması',
        severity: 'medium',
        topic: 'transfer',
      });
    }
  }

  // Severity'ye göre sırala: critical > high > medium > low
  const severityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  questions.sort(
    (a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3)
  );

  return questions;
}
