'use client';

import React, { useState, useMemo } from 'react';
import {
  HelpCircle,
  X,
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Shield,
  Clock,
  FileSearch,
  MessageSquare,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { Card } from '../shared/Card';
import { Badge, TrustBadge } from '../shared/Badge';
import { PanelState } from '../shared/PanelState';
import { ExplainModal } from '../kpi/ExplainModal';
import { useFailSoftFetch } from '../hooks/useFailSoftFetch';
import { ENDPOINTS } from '../contracts/endpoints';
import { normalizeToEnvelope } from '../contracts/map';
import type { PanelEnvelope } from '../contracts/envelope';
import {
  KURGAN_AKSIYON_ACIKLAMALARI,
  KURGAN_SCENARIOS,
} from '../../../../lib/rules/kurgan-scenarios';
import type { KurganAksiyon } from '../../../../lib/types/vdk-types';

// SMMM Context Info for KURGAN Panel
const KURGAN_SMMM_INFO = {
  title: 'KURGAN Sistemi Nedir?',
  description: 'Kurulus Gozetimli Risk Analiz Sistemi',
  context: [
    'KURGAN, VDK tarafindan 1 Ekim 2025 itibariyle aktif edilmistir.',
    'Islemlere risk puani atar (mukellefe degil!). Yuksek riskli islemler tespit edildiginde mukellefe "KURGAN yazisi" gonderilir.',
    'ONEMLI: 1 Ekim 2025 sonrasi "bilmiyordum" savunmasi gecersizdir!',
    'KURGAN 16 farkli senaryo uzerinden risk analizi yapar.',
    'Her senaryo icin farkli aksiyon tipleri vardir: Takip, Bilgi Isteme, Izaha Davet, Inceleme.',
  ],
  aksiyonlar: [
    { tip: 'TAKIP', aciklama: 'Sistem izliyor, henuz aksiyon yok', sure: 'Suresiz', color: 'bg-blue-50 text-blue-700' },
    { tip: 'BILGI_ISTEME', aciklama: 'VDK bilgi/belge isteyecek', sure: '15 gun', color: 'bg-amber-50 text-amber-700' },
    { tip: 'IZAHA_DAVET', aciklama: 'VUK 370 kapsaminda izahat', sure: '30 gun', color: 'bg-orange-50 text-orange-700' },
    { tip: 'INCELEME', aciklama: 'Dogrudan vergi incelemesi', sure: 'Derhal', color: 'bg-red-50 text-red-700' },
  ],
  actions: [
    'Tetiklenen senaryolari inceleyip kok nedenleri belirleyin',
    'Her senaryo icin gerekli belgeleri hazirlayin',
    'Riskli saticilari tespit edip alternatif tedarikci arayin',
    'Odeme belgelerinizi guncel tutun (banka dekontlari)',
    'Stok hareketlerinizi duzenli takip edin',
  ],
};

// Types
interface KurganTriggeredScenario {
  id: string;
  senaryo_id: string;
  senaryo_ad: string;
  tetiklenen_kosullar: string[];
  risk_puani: number;
  aksiyon: KurganAksiyon;
  sure: string | null;
  aciklama?: string;
  oneriler?: string[];
  ilgili_belgeler?: string[];
}

interface KurganSummary {
  toplam_senaryo: number;
  tetiklenen_senaryo: number;
  risk_dagilimi: {
    inceleme: number;
    izaha_davet: number;
    bilgi_isteme: number;
    takip: number;
  };
  ortalama_risk: number;
  en_yuksek_risk: number;
}

interface KurganResult {
  summary: KurganSummary;
  triggered_scenarios: KurganTriggeredScenario[];
  last_check: string;
  system_status: 'active' | 'inactive' | 'maintenance';
}

// Normalizer
function normalizeKurgan(raw: unknown): PanelEnvelope<KurganResult> {
  return normalizeToEnvelope<KurganResult>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;

    const scenariosRaw = data?.triggered_scenarios || data?.scenarios || data?.alerts || [];
    const triggeredScenarios: KurganTriggeredScenario[] = Array.isArray(scenariosRaw)
      ? scenariosRaw.map((s: Record<string, unknown>, idx: number) => ({
          id: String(s.id || `krg-triggered-${idx}`),
          senaryo_id: String(s.senaryo_id || s.scenario_id || s.code || `KRG-${idx + 1}`),
          senaryo_ad: String(s.senaryo_ad || s.scenario_name || s.name || s.title || 'Senaryo'),
          tetiklenen_kosullar: Array.isArray(s.tetiklenen_kosullar || s.triggered_conditions)
            ? ((s.tetiklenen_kosullar || s.triggered_conditions) as unknown[]).map((x: unknown) => String(x))
            : [],
          risk_puani: typeof s.risk_puani === 'number' ? s.risk_puani
            : typeof s.risk_score === 'number' ? s.risk_score
            : typeof s.score === 'number' ? s.score : 50,
          aksiyon: mapAksiyon(s.aksiyon || s.action),
          sure: s.sure ? String(s.sure) : s.deadline ? String(s.deadline) : null,
          aciklama: s.aciklama ? String(s.aciklama) : s.description ? String(s.description) : undefined,
          oneriler: Array.isArray(s.oneriler || s.recommendations)
            ? ((s.oneriler || s.recommendations) as unknown[]).map((x: unknown) => String(x))
            : undefined,
          ilgili_belgeler: Array.isArray(s.ilgili_belgeler || s.related_docs)
            ? ((s.ilgili_belgeler || s.related_docs) as unknown[]).map((x: unknown) => String(x))
            : undefined,
        }))
      : [];

    const summaryRaw = data?.summary as Record<string, unknown> | undefined;
    const riskDagilimi = summaryRaw?.risk_dagilimi as Record<string, number> | undefined;

    const summary: KurganSummary = {
      toplam_senaryo: typeof summaryRaw?.toplam_senaryo === 'number' ? summaryRaw.toplam_senaryo : 16,
      tetiklenen_senaryo: typeof summaryRaw?.tetiklenen_senaryo === 'number'
        ? summaryRaw.tetiklenen_senaryo
        : triggeredScenarios.length,
      risk_dagilimi: {
        inceleme: riskDagilimi?.inceleme ?? triggeredScenarios.filter(s => s.aksiyon === 'INCELEME').length,
        izaha_davet: riskDagilimi?.izaha_davet ?? triggeredScenarios.filter(s => s.aksiyon === 'IZAHA_DAVET').length,
        bilgi_isteme: riskDagilimi?.bilgi_isteme ?? triggeredScenarios.filter(s => s.aksiyon === 'BILGI_ISTEME').length,
        takip: riskDagilimi?.takip ?? triggeredScenarios.filter(s => s.aksiyon === 'TAKIP').length,
      },
      ortalama_risk: typeof summaryRaw?.ortalama_risk === 'number'
        ? summaryRaw.ortalama_risk
        : triggeredScenarios.length > 0
          ? Math.round(triggeredScenarios.reduce((sum, s) => sum + s.risk_puani, 0) / triggeredScenarios.length)
          : 0,
      en_yuksek_risk: typeof summaryRaw?.en_yuksek_risk === 'number'
        ? summaryRaw.en_yuksek_risk
        : Math.max(...triggeredScenarios.map(s => s.risk_puani), 0),
    };

    return {
      summary,
      triggered_scenarios: triggeredScenarios,
      last_check: data?.last_check ? String(data.last_check) : new Date().toISOString(),
      system_status: mapSystemStatus(data?.system_status),
    };
  });
}

