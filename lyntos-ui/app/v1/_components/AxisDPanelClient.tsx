"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

type AxisTopAccount = { account_code: string; account_name?: string | null; net: number };
type SelectedTopAccount = {
  item_id: string;
  item_title_tr: string;
  account_code: string;
  account_name?: string | null;
  net: number;
  rank: number;
  group_total_abs: number;
};

type AxisItem = {
  id: string;
  account_prefix?: string;
  title_tr: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  finding_tr?: string | null;
  actions_tr?: string[] | null;
  top_accounts?: AxisTopAccount[] | null;
  required_docs?: { code: string; title_tr?: string | null }[] | null;
};

type TrendKpi = {
  key: string;
  title_tr: string;
  kind: "amount" | "ratio";
  current: number | null;
  prev: number | null;
  delta: number | null;
  delta_pct: number | null;
};

type AxisTrend = {
  mode: "QOQ" | string;
  current_period: string;
  prev_period: string;
  prev_available: boolean;
  reason_tr?: string | null;
  kpis: TrendKpi[];
};

type AxisContract = {
  axis: string;
  title_tr: string;
  period_window?: { period?: string; start_date?: string; end_date?: string };
  items: AxisItem[];
  notes_tr?: string | null;
  trend?: AxisTrend | null;
};

function sevColor(sev: string): string {
  switch (sev) {
    case "CRITICAL":
      return "bg-red-700 text-white";
    case "HIGH":
      return "bg-red-500 text-white";
    case "MEDIUM":
      return "bg-amber-500 text-white";
    case "LOW":
      return "bg-emerald-600 text-white";
    default:
      return "bg-slate-600 text-white";
  }
}

function fmtTL(v: number | null): string {
  if (v === null || !isFinite(v)) return "—";
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(v);
}

function fmtNum(v: number | null, digits = 2): string {
  if (v === null || !isFinite(v)) return "—";
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: digits }).format(v);
}

function fmtPct(v: number | null): string {
  if (v === null || !isFinite(v)) return "—";
  return new Intl.NumberFormat("tr-TR", { style: "percent", maximumFractionDigits: 1 }).format(v);
}

