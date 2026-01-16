/**
 * LYNTOS Rule Engine V2 - Core Types
 * Sprint 5.2 - Unified Rule Architecture
 */

// ═══════════════════════════════════════════════════════════════════
// ENUM'LAR
// ═══════════════════════════════════════════════════════════════════

export enum RulePhase {
  INTAKE = 0,    // Veri Doğrulama
  COMPUTE = 1,   // Hesaplamalar
  ANALYZE = 2,   // Risk Analizi
  CROSSCHECK = 3 // Çapraz Kontrol
}

export enum RuleCategory {
  DATA_VALIDATION = 'DATA_VALIDATION',
  INFLATION_ADJUSTMENT = 'INFLATION_ADJUSTMENT',
  DEPRECIATION = 'DEPRECIATION',
  VDK_ANALYSIS = 'VDK_ANALYSIS',
  TAX_COMPLIANCE = 'TAX_COMPLIANCE',
  TRANSFER_PRICING = 'TRANSFER_PRICING',
  RECONCILIATION = 'RECONCILIATION',
  RISK_SCORING = 'RISK_SCORING',
}

export enum Severity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO',
}

export enum RuleStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  TRIGGERED = 'TRIGGERED',
  SKIPPED = 'SKIPPED',
}

// ═══════════════════════════════════════════════════════════════════
// THRESHOLD (ÖNEMLİLİK EŞİĞİ)
// ═══════════════════════════════════════════════════════════════════

export interface Threshold {
  absoluteAmount?: number;  // TL cinsinden
  percentage?: number;      // 0-100 arası
  ratio?: number;           // 0-1 arası
  days?: number;
  count?: number;
  custom?: (value: unknown, context: RuleContext) => boolean;
}

export const DEFAULT_THRESHOLDS = {
  MIN_AMOUNT_DIFF: 100,
  MIN_PERCENTAGE_DIFF: 0.01,
  VDK_KASA_AKTIF_RATIO: 0.05,
  SUPHELI_ALACAK_MIN: 14000,
} as const;

// ═══════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════

export interface MizanAccount {
  kod: string;
  ad: string;
  borc: number;
  alacak: number;
  bakiye: number;
  bakiyeYonu: 'B' | 'A';
}

export interface FinancialPeriod {
  yil: number;
  donem: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'ANNUAL';
  baslangic: string;
  bitis: string;
}

export interface RuleContext {
  taxpayer: { id: string; vkn: string; unvan: string; };
  period: FinancialPeriod;
  smmmId: string;
  mizan: MizanAccount[];
  mizanOzet?: {
    aktifToplam: number;
    pasifToplam: number;
    ozSermaye: number;
    yabanciKaynak: number;
    donemKari: number;
    brutSatislar: number;
  };
  oranlar: {
    faizOranlari: {
      tcmb_ticari_tl: number;
      tcmb_ticari_eur: number;
      tcmb_ticari_usd: number;
    };
    vergiOranlari: {
      kurumlar_vergisi: number;
      kdv_genel: number;
    };
    binekOtoLimitleri: {
      aylik_kira_limiti: number;
      amortisman_limiti: number;
    };
    dovizKurlari: {
      usd_alis: number;
      eur_alis: number;
      usd_efektif_alis: number;
      eur_efektif_alis: number;
    };
  };
  phaseResults?: Map<RulePhase, PhaseResult>;
  executionId: string;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════
// SONUÇLAR
// ═══════════════════════════════════════════════════════════════════

export interface EvidenceRef {
  type: 'mizan' | 'beyanname' | 'fatura' | 'banka' | 'mevzuat' | 'hesaplama';
  source: string;
  value?: unknown;
  tarih?: string;
  aciklama?: string;
}

export interface RuleAction {
  id: string;
  label: string;
  type: 'document' | 'calculation' | 'verification' | 'correction' | 'approval' | 'analysis';
  priority: 'critical' | 'high' | 'medium' | 'low';
  assignee?: 'SMMM' | 'MUKELLEF' | 'SISTEM';
  metadata?: Record<string, unknown>;
}

export interface RuleTriggerOutput {
  severity: Severity;
  title: string;
  summary: string;
  why: string;
  actions: RuleAction[];
  evidenceRefs: EvidenceRef[];
  impact: {
    area: string;
    potentialIssue: string;
    estimatedAmount?: number;
    magnitude: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  tags: string[];
  vdkKriteri?: string;
}

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  status: RuleStatus;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  triggered: boolean;
  output?: RuleTriggerOutput;
  error?: { code: string; message: string; };
}

export interface PhaseResult {
  phase: RulePhase;
  phaseName: string;
  status: 'COMPLETED' | 'FAILED' | 'PARTIAL';
  totalRules: number;
  passedRules: number;
  triggeredRules: number;
  failedRules: number;
  skippedRules: number;
  ruleResults: RuleResult[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
  canProceed: boolean;
  blockingErrors: string[];
}

export interface EngineExecutionResult {
  executionId: string;
  taxpayerId: string;
  period: string;
  status: 'COMPLETED' | 'FAILED' | 'PARTIAL';
  phases: PhaseResult[];
  summary: {
    totalRules: number;
    executedRules: number;
    triggeredRules: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
}

// ═══════════════════════════════════════════════════════════════════
// KURAL INTERFACE
// ═══════════════════════════════════════════════════════════════════

export interface IRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: RuleCategory;
  readonly phase: RulePhase;
  readonly tags: string[];
  readonly dependencies: string[];
  readonly threshold: Threshold;
  readonly enabled: boolean;
  readonly vdkKriteri?: string;
  readonly legalRefs: string[];