function mapAksiyon(a: unknown): KurganAksiyon {
  const str = String(a).toUpperCase().replace(/-/g, '_');
  if (str.includes('INCELEME') || str === 'EXAMINATION') return 'INCELEME';
  if (str.includes('IZAHA') || str === 'EXPLANATION') return 'IZAHA_DAVET';
  if (str.includes('BILGI') || str === 'INFO_REQUEST') return 'BILGI_ISTEME';
  return 'TAKIP';
}

function mapSystemStatus(s: unknown): KurganResult['system_status'] {
  const str = String(s).toLowerCase();
  if (str === 'active' || str === 'aktif') return 'active';
  if (str === 'maintenance' || str === 'bakim') return 'maintenance';
  return 'inactive';
}

// Aksiyon Icon Map
const AKSIYON_ICONS: Record<KurganAksiyon, React.ElementType> = {
  TAKIP: Eye,
  BILGI_ISTEME: FileSearch,
  IZAHA_DAVET: MessageSquare,
  INCELEME: AlertCircle,
};

const AKSIYON_COLORS: Record<KurganAksiyon, { bg: string; text: string; border: string }> = {
  TAKIP: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  BILGI_ISTEME: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  IZAHA_DAVET: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  INCELEME: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

// KURGAN SMMM Info Modal
function KurganInfoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="p-4 flex items-center justify-between bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-100">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-800">{KURGAN_SMMM_INFO.title}</h2>
              <p className="text-sm text-slate-600">{KURGAN_SMMM_INFO.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* System Status Banner */}
          <div className="bg-red-100 border border-red-300 rounded-lg p-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm font-medium text-red-800">
              KURGAN sistemi 1 Ekim 2025 itibariyle AKTIF! "Bilmiyordum" savunmasi gecersiz.
            </p>
          </div>

          {/* Context */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">KURGAN Hakkinda</h3>
            <ul className="space-y-2">
              {KURGAN_SMMM_INFO.context.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <Shield className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Aksiyon Tipleri */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Aksiyon Tipleri</h3>
            <div className="space-y-2">
              {KURGAN_SMMM_INFO.aksiyonlar.map((aksiyon, i) => (
                <div key={i} className={`p-2 rounded text-sm ${aksiyon.color}`}>
                  <div className="flex items-center justify-between">
                    <strong>{aksiyon.tip.replace('_', ' ')}</strong>
                    <span className="text-xs">{aksiyon.sure}</span>
                  </div>
                  <p className="text-xs mt-1 opacity-80">{aksiyon.aciklama}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              SMMM Olarak Ne Yapmalisiniz?
            </h3>
            <ul className="space-y-1">
              {KURGAN_SMMM_INFO.actions.map((action, i) => (
                <li key={i} className="text-sm text-slate-700 pl-4 border-l-2 border-red-300">
                  {action}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Anladim
          </button>
        </div>
      </div>
    </div>
  );
}

// Scenario Card Component
function ScenarioCard({ scenario, isExpanded, onToggle }: {
  scenario: KurganTriggeredScenario;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const aksiyonConfig = KURGAN_AKSIYON_ACIKLAMALARI[scenario.aksiyon];
  const colors = AKSIYON_COLORS[scenario.aksiyon];
  const Icon = AKSIYON_ICONS[scenario.aksiyon];

  // Get full scenario details from KURGAN_SCENARIOS
  const fullScenario = KURGAN_SCENARIOS[scenario.senaryo_id];

  return (
    <div className={`rounded-lg border ${colors.border} overflow-hidden`}>
      {/* Header - Clickable */}
      <button
        onClick={onToggle}
        className={`w-full p-3 flex items-center justify-between ${colors.bg} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.text} bg-white/50`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono ${colors.text}`}>{scenario.senaryo_id}</span>
              <Badge variant={scenario.aksiyon === 'INCELEME' ? 'error' :
                scenario.aksiyon === 'IZAHA_DAVET' ? 'warning' : 'default'}>
                {aksiyonConfig.ad}
              </Badge>
            </div>
            <p className={`text-sm font-medium ${colors.text}`}>{scenario.senaryo_ad}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className={`text-lg font-bold ${colors.text}`}>{scenario.risk_puani}</p>
            <p className="text-xs text-slate-500">Risk Puani</p>
          </div>
          {isExpanded ? (
            <ChevronDown className={`w-5 h-5 ${colors.text}`} />
          ) : (
            <ChevronRight className={`w-5 h-5 ${colors.text}`} />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 bg-white space-y-4">
          {/* Aciklama */}
          {(scenario.aciklama || fullScenario?.aciklama) && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 mb-1">ACIKLAMA</h4>
              <p className="text-sm text-slate-700">{scenario.aciklama || fullScenario?.aciklama}</p>
            </div>
          )}

          {/* Tetiklenen Kosullar */}
          {scenario.tetiklenen_kosullar.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 mb-2">TETIKLENEN KOSULLAR</h4>
              <ul className="space-y-1">
                {scenario.tetiklenen_kosullar.map((kosul, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>{kosul}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Aksiyon Detay */}
          <div className={`p-3 rounded-lg ${colors.bg} ${colors.border} border`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${colors.text}`}>
                Aksiyon: {aksiyonConfig.ad}
              </span>
              {scenario.sure && (
                <span className="flex items-center gap-1 text-xs text-slate-600">
                  <Clock className="w-3 h-3" />
                  Sure: {scenario.sure}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600">{aksiyonConfig.aciklama}</p>
          </div>

          {/* Oneriler */}
          {(scenario.oneriler || fullScenario?.tetikleyiciler) && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 mb-2">NELER YAPMALISINIZ</h4>
              <ul className="space-y-1">
                {(scenario.oneriler || fullScenario?.tetikleyiciler?.slice(0, 3))?.map((oneri: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-green-500">✓</span>
                    <span>{oneri}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Mevzuat */}
          {fullScenario?.mevzuat && (
            <div className="flex flex-wrap gap-1">
              {fullScenario.mevzuat.map((m: string, i: number) => (
                <Badge key={i} variant="default">{m}</Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Main Component
export function KurganAlertPanel() {
  const [showExplain, setShowExplain] = useState(false);
  const [showSmmmInfo, setShowSmmmInfo] = useState(false);
  const [expandedScenarios, setExpandedScenarios] = useState<Set<string>>(new Set());

  const envelope = useFailSoftFetch<KurganResult>(ENDPOINTS.KURGAN_RISK, normalizeKurgan);
  const { status, reason_tr, data, analysis, trust, legal_basis_refs, evidence_refs, meta } = envelope;

  const sortedScenarios = useMemo(() => {
    if (!data?.triggered_scenarios) return [];
    return [...data.triggered_scenarios].sort((a, b) => b.risk_puani - a.risk_puani);
  }, [data?.triggered_scenarios]);

  const toggleScenario = (id: string) => {
    setExpandedScenarios(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const hasHighRisk = data?.summary && (
    data.summary.risk_dagilimi.inceleme > 0 ||
    data.summary.risk_dagilimi.izaha_davet > 0
  );

  return (
    <>
      <Card
        title={
          <span className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-600" />
            KURGAN Risk Analizi
            <button
              onClick={() => setShowSmmmInfo(true)}
              className="text-slate-400 hover:text-red-600 transition-colors"
              title="SMMM Rehberi"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </span>
        }
        subtitle="Kurulus Gozetimli Risk Analiz Sistemi (1 Ekim 2025 Aktif)"
        headerAction={
          data && (
            <div className="flex items-center gap-2">
              {data.system_status === 'active' && (
                <Badge variant="error">AKTIF</Badge>
              )}
              <Badge variant={hasHighRisk ? 'error' : 'success'}>
                {data.summary.tetiklenen_senaryo} / {data.summary.toplam_senaryo} senaryo
              </Badge>
            </div>
          )
        }
      >
        <PanelState status={status} reason_tr={reason_tr}>
          {data && (
            <div className="space-y-4">
              {/* System Status Banner */}
              {data.system_status === 'active' && (
                <div className="bg-red-100 border border-red-300 rounded-lg p-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      KURGAN sistemi 1 Ekim 2025 itibariyle AKTIF!
                    </p>
                    <p className="text-xs text-red-600">
                      Tum islemler anlik olarak izleniyor. "Bilmiyordum" savunmasi gecersiz.
                    </p>
                  </div>
                </div>
              )}

              {/* Risk Summary Cards */}
              <div className="grid grid-cols-4 gap-2">
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-center">
                  <p className="text-2xl font-bold text-red-700">{data.summary.risk_dagilimi.inceleme}</p>
                  <p className="text-xs text-slate-600">Inceleme</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 text-center">
                  <p className="text-2xl font-bold text-orange-700">{data.summary.risk_dagilimi.izaha_davet}</p>
                  <p className="text-xs text-slate-600">Izaha Davet</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
                  <p className="text-2xl font-bold text-amber-700">{data.summary.risk_dagilimi.bilgi_isteme}</p>
                  <p className="text-xs text-slate-600">Bilgi Isteme</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-center">
                  <p className="text-2xl font-bold text-blue-700">{data.summary.risk_dagilimi.takip}</p>
                  <p className="text-xs text-slate-600">Takip</p>
                </div>
              </div>

              {/* Risk Score Summary */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500">Ortalama Risk</p>
                  <p className="text-lg font-bold text-slate-900">{data.summary.ortalama_risk} / 100</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">En Yuksek Risk</p>
                  <p className={`text-lg font-bold ${data.summary.en_yuksek_risk >= 80 ? 'text-red-600' : data.summary.en_yuksek_risk >= 60 ? 'text-orange-600' : 'text-slate-900'}`}>
                    {data.summary.en_yuksek_risk} / 100
                  </p>
                </div>
              </div>

              {/* Triggered Scenarios */}
              {sortedScenarios.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Tetiklenen Senaryolar ({sortedScenarios.length})
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {sortedScenarios.map((scenario) => (
                      <ScenarioCard
                        key={scenario.id}
                        scenario={scenario}
                        isExpanded={expandedScenarios.has(scenario.id)}
                        onToggle={() => toggleScenario(scenario.id)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500">
                  <Shield className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p className="text-sm font-medium text-green-700">Tetiklenen KURGAN senaryosu yok</p>
                  <p className="text-xs text-slate-400">Islemleriniz normal gorunuyor</p>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <TrustBadge trust={trust} />
                {(analysis.expert || analysis.ai || legal_basis_refs.length > 0) && (
                  <button
                    onClick={() => setShowExplain(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Neden? →
                  </button>
                )}
              </div>
            </div>
          )}
        </PanelState>
      </Card>

      <ExplainModal
        isOpen={showExplain}
        onClose={() => setShowExplain(false)}
        title="KURGAN Risk Analizi"
        analysis={analysis}
        trust={trust}
        legalBasisRefs={legal_basis_refs}
        evidenceRefs={evidence_refs}
        meta={meta}
      />

      <KurganInfoModal isOpen={showSmmmInfo} onClose={() => setShowSmmmInfo(false)} />
    </>
  );
}
