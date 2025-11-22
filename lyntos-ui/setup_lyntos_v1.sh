#!/usr/bin/env bash
set -euo pipefail

echo "==> LYNTOS SMMM v1 kurulumu başlıyor"

have() { command -v "$1" >/dev/null 2>&1; }

pm=""
if have pnpm; then pm="pnpm"
elif have npm; then pm="npm"
else
  echo "HATA: pnpm veya npm bulunamadı. 'brew install node pnpm' ile kur ve yeniden dene." >&2
  exit 1
fi

if [ "$pm" = "pnpm" ]; then
  $pm add -D @tailwindcss/postcss tailwindcss
  $pm add zustand @tanstack/react-query recharts lucide-react jszip html2canvas jspdf zod clsx
else
  $pm install --save zustand @tanstack/react-query recharts lucide-react jszip html2canvas jspdf zod clsx
  $pm install --save-dev @tailwindcss/postcss tailwindcss
fi

mkdir -p src/state src/lib src/rules src/components/charts src/components/ui src/app

cat > src/state/store.ts <<'TS'
import { create } from "zustand";
type Filters = { entity?: string; period?: string };
type FilterState = Filters & { setFilters: (p: Filters) => void };
export const useFilters = create<FilterState>((set) => ({
  entity: "HKOZKAN",
  period: "2025-Q4",
  setFilters: (p) => set(p),
}));
type UIState = { isOpen: boolean; openDrawer: () => void; closeDrawer: () => void; toggleDrawer: () => void; };
export const useUI = create<UIState>((set, get) => ({
  isOpen: false,
  openDrawer: () => set({ isOpen: true }),
  closeDrawer: () => set({ isOpen: false }),
  toggleDrawer: () => set({ isOpen: !get().isOpen }),
}));
type Selection = { partnerId?: string };
type SelectionState = { selection: Selection; pick: (s: Selection) => void; reset: () => void };
export const useSelection = create<SelectionState>((set) => ({
  selection: {},
  pick: (s) => set((st) => ({ selection: { ...st.selection, ...s } })),
  reset: () => set({ selection: {} }),
}));
TS