export default function AxisDPanelClient(props: { smmm: string; client: string; period: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [errStatus, setErrStatus] = useState<number | null>(null);
  const [data, setData] = useState<AxisContract | null>(null);

  const url = useMemo(() => {
    const qs = new URLSearchParams({
      smmm: props.smmm,
      client: props.client,
      period: props.period,
    }).toString();
    return `/api/v1/contracts/axis/D?${qs}`;
  }, [props.smmm, props.client, props.period]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    setErrStatus(null);
    try {
      const res = await fetch(url, { cache: "no-store" });
      const txt = await res.text();

      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const j = JSON.parse(txt);
          if (j && typeof j.detail === "string" && j.detail.trim()) msg = j.detail;
        } catch (e) {
        }
        setData(null);
        setErr(msg);
        setErrStatus(res.status);
        return;
      }

      setData(JSON.parse(txt));
      setErrStatus(null);
    } catch (e: any) {
      setData(null);
      setErr(e?.message || "Axis-D load error");
      setErrStatus(null);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void load();
  }, [load]);

  const notesText = useMemo(() => {
    const raw = (data?.notes_tr || "").trim();
    if (!raw) return "";
    // Backend bazen \n string’i gönderebilir, bazen gerçek newline; ikisini de normalize ediyoruz.
    const normalized = raw.replace(/\\n/g, "\n");
    const lines = normalized
      .split(/\r?\n/)
      .filter((l) => !l.trim().startsWith("Trend notu:"));
    return lines.join("\n").trim();
  }, [data?.notes_tr]);


  const periodText = data?.period_window?.period || props.period;

  const trend = data?.trend || null;

  const [selectedAccount, setSelectedAccount] = useState<SelectedTopAccount | null>(null);

  const [copyFeedback, setCopyFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const flashCopyFeedback = useCallback((ok: boolean, msg: string) => {
    setCopyFeedback({ ok, msg });
    window.setTimeout(() => setCopyFeedback(null), 2000);
  }, []);

  const fallbackCopy = useCallback((text: string): boolean => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }, []);


  const closeAccount = useCallback(() => setSelectedAccount(null), []);

  const copyAccountCode = useCallback(async (code: string) => {
    const v = (code || "").trim();
    if (!v) return;

    let ok = false;

    try {
      if (navigator.clipboard && (window as any).isSecureContext) {
        await navigator.clipboard.writeText(v);
        ok = true;
      } else {
        ok = fallbackCopy(v);
      }
    } catch {
      ok = fallbackCopy(v);
    }

    flashCopyFeedback(ok, ok ? "Kopyalandı." : "Kopyalanamadı. Hesap kodunu seçip manuel kopyalayın.");
  }, [fallbackCopy, flashCopyFeedback]);

  useEffect(() => {
    if (!selectedAccount) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAccount();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedAccount, closeAccount]);


  const isMissingMizan = errStatus === 404 || (!!err && err.includes("Mizan dosyası bulunamadı"));

  return (
    <div className="rounded-2xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-base font-semibold">Eksen D — Mizan İncelemesi (Kritik Eksen)</div>
          <div className="text-xs text-slate-600">
            100 Kasa, 131/331, 3xx/4xx krediler, kur farkı/finansman, stok vb. tutarlılık + belgelendirme ekseni.
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Dönem: <span className="font-medium text-slate-700">{periodText}</span>
          </div>
        </div>

        <button className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60" onClick={load} disabled={loading}>
          {loading ? "Yükleniyor..." : "Yenile"}
        </button>
      </div>

      {/* QoQ Trend Band */}
      {!err && trend?.mode === "QOQ" && trend?.kpis?.length ? (
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-700">
              Çeyrek Trend (QoQ): {trend.current_period} ↔ {trend.prev_period}
            </div>
            <div className="text-[11px] text-slate-600">
              Önceki çeyrek: {trend.prev_available ? "var" : "yok / okunamadı"}
            </div>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {trend.kpis.map((k) => {
              const up = (k.delta ?? 0) > 0;
              const down = (k.delta ?? 0) < 0;
              const arrow = up ? "↑" : down ? "↓" : "→";

              const curTxt = k.kind === "ratio" ? fmtNum(k.current, 2) : fmtTL(k.current);
              const prevTxt = k.kind === "ratio" ? fmtNum(k.prev, 2) : fmtTL(k.prev);
              const deltaTxt = k.kind === "ratio" ? fmtNum(k.delta, 2) : fmtTL(k.delta);

              return (
                <div key={k.key} className="rounded-lg border bg-white p-2">
                  <div className="text-[11px] font-semibold text-slate-700">{k.title_tr}</div>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{curTxt}</div>
                      <div className="text-[11px] text-slate-500">Önceki: {prevTxt}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-semibold text-slate-700">
                        {arrow} {deltaTxt}
                      </div>
                      <div className="text-[11px] text-slate-500">{k.kind === "ratio" ? "—" : fmtPct(k.delta_pct)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Notes */}
      {!err && trend?.prev_available === false && trend?.reason_tr ? (
        <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
          {trend.reason_tr}
        </div>
      ) : null}

      {!err && notesText ? (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 whitespace-pre-line">{notesText}</div>
      ) : null}

      {err ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-slate-700">
          <div className="font-semibold">{isMissingMizan ? "Veri Eksik" : "Not"}</div>
          <div className="mt-1">{isMissingMizan ? "Bu dönem için mizan verisi bulunamadı (404). Bu panel mizan dosyası olmadan üretilemez. Veri geldiğinde otomatik düzelecek." : "Axis-D yüklenemedi. Yenile deneyin; devam ederse backend/proxy loglarına bakın."}</div>
          <div className="mt-2 text-xs text-slate-600">Hata: {err}</div>
        </div>
      ) : null}

      {!err && data && data.items?.length ? (
        <div className="mt-3 space-y-2">
          {data.items.map((it) => (
            <div key={it.id} className="rounded-xl bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold">
                  {it.account_prefix ? `${it.account_prefix} — ` : ""}
                  {it.title_tr}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${sevColor(it.severity)}`}>{it.severity}</span>
              </div>

              {it.finding_tr ? <div className="mt-1 text-sm text-slate-700">{it.finding_tr}</div> : null}

              
              <details className="mt-2 rounded-lg border bg-white p-2">
                <summary className="cursor-pointer text-xs font-semibold text-slate-700">Detay</summary>

                {it.top_accounts?.length ? (
                  <div className="mt-2 text-xs text-slate-700">
                    <div className="font-semibold">Top Hesaplar (mizan)</div>
                    <div className="mt-1 text-[11px] text-slate-500">Satıra tıkla: hızlı hesap detayı açılır.</div>
                    <div className="mt-1 overflow-x-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="text-slate-500">
                            <th className="py-1 pr-2">Hesap</th>
                            <th className="py-1 pr-2">Ad</th>
                            <th className="py-1 text-right">Net</th>
                          </tr>
                        </thead>
                        <tbody>
                          {it.top_accounts.map((a, i) => (
                            <tr
                              key={i}
                              className="border-t cursor-pointer hover:bg-slate-50"
                              onClick={() => {
                                const top = it.top_accounts || [];
                                const totalAbs = top.reduce((acc, r) => acc + Math.abs(Number((r as any).net) || 0), 0);
                                setSelectedAccount({
                                  item_id: it.id,
                                  item_title_tr: it.title_tr,
                                  account_code: a.account_code,
                                  account_name: a.account_name,
                                  net: a.net,
                                  rank: i + 1,
                                  group_total_abs: totalAbs,
                                });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  const top = it.top_accounts || [];
                                  const totalAbs = top.reduce((acc, r) => acc + Math.abs(Number((r as any).net) || 0), 0);
                                  setSelectedAccount({
                                    item_id: it.id,
                                    item_title_tr: it.title_tr,
                                    account_code: a.account_code,
                                    account_name: a.account_name,
                                    net: a.net,
                                    rank: i + 1,
                                    group_total_abs: totalAbs,
                                  });
                                }
                              }}
                              tabIndex={0}
                              role="button"
                              aria-label={`Hesap detayı: ${a.account_code}`}
                            >
                              <td className="py-1 pr-2 font-medium">{a.account_code}</td>
                              <td className="py-1 pr-2">{a.account_name || "—"}</td>
                              <td className="py-1 text-right">{fmtTL(a.net)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-[11px] text-slate-500">Top hesap kırılımı üretilemedi. Muhtemel neden: mizan detayı/formatı yetersiz veya hesap kodları beklenen şekilde parse edilemedi. Aksiyon: ilgili dönem mizan dosyasını doğrula, gerekiyorsa yeniden yükle.</div>
                )}

                <div className="mt-2 text-[11px] text-slate-600">
                  Not: Bu ekran “inceleme ekseni”dir; kesin hüküm değildir. Belge-iz mantığıyla hızlı doğrulama sağlar.
                </div>
              </details>

{it.required_docs?.length ? (
                <div className="mt-2 text-xs text-slate-700">
                  <div className="font-semibold">Gerekli Evrak</div>
                  <ul className="list-disc pl-5">
                    {it.required_docs.map((d, i) => (
                      <li key={i}>{d.title_tr || d.code}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {it.actions_tr?.length ? (
                <div className="mt-2 text-xs text-slate-700">
                  <div className="font-semibold">SMMM Aksiyon</div>
                  <ul className="list-disc pl-5">
                    {it.actions_tr.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : !err && data ? (
        <div className="mt-3 text-sm text-slate-600">Axis-D contract geldi ama item yok (veya boş dönüyor).</div>
      ) : null}

          {selectedAccount ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
              role="dialog"
              aria-modal="true"
              onClick={(e) => {
                if (e.currentTarget === e.target) closeAccount();
              }}
            >
              <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {selectedAccount.account_code} — {selectedAccount.account_name || "—"}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-600">
                      Kural: {selectedAccount.item_title_tr} ({selectedAccount.item_id})
                    </div>
                  </div>
                  <button className="rounded-lg border px-3 py-2 text-xs hover:bg-slate-50" onClick={closeAccount}>
                    Kapat
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-[11px] font-semibold text-slate-700">Net</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{fmtTL(selectedAccount.net)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-[11px] font-semibold text-slate-700">Sıra / Pay</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">#{selectedAccount.rank}</div>
                    <div className="mt-1 text-[11px] text-slate-600">
                      Pay:{" "}
                      {selectedAccount.group_total_abs > 0
                        ? fmtPct(Math.abs(selectedAccount.net) / selectedAccount.group_total_abs)
                        : "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-700">
                  <div className="font-semibold">SMMM için hızlı kontrol</div>
                  <ul className="mt-1 list-disc pl-5">
                    <li>Bu hesap kodu için mizan satırını (ve alt hesap kırılımını) doğrula.</li>
                    <li>Bu kalemle ilişkili evrakı “Gerekli Evrak” listesinden dosyala.</li>
                    <li>Hareket detayı (yevmiye/banka) bu sprintte yok; sonraki sprintte “hesap hareketi” ekranına bağlayacağız.</li>
                  </ul>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                    onClick={() => void copyAccountCode(selectedAccount.account_code)}
                  >
                    Hesap kodunu kopyala
                  {copyFeedback ? (
                    <div className={`text-[11px] ${copyFeedback.ok ? "text-emerald-700" : "text-amber-700"}`}>
                      {copyFeedback.msg}
                    </div>
                  ) : null}

                  </button>
                  <button className="rounded-lg border px-3 py-2 text-xs hover:bg-slate-50" onClick={closeAccount}>
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          ) : null}
    </div>
  );
}
