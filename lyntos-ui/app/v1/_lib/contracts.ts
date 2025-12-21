import fs from "node:fs";
import path from "node:path";

type AnyObj = Record<string, any>;

function publicContractsDir() {
  return path.join(process.cwd(), "public", "contracts");
}

export function existsPublicContracts(): boolean {
  return fs.existsSync(publicContractsDir());
}

export function listContractFiles(): string[] {
  const dir = publicContractsDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => !f.startsWith("."));
}

export function readJson<T = AnyObj>(filename: string): T | null {
  try {
    const p = path.join(publicContractsDir(), filename);
    const raw = fs.readFileSync(p, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function fileMtimeISO(filename: string): string | null {
  try {
    const p = path.join(publicContractsDir(), filename);
    const st = fs.statSync(p);
    return new Date(st.mtimeMs).toISOString().replace("T", " ").slice(0, 19);
  } catch {
    return null;
  }
}

export function findLatestArtifact(regex: RegExp): { name: string; mtime: number } | null {
  const dir = publicContractsDir();
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter((f) => regex.test(f));
  if (!files.length) return null;
  let best: { name: string; mtime: number } | null = null;
  for (const f of files) {
    const st = fs.statSync(path.join(dir, f));
    const m = st.mtimeMs;
    if (!best || m > best.mtime) best = { name: f, mtime: m };
  }
  return best;
}

export function safeArr<T = any>(x: any): T[] {
  return Array.isArray(x) ? x : [];
}

export function pickPeriod(obj: AnyObj | null): string {
  if (!obj) return "—";
  return obj.period || obj.meta?.period || obj.header?.period || "—";
}

export function pickGenerated(obj: AnyObj | null, fallbackFromFile: string | null): string {
  if (!obj) return fallbackFromFile || "—";
  return obj.generated_at || obj.meta?.generated_at || obj.header?.generated_at || fallbackFromFile || "—";
}

export function pickCustomers(portfolio: AnyObj | null): AnyObj[] {
  if (!portfolio) return [];
  const c1 = safeArr(portfolio.customers);
  const c2 = safeArr(portfolio.items);
  const c3 = safeArr(portfolio.portfolio);
  return (c1.length ? c1 : c2.length ? c2 : c3) as AnyObj[];
}

export function pickRisksFromPortfolio(portfolio: AnyObj | null): AnyObj[] {
  if (!portfolio) return [];
  const r1 = safeArr(portfolio.risks);
  const r2 = safeArr(portfolio.critical_risks);
  return (r1.length ? r1 : r2) as AnyObj[];
}

export function normalizeSeverity(x: any): string {
  const s = String(x || "").toUpperCase();
  if (["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(s)) return s;
  return s || "—";
}