cat > src/lib/normalize.ts <<'TS'
export type Analyze = ReturnType<typeof normalizeAnalyze>;
function num(n:any,d=0){const x=Number(n);return Number.isFinite(x)?x:d;}
function bool(x:any){return !!x;}
function str(x:any,d="—"){return (x??d) as string;}
export function normalizeAnalyze(json:any, opts?:{demoFill?:boolean}){
  const demo=!!opts?.demoFill;
  const summary=str(json?.summary,"");
  const k=json?.kurgan??{};
  const risk_log=Array.isArray(k?.risk_log)?k.risk_log:(demo?[{donem:"2025-Q2",skor:58},{donem:"2025-Q3",skor:61},{donem:"2025-Q4",skor:62}]:[]);
  const beyan=Array.isArray(k?.beyanname_ozeti)?k.beyanname_ozeti:(demo?[{ad:"KDV Beyannamesi",durum:"Onaylandı",risk:"Düşük"},{ad:"Muhtasar",durum:"Bekliyor",risk:"Orta"},{ad:"Geçici Vergi",durum:"Hazırlanıyor",risk:"Orta"}]:[]);
  const nedenler=Array.isArray(k?.risk_nedenleri)?k.risk_nedenleri:(demo?[{baslik:"Beyan disiplini",etki:"Artırıcı",kanit:"Muhtasar gecikmiş"},{baslik:"Mizan dengesi",etki:"Azaltıcı",kanit:"Borç=Alacak"}]:[]);
  const m=json?.luca?.mizan??{};
  const m_top5=Array.isArray(m?.top5)?m.top5:(demo?[{hesap:"600",ad:"Yurt içi Satışlar",borc:0,alacak:120000,fark:120000},{hesap:"610",ad:"Satıştan İadeler",borc:10000,alacak:0,fark:10000},{hesap:"153",ad:"Ticari Mallar",borc:25000,alacak:0,fark:25000},{hesap:"191",ad:"İndirilecek KDV",borc:18000,alacak:0,fark:18000},{hesap:"740",ad:"Hizmet Üretim",borc:15000,alacak:0,fark:15000}]:[]);
  const partners=Array.isArray(json?.partner_top5)?json.partner_top5:(demo?[{unvan:"Alfa Yazılım",nace:"62.01",kdv_orani:"%20",fatura_sayisi:34,uyum_puani:88},{unvan:"Beta Metal",nace:"24.10",kdv_orani:"%20",fatura_sayisi:22,uyum_puani:51},{unvan:"Gamma Loj.",nace:"49.41",kdv_orani:"%20",fatura_sayisi:16,uyum_puani:74}]:[]);
  const sm=json?.sahte_fatura_riski??{};
  const sm_skor=num(sm?.skor, demo?28:0), sm_durum=str(sm?.durum,demo?"Düşük":"—");
  const sm_ned=Array.isArray(sm?.nedenler)?sm.nedenler:(demo?[{neden:"Faaliyet uyumu",etki:"Azaltıcı",kanit:"Uygun",oneri:"Tedarikçi kontrolü"},{neden:"Riskli karşı taraf",etki:"Artırıcı",kanit:"2 tedarikçi",oneri:"BA/BS mutabakatı"}]:[]);
  const sm_ex=Array.isArray(sm?.eksik_veriler)?sm.eksik_veriler:(demo?["1.9_odeme_akisi","1.10_yoklama_tespit"]:[]);
  const radar=json?.radar??{};
  const radar_skor=num(radar?.radar_risk_skoru, demo?64:0), radar_durum=str(radar?.radar_risk_durumu,demo?"Orta":"—");
  const uyum_banka={durum:!!(k?.uyum_kontrol?.banka_mizan_tutarliligi?.durum??(demo?true:false)),detay:str(k?.uyum_kontrol?.banka_mizan_tutarliligi?.detay,demo?"Banka toplamı mizanla uyumlu (demo)":"—")};
  const banka_top=num(json?.banka?.toplam_bakiye, demo?248680.85:0);
  const vdk=json?.vdk_uzmani_yorumu??json?.kurgan?.vdk_yorumu??(demo?"VDK yorumu (demo)":"");
  const ai =json?.ai_analizi??json?.kurgan?.ai_tespiti??(demo?"AI analiz (demo)":"");
  const filters={entity:json?.filters?.entity??"HKOZKAN",period:json?.filters?.period??"2025-Q4"};
  return {
    summary,
    kurgan:{risk_skoru:num(k?.risk_skoru,demo?62:0),risk_durumu:str(k?.risk_durumu,demo?"Orta":"—"),vergi_uyum_endeksi:num(k?.vergi_uyum_endeksi,demo?78:0),risk_nedenleri:nedenler,risk_log,beyanname_ozeti:beyan,uyum_kontrol:{banka_mizan:uyum_banka},karsi_firma:Array.isArray(k?.karsi_firma)?k.karsi_firma:[]},
    luca:{mizan:{top5:m_top5}},
    banka:{toplam:banka_top},
    radar:{skor:radar_skor,durum:radar_durum,nedenler:Array.isArray(radar?.nedenler)?radar.nedenler:[]},
    smiyb:{skor:sm_skor,durum:sm_durum,nedenler:sm_ned,eksik:sm_ex},
    partner_top5:partners,
    vdk, ai, filters
  };
}
TS

cat > src/components/ui/Badge.tsx <<'TSX'
"use client";
export default function Badge({label,tone}:{label:string;tone?:"ok"|"warn"|"error"|"empty"|"demo"}) {
  const map:any={ok:"bg-emerald-50 text-emerald-700 border-emerald-200",warn:"bg-amber-50 text-amber-700 border-amber-200",error:"bg-rose-50 text-rose-700 border-rose-200",empty:"bg-slate-50 text-slate-500 border-slate-200",demo:"bg-indigo-50 text-indigo-700 border-indigo-200"};
  return <span className={"inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs "+(map[tone||"ok"])}>{label}</span>;
}
TSX