  evaluate(context: RuleContext): Promise<RuleTriggerOutput | null>;
  canExecute(context: RuleContext): boolean;
  meetsThreshold(value: unknown, context: RuleContext): boolean;
}

// ═══════════════════════════════════════════════════════════════════
// BASE RULE CLASS
// ═══════════════════════════════════════════════════════════════════

export abstract class BaseRule implements IRule {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly category: RuleCategory;
  abstract readonly phase: RulePhase;
  abstract readonly tags: string[];
  abstract readonly dependencies: string[];
  abstract readonly threshold: Threshold;
  abstract readonly legalRefs: string[];

  readonly enabled: boolean = true;
  readonly vdkKriteri?: string;

  protected abstract executeLogic(context: RuleContext): Promise<RuleTriggerOutput | null>;

  async evaluate(context: RuleContext): Promise<RuleTriggerOutput | null> {
    if (!this.enabled) return null;
    if (!this.canExecute(context)) {
      throw new Error(`Rule ${this.id}: Dependencies not met`);
    }
    return this.executeLogic(context);
  }

  canExecute(context: RuleContext): boolean {
    if (this.dependencies.length === 0) return true;
    const previousPhaseResult = context.phaseResults?.get(this.phase - 1 as RulePhase);
    if (!previousPhaseResult) return this.phase === RulePhase.INTAKE;
    return this.dependencies.every(depId => {
      const depResult = previousPhaseResult.ruleResults.find(r => r.ruleId === depId);
      return depResult && (depResult.status === RuleStatus.PASSED || depResult.status === RuleStatus.TRIGGERED);
    });
  }

  meetsThreshold(value: unknown, context: RuleContext): boolean {
    const t = this.threshold;
    if (t.custom) return t.custom(value, context);
    if (t.absoluteAmount !== undefined && typeof value === 'number') {
      if (Math.abs(value) < t.absoluteAmount) return false;
    }
    if (t.ratio !== undefined && typeof value === 'number') {
      if (Math.abs(value) < t.ratio) return false;
    }
    return true;
  }

  protected getAccountBalance(mizan: MizanAccount[], kodPattern: string): number {
    return mizan
      .filter(h => h.kod.startsWith(kodPattern))
      .reduce((sum, h) => sum + (h.bakiyeYonu === 'B' ? h.bakiye : -h.bakiye), 0);
  }

  protected getAccount(mizan: MizanAccount[], kod: string): MizanAccount | undefined {
    return mizan.find(h => h.kod === kod);
  }

  protected formatTL(value: number): string {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
  }
}

// ═══════════════════════════════════════════════════════════════════
// ENGINE CONFIG
// ═══════════════════════════════════════════════════════════════════

export interface EngineConfig {
  stopOnPhase0Failure: boolean;
  maxParallelRules: number;
  ruleTimeoutMs: number;
  debugMode: boolean;
  enabledCategories?: RuleCategory[];
  enabledPhases?: RulePhase[];
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  stopOnPhase0Failure: true,
  maxParallelRules: 10,
  ruleTimeoutMs: 30000,
  debugMode: false,
};
