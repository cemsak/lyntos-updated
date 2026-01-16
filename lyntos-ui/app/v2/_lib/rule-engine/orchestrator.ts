/**
 * LYNTOS Rule Engine V2 - Orchestrator
 * Sprint 5.2 - Unified Rule Architecture
 */

import {
  IRule,
  RulePhase,
  RuleStatus,
  RuleContext,
  RuleResult,
  PhaseResult,
  EngineExecutionResult,
  EngineConfig,
  DEFAULT_ENGINE_CONFIG,
  Severity,
  RuleTriggerOutput,
} from './types';

// ═══════════════════════════════════════════════════════════════════
// RULE REGISTRY
// ═══════════════════════════════════════════════════════════════════

class RuleRegistry {
  private rules: Map<string, IRule> = new Map();
  private rulesByPhase: Map<RulePhase, IRule[]> = new Map();

  constructor() {
    [RulePhase.INTAKE, RulePhase.COMPUTE, RulePhase.ANALYZE, RulePhase.CROSSCHECK].forEach(phase => {
      this.rulesByPhase.set(phase, []);
    });
  }

  register(rule: IRule): void {
    if (this.rules.has(rule.id)) {
      console.warn(`Rule ${rule.id} already registered, skipping`);
      return;
    }
    this.rules.set(rule.id, rule);
    this.rulesByPhase.get(rule.phase)?.push(rule);
  }

  registerAll(rules: IRule[]): void {
    rules.forEach(rule => this.register(rule));
  }

  get(id: string): IRule | undefined {
    return this.rules.get(id);
  }

  getByPhase(phase: RulePhase): IRule[] {
    return this.rulesByPhase.get(phase) || [];
  }

  getAll(): IRule[] {
    return Array.from(this.rules.values());
  }

  get count(): number {
    return this.rules.size;
  }

  getSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    this.rulesByPhase.forEach((rules, phase) => {
      summary[`Phase ${phase}`] = rules.length;
    });
    return summary;
  }
}

export const ruleRegistry = new RuleRegistry();

// ═══════════════════════════════════════════════════════════════════
// ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════

export class RuleEngineOrchestrator {
  private config: EngineConfig;
  private registry: RuleRegistry;