cat > src/components/ThemeToggle.tsx <<'TSX'
"use client";
import React from "react";
export default function ThemeToggle(){
  React.useEffect(()=>{try{if(localStorage.getItem("theme")==="dark")document.documentElement.classList.add("dark");}catch{}},[]);
  const toggle=()=>{const el=document.documentElement;const isDark=el.classList.toggle("dark");try{localStorage.setItem("theme",isDark?"dark":"light");}catch{}};
  return <button onClick={toggle} className="rounded-md border px-3 py-1.5 text-xs">Tema</button>;
}
TSX

cat > src/components/ExportBar.tsx <<'TSX'
"use client";
import { useState } from "react";
import JSZip from "jszip";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
function toCSV(rows:any[]){if(!rows?.length)return "";const keys=Array.from(rows.reduce((s,r)=>{Object.keys(r||{}).forEach(k=>s.add(k));return s;},new Set<string>()));const head=keys.join(",");const body=rows.map(r=>keys.map(k=>JSON.stringify(r?.[k]??"")).join(",")).join("\n");return head+"\n"+body+"\n";}
export default function ExportBar({beyan=[],mizanTop5=[],partners=[],evidence=[]}:{beyan?:any[];mizanTop5?:any[];partners?:any[];evidence?:any[];}) {
  const [busy,setBusy]=useState(false);
  const one=(name:string,rows:any[])=>{const blob=new Blob([toCSV(rows)],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();};
  const all=async()=>{setBusy(true);const zip=new JSZip();zip.file("beyan.csv",toCSV(beyan));zip.file("mizan_top5.csv",toCSV(mizanTop5));zip.file("partners.csv",toCSV(partners));zip.file("evidence.csv",toCSV(evidence));const blob=await zip.generateAsync({type:"blob"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="lyntos_export.zip";a.click();setBusy(false);};
  const pdf=async()=>{setBusy(true);const root=document.getElementById("dashboard-root")!;root.classList.add("h2c");const canvas=await html2canvas(root,{useCORS:true,backgroundColor:"#ffffff",scale:2});root.classList.remove("h2c");const pdf=new jsPDF({orientation:"p",unit:"pt",format:"a4"});const pageW=pdf.internal.pageSize.getWidth();const pageH=pdf.internal.pageSize.getHeight();const imgW=pageW;const scale=imgW/canvas.width;const imgH=canvas.height*scale;let yOff=0;const sliceH=pageH-40;while(yOff<imgH){const pageCanvas=document.createElement("canvas");pageCanvas.width=canvas.width;pageCanvas.height=Math.min(canvas.height,Math.ceil(sliceH/scale));const ctx=pageCanvas.getContext("2d")!;ctx.drawImage(canvas,0,yOff/scale,canvas.width,pageCanvas.height,0,0,canvas.width,pageCanvas.height);const pageImg=pageCanvas.toDataURL("image/png");if(yOff>0)pdf.addPage();const drawH=pageCanvas.height*scale;pdf.addImage(pageImg,"PNG",0,20,imgW,drawH,"","FAST");yOff+=sliceH;}pdf.save("lyntos-dashboard.pdf");setBusy(false);};
  return (<div className="flex items-center gap-2">
    <button onClick={()=>one("beyan.csv",beyan)} className="rounded-md border px-3 py-1.5 text-xs">Beyan CSV</button>
    <button onClick={()=>one("mizan_top5.csv",mizanTop5)} className="rounded-md border px-3 py-1.5 text-xs">Mizan Top5 CSV</button>
    <button onClick={()=>one("partners.csv",partners)} className="rounded-md border px-3 py-1.5 text-xs">İş Ortakları CSV</button>
    <button onClick={()=>one("evidence.csv",evidence)} className="rounded-md border px-3 py-1.5 text-xs">Evidence CSV</button>
    <button onClick={all} disabled={busy} className="rounded-md border px-3 py-1.5 text-xs">Tüm CSV (ZIP)</button>
    <button onClick={pdf} disabled={busy} className="rounded-md border px-3 py-1.5 text-xs text-blue-700 border-blue-200 hover:bg-blue-50">PDF</button>
  </div>);
}
TSX

cat > src/components/DataStatus.tsx <<'TSX'
"use client";
import Badge from "@/components/ui/Badge";
export default function DataStatus({data}:{data:any}) {
  const D:any={"kurgan.risk_log":true,"kurgan.beyanname_ozeti":true,"smiyb.skor":true,"radar.skor":true,"mizan.top5":true,"partner_top5":true};
  const checks=[["Risk Log",(data?.kurgan?.risk_log||[]).length>0,D["kurgan.risk_log"]],["Beyan Özet",(data?.kurgan?.beyanname_ozeti||[]).length>0,D["kurgan.beyanname_ozeti"]],["SMİYB",typeof data?.smiyb?.skor==="number",D["smiyb.skor"]],["RADAR",typeof data?.radar?.skor==="number",D["radar.skor"]],["Mizan Top5",(data?.luca?.mizan?.top5||[]).length>0,D["mizan.top5"]],["Partner Top5",(data?.partner_top5||[]).length>0,D["partner_top5"]]];
  return (<div className="flex flex-wrap items-center gap-2 text-xs"><span className="text-slate-500">Veri Durumu:</span>{checks.map(([name,ok,demo]:any,i:number)=>(<Badge key={i} label={`${name}${demo?" (demo)":""}`} tone={ok?(demo?"demo":"ok"):"empty"} />))}</div>);
}
TSX

cat > src/components/charts/RadarGauge.tsx <<'TSX'
"use client";
import { ResponsiveContainer, RadialBarChart, RadialBar } from "recharts";
export default function RadarGauge({value=0}:{value?:number}) {
  const v=Math.max(0,Math.min(100,value));
  const data=[{name:"Skor",value:v,fill:v>=70?"#ef4444":v>=50?"#f59e0b":"#10b981"}];
  return (<div className="w-full" style={{minHeight:220}}>
    <ResponsiveContainer width="100%" height={220} minWidth={0}>
      <RadialBarChart innerRadius="60%" outerRadius="100%" data={data} startAngle={180} endAngle={0}>
        <RadialBar minAngle={15} background clockWise dataKey="value" />
      </RadialBarChart>
    </ResponsiveContainer>
    <div className="mt-2 text-center text-sm font-medium">{v}</div>
  </div>);
}
TSX

cat > src/components/charts/RiskLogLine.tsx <<'TSX'
"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
export default function RiskLogLine({data}:{data:any[]}) {
  return (<div className="w-full" style={{minHeight:220}}>
    <ResponsiveContainer width="100%" height={220} minWidth={0}>
      <LineChart data={data||[]} margin={{left:8,right:8,top:8,bottom:8}}>
        <XAxis dataKey="donem" /><YAxis /><Tooltip />
        <Line type="monotone" dataKey="skor" stroke="#6366f1" strokeWidth={2} dot={false}/>
      </LineChart>
    </ResponsiveContainer>
  </div>);
}
TSX

cat > src/components/charts/TopPartnersPie.tsx <<'TSX'
"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
export default function TopPartnersPie({rows}:{rows:any[]}){
  const colors=["#4f46e5","#06b6d4","#10b981","#f59e0b","#ef4444","#8b5cf6"];
  const data=(rows||[]).slice(0,6).map((r:any)=>({name:r.unvan,value:Number(r.fatura_sayisi||1)}));
  return (<div className="w-full" style={{minHeight:220}}>
    <ResponsiveContainer width="100%" height={220} minWidth={0}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
          {data.map((_,i)=><Cell key={i} fill={colors[i%colors.length]} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  </div>);
}
TSX

cat > src/components/RadarPanel.tsx <<'TSX'
"use client";
import RadarGauge from "@/components/charts/RadarGauge";
export default function RadarPanel({radar,reasons}:{radar:any;reasons:any[]}) {
  return (<div className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 dark:border-slate-700">
    <div className="mb-2 text-sm font-semibold">RADAR Skoru</div>
    <RadarGauge value={radar?.skor||0}/>
    <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
      {reasons?.length? reasons.slice(0,4).map((r:any,i:number)=><div key={i}>• {(r?.neden||r?.baslik||"Sebep")} {(r?.etki?`(${r.etki})`:"")}</div>): "—"}
    </div>
  </div>);
}
TSX

cat > src/components/SmiybPanel.tsx <<'TSX'
"use client";
export default function SmiybPanel({smiyb}:{smiyb:any}) {
  const skor=smiyb?.skor??0, durum=smiyb?.durum??"—";
  const nedenler=smiyb?.nedenler||[], eksik=smiyb?.eksik||[];
  return (<div className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 dark:border-slate-700">
    <div className="mb-1 text-sm font-semibold">SMİYB Skoru: {skor} • {durum}</div>
    <div className="text-xs text-slate-600 dark:text-slate-300">
      {nedenler.slice(0,5).map((n:any,i:number)=><div key={i}>• {n.neden||n.baslik} — {n.etki} {n.kanit?`| Kanıt: ${n.kanit}`:""} {n.oneri?`| Öneri: ${n.oneri}`:""}</div>)}
      {!nedenler.length && "—"}
    </div>
    {eksik?.length ? <div className="mt-2 text-[11px] text-amber-700">Eksik veri: {eksik.slice(0,6).join(", ")}{eksik.length>6?"…":""}</div> : null}
  </div>);
}
TSX

cat > src/components/BeyanOzetPanel.tsx <<'TSX'
"use client";
export default function BeyanOzetPanel({rows}:{rows:any[]}) {
  return (<div className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 dark:border-slate-700">
    <div className="mb-2 text-sm font-semibold">Beyanname Özeti</div>
    <div className="text-xs">{rows?.length? rows.map((r:any,i:number)=><div key={i}>• {r.ad} — {r.durum} (risk: {r.risk||"—"})</div>) : "—"}</div>
  </div>);
}
TSX

cat > src/components/MizanOzetPanel.tsx <<'TSX'
"use client";
export default function MizanOzetPanel({rows}:{rows:any[]}) {
  return (<div className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 dark:border-slate-700">
    <div className="mb-2 text-sm font-semibold">Mizan Özeti (Fark yapan 5 hesap)</div>
    <div className="text-xs">{rows?.length? rows.map((r:any,i:number)=><div key={i}>• {(r.hesap||r.ad||"hesap")} — fark: {r.fark ?? ((r.borc||0)-(r.alacak||0))}</div>) : "—"}</div>
  </div>);
}
TSX

cat > src/components/MizanDrill.tsx <<'TSX'
"use client";
export default function MizanDrill({rows}:{rows:any[]}) {
  return (<div className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 dark:border-slate-700">
    <div className="mb-2 text-sm font-semibold">Mizan Drill-Down</div>
    <div className="text-xs text-slate-600 dark:text-slate-300">Hesap detayları yakında (demo). İlk 5 fark listelendi.</div>
    <ul className="mt-2 list-disc pl-5 text-xs">{(rows||[]).slice(0,5).map((r:any,i:number)=><li key={i}>{(r.hesap||r.ad)} — {r.fark ?? ((r.borc||0)-(r.alacak||0))}</li>)}</ul>
  </div>);
}
TSX

cat > src/components/UyumPanel.tsx <<'TSX'
"use client";
export default function UyumPanel({uyum,banka}:{uyum:any;banka:number}) {
  const b=uyum?.banka_mizan;
  return (<div className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 dark:border-slate-700">
    <div className="mb-2 text-sm font-semibold">Vergi Uyum / Banka–Mizan</div>
    <div className="text-xs">Banka toplamı: ₺{(banka||0).toLocaleString("tr-TR")} • Uyum: {b?.durum? "Evet":"—"}</div>
    <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">{b?.detay||"—"}</div>
  </div>);
}
TSX

cat > src/components/EvidenceTable.tsx <<'TSX'
"use client";
export default function EvidenceTable({kurganReasons=[], smiybReasons=[]}:{kurganReasons:any[]; smiybReasons:any[]}) {
  const rows=[...kurganReasons.map((r:any)=>({kaynak:"KURGAN",neden:r.baslik||r.neden,etki:r.etki,kanit:r.kanit,oneri:r.oneri})),...smiybReasons.map((r:any)=>({kaynak:"SMİYB",neden:r.neden||r.baslik,etki:r.etki,kanit:r.kanit,oneri:r.oneri}))];
  return (<div className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 dark:border-slate-700">
    <div className="mb-2 text-sm font-semibold">Neden – Etki – Kanıt – Öneri</div>
    <div className="overflow-x-auto">
      <table className="w-full text-xs"><thead><tr className="text-left text-slate-500">
        <th className="py-2 pr-3">Kaynak</th><th className="py-2 pr-3">Neden</th><th className="py-2 pr-3">Etki</th><th className="py-2 pr-3">Kanıt</th><th className="py-2">Öneri</th>
      </tr></thead><tbody>
        {rows?.length? rows.map((r:any,i:number)=>(<tr key={i} className="border-t"><td className="py-2 pr-3">{r.kaynak}</td><td className="py-2 pr-3">{r.neden}</td><td className="py-2 pr-3">{r.etki||"—"}</td><td className="py-2 pr-3">{r.kanit||"—"}</td><td className="py-2">{r.oneri||"—"}</td></tr>)) : <tr><td colSpan={5} className="py-4 text-center text-slate-400">—</td></tr>}
      </tbody></table>
    </div>
  </div>);
}
TSX

cat > src/components/PartnerDrawer.tsx <<'TSX'
"use client";
import { useUI } from "@/state/store";
export default function PartnerDrawer({partners=[],evidence=[]}:{partners:any[];evidence:any[]}) {
  const { isOpen, closeDrawer } = useUI();
  if(!isOpen) return null;
  return (<div className="fixed inset-0 z-50">
    <div className="absolute inset-0 bg-black/40" onClick={closeDrawer} />
    <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white p-5 shadow-2xl dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold">İş Ortağı Detayı</div>
        <button onClick={closeDrawer} className="text-xs rounded-md border px-2 py-1">Kapat</button>
      </div>
      <div className="text-xs">{partners?.slice(0,6).map((p:any,i:number)=>(<div key={i} className="border rounded-md p-2 mb-2"><div className="font-medium">{p.unvan}</div><div>NACE: {p.nace||"—"} • Vergi No: {p.vergi_no||"—"} • Uyum: {p.uyum_puani??"—"}</div></div>))}
        <div className="mt-3 text-[11px] text-slate-500">İlgili Evidence listesi: ileriki sürüm.</div>
      </div>
    </div>
  </div>);
}
TSX

grep -q ".h2c *" src/app/globals.css 2>/dev/null || cat >> src/app/globals.css <<'CSS'
.h2c [class*="bg-gradient-to-"] { background-image: none !important; }
.h2c * { background-image: none !important; }
CSS

if [ -f src/app/layout.tsx ]; then cp src/app/layout.tsx src/app/layout.tsx.bak_lyntos || true; fi
cat > src/app/layout.tsx <<'TSX'
import type { Metadata } from "next";
import "./globals.css";
import HeaderBar from "@/components/HeaderBar";
export const metadata: Metadata = { title: "LYNTOS SMMM Panel", description: "Vergi risk, uyum ve radar analizi" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="tr" className="h-full"><body className="min-h-dvh bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900"><HeaderBar />{children}</body></html>);
}
TSX

if [ -f src/app/page.tsx ]; then cp src/app/page.tsx src/app/page.tsx.bak_lyntos || true; fi
cat > src/app/page.tsx <<'TSX'
"use client";
import React from "react";
import { useFilters, useUI } from "@/state/store";
import { normalizeAnalyze } from "@/lib/normalize";
import DataStatus from "@/components/DataStatus";
import RadarPanel from "@/components/RadarPanel";
import SmiybPanel from "@/components/SmiybPanel";
import BeyanOzetPanel from "@/components/BeyanOzetPanel";
import MizanOzetPanel from "@/components/MizanOzetPanel";
import MizanDrill from "@/components/MizanDrill";
import UyumPanel from "@/components/UyumPanel";
import EvidenceTable from "@/components/EvidenceTable";
import PartnerDrawer from "@/components/PartnerDrawer";
import RiskLogLine from "@/components/charts/RiskLogLine";
import TopPartnersPie from "@/components/charts/TopPartnersPie";
export default function Page() {
  const { entity, period } = useFilters();
  const { openDrawer } = useUI();
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  React.useEffect(()=>{const sp=new URLSearchParams(location.search);const firma=sp.get("firma")||entity||"";const donem=sp.get("donem")||period||"";const demo=sp.get("demo")==="1";(async()=>{setLoading(true);const qs=new URLSearchParams({firma,donem}).toString();const res=await fetch(`/api/analyze?${qs}`,{cache:"no-store"});const json=await res.json();const norm=normalizeAnalyze(json,{demoFill:demo});setData(norm);setLoading(false);})();},[entity,period]);
  const kurgan=data?.kurgan, smiyb=data?.smiyb, radar=data?.radar;
  const beyan=data?.kurgan?.beyanname_ozeti||[], mizanTop5=data?.luca?.mizan?.top5||[], partners=data?.partner_top5||[];
  const reasonsK=kurgan?.risk_nedenleri||[], reasonsS=smiyb?.nedenler||[], riskLog=kurgan?.risk_log||[];
  return (<div id="dashboard-root"><div className="mx-auto max-w-7xl px-4 py-5 md:py-8">
    <div className="mb-4 flex items-center justify-between"><div className="text-sm font-semibold">{data?.summary||"LYNTOS · Dashboard"}</div><DataStatus data={data} /></div>
    <div className="grid md:grid-cols-3 gap-4">
      <RadarPanel radar={radar} reasons={radar?.nedenler||[]} />
      <SmiybPanel smiyb={smiyb} />
      <UyumPanel uyum={kurgan?.uyum_kontrol} banka={data?.banka?.toplam||0} />
    </div>
    <div className="mt-5 grid md:grid-cols-2 gap-4">
      <div className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 dark:border-slate-700"><div className="mb-2 text-sm font-semibold">Risk Log (Skor/Dönem)</div><RiskLogLine data={riskLog}/></div>
      <div className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 dark:border-slate-700"><div className="mb-2 text-sm font-semibold">En Yoğun 6 İş Ortağı</div><TopPartnersPie rows={partners}/><div className="mt-2 text-right"><button onClick={openDrawer} className="text-xs rounded-md border px-2 py-1">Detay</button></div></div>
    </div>
    <div className="mt-5 grid md:grid-cols-2 gap-4"><BeyanOzetPanel rows={beyan}/><MizanOzetPanel rows={mizanTop5}/></div>
    <div className="mt-5"><MizanDrill rows={mizanTop5}/></div>
    <div className="mt-5"><EvidenceTable kurganReasons={reasonsK} smiybReasons={reasonsS}/></div>
    <div className="mt-10 text-center text-xs text-slate-500">LYNTOS · Demo Dashboard</div>
  </div>{loading && <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-white/30 to-white/10" /> }<PartnerDrawer partners={partners} evidence={[]}/></div>);
}
TSX

echo "==> Kurulum bitti."