  constructor(config: Partial<EngineConfig> = {}) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
    this.registry = ruleRegistry;
  }

  async execute(context: RuleContext): Promise<EngineExecutionResult> {
    const startTime = Date.now();
    const executionId = context.executionId || `exec-${Date.now()}`;

    console.log(`🚀 [RuleEngine] Starting: ${executionId}`);
    console.log(`📊 [RuleEngine] Total rules: ${this.registry.count}`);

    const phases: PhaseResult[] = [];
    let overallStatus: 'COMPLETED' | 'FAILED' | 'PARTIAL' = 'COMPLETED';

    const phaseOrder = [RulePhase.INTAKE, RulePhase.COMPUTE, RulePhase.ANALYZE, RulePhase.CROSSCHECK];

    for (const phase of phaseOrder) {
      console.log(`\n═══ PHASE ${phase} ═══`);

      const phaseResult = await this.executePhase(phase, context);
      phases.push(phaseResult);

      if (!context.phaseResults) context.phaseResults = new Map();
      context.phaseResults.set(phase, phaseResult);

      if (phase === RulePhase.INTAKE && !phaseResult.canProceed && this.config.stopOnPhase0Failure) {
        console.error(`❌ Phase 0 failed, stopping`);
        overallStatus = 'FAILED';
        break;
      }

      if (!phaseResult.canProceed) {
        overallStatus = 'PARTIAL';
      }
    }

    const summary = this.calculateSummary(phases);
    const riskScore = this.calculateRiskScore(phases);

    return {
      executionId,
      taxpayerId: context.taxpayer.id,
      period: `${context.period.yil}-${context.period.donem}`,
      status: overallStatus,
      phases,
      summary,
      riskScore,
      riskLevel: this.getRiskLevel(riskScore),
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      totalDurationMs: Date.now() - startTime,
    };
  }

  private async executePhase(phase: RulePhase, context: RuleContext): Promise<PhaseResult> {
    const startTime = Date.now();
    const rules = this.registry.getByPhase(phase).filter(r => r.enabled);

    console.log(`📋 [Phase ${phase}] ${rules.length} rules`);

    const ruleResults: RuleResult[] = [];
    const blockingErrors: string[] = [];

    for (const rule of this.sortByDependencies(rules)) {
      const result = await this.executeRule(rule, context);
      ruleResults.push(result);

      if (result.status === RuleStatus.FAILED && result.error) {
        blockingErrors.push(`${rule.id}: ${result.error.message}`);
      }
    }

    const stats = this.calculatePhaseStats(ruleResults);

    return {
      phase,
      phaseName: this.getPhaseName(phase),
      status: stats.failedRules > 0 ? 'FAILED' : stats.triggeredRules > 0 ? 'PARTIAL' : 'COMPLETED',
      totalRules: rules.length,
      passedRules: stats.passedRules,
      triggeredRules: stats.triggeredRules,
      failedRules: stats.failedRules,
      skippedRules: stats.skippedRules,
      ruleResults,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      canProceed: blockingErrors.length === 0,
      blockingErrors,
    };
  }

  private async executeRule(rule: IRule, context: RuleContext): Promise<RuleResult> {
    const startTime = Date.now();
    console.log(`  ▶ [${rule.id}] ${rule.name}...`);

    try {
      if (!rule.canExecute(context)) {
        console.log(`  ⏭ [${rule.id}] Skipped`);
        return this.createRuleResult(rule, RuleStatus.SKIPPED, startTime);
      }

      const output = await Promise.race([
        rule.evaluate(context),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.config.ruleTimeoutMs)
        ),
      ]);

      if (output) {
        console.log(`  ⚠ [${rule.id}] TRIGGERED (${output.severity})`);
        return this.createRuleResult(rule, RuleStatus.TRIGGERED, startTime, output);
      }

      console.log(`  ✓ [${rule.id}] Passed`);
      return this.createRuleResult(rule, RuleStatus.PASSED, startTime);

    } catch (error) {
      console.error(`  ✗ [${rule.id}] FAILED`);
      return this.createRuleResult(rule, RuleStatus.FAILED, startTime, undefined, error);
    }
  }

  private createRuleResult(
    rule: IRule,
    status: RuleStatus,
    startTime: number,
    output?: RuleTriggerOutput,
    error?: unknown
  ): RuleResult {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      status,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      triggered: status === RuleStatus.TRIGGERED,
      output: output || undefined,
      error: error ? { code: 'ERROR', message: error instanceof Error ? error.message : 'Unknown' } : undefined,
    };
  }

  private sortByDependencies(rules: IRule[]): IRule[] {
    const ruleMap = new Map(rules.map(r => [r.id, r]));
    const visited = new Set<string>();
    const result: IRule[] = [];

    const visit = (rule: IRule) => {
      if (visited.has(rule.id)) return;
      visited.add(rule.id);
      for (const depId of rule.dependencies) {
        const dep = ruleMap.get(depId);
        if (dep) visit(dep);
      }
      result.push(rule);
    };

    rules.forEach(rule => visit(rule));
    return result;
  }

  private calculatePhaseStats(results: RuleResult[]) {
    return {
      passedRules: results.filter(r => r.status === RuleStatus.PASSED).length,
      triggeredRules: results.filter(r => r.status === RuleStatus.TRIGGERED).length,
      failedRules: results.filter(r => r.status === RuleStatus.FAILED).length,
      skippedRules: results.filter(r => r.status === RuleStatus.SKIPPED).length,
    };
  }

  private calculateSummary(phases: PhaseResult[]) {
    const all = phases.flatMap(p => p.ruleResults);
    const triggered = all.filter(r => r.triggered && r.output);

    return {
      totalRules: all.length,
      executedRules: all.filter(r => r.status !== RuleStatus.SKIPPED).length,
      triggeredRules: triggered.length,
      criticalCount: triggered.filter(r => r.output?.severity === Severity.CRITICAL).length,
      highCount: triggered.filter(r => r.output?.severity === Severity.HIGH).length,
      mediumCount: triggered.filter(r => r.output?.severity === Severity.MEDIUM).length,
      lowCount: triggered.filter(r => r.output?.severity === Severity.LOW).length,
    };
  }

  private calculateRiskScore(phases: PhaseResult[]): number {
    const triggered = phases.flatMap(p => p.ruleResults).filter(r => r.triggered && r.output);
    if (triggered.length === 0) return 0;

    const weights: Record<Severity, number> = {
      [Severity.CRITICAL]: 30,
      [Severity.HIGH]: 20,
      [Severity.MEDIUM]: 10,
      [Severity.LOW]: 3,
      [Severity.INFO]: 1,
    };

    let score = 0;
    for (const r of triggered) {
      if (r.output?.severity) score += weights[r.output.severity] || 0;
    }

    return Math.min(100, score);
  }

  private getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 70) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 25) return 'MEDIUM';
    return 'LOW';
  }

  private getPhaseName(phase: RulePhase): string {
    const names: Record<RulePhase, string> = {
      [RulePhase.INTAKE]: 'Data Validation',
      [RulePhase.COMPUTE]: 'Calculations',
      [RulePhase.ANALYZE]: 'Risk Analysis',
      [RulePhase.CROSSCHECK]: 'Cross-Checks',
    };
    return names[phase];
  }
}

export const ruleEngine = new RuleEngineOrchestrator();
